(ns oph.va.virkailija.paatos
    (:require
      [ring.util.http-response :refer :all]
      [compojure.api.sweet :as compojure-api]
      [oph.va.hakija.api :as hakija-api]
      [oph.soresu.form.formutil :as formutil]
      [oph.va.decision-liitteet :as decision-liitteet]
      [oph.va.virkailija.email :as email]
      [oph.common.email :refer [refuse-url]]
      [oph.va.virkailija.schema :as virkailija-schema]
      [oph.va.virkailija.hakudata :as hakudata]
      [oph.va.virkailija.db :as virkailija-db]
      [clojure.tools.logging :as log]
      [clojure.string :as str]
      [oph.va.virkailija.decision :as decision]
      [oph.soresu.common.config :refer [config]]
      [oph.va.virkailija.application-data :refer [get-application-token create-application-token]]
      [oph.va.virkailija.payments-data :as payments-data]
      [oph.va.virkailija.authentication :as authentication]))

(defn is-notification-email-field? [field]
      (or
        (formutil/has-field-type? "vaEmailNotification" field)
        ;;This array is for old-style email-fields which did not yet have the :vaEmailNotification field-type
        (some #(= (:key field) %) ["organization-email" "primary-email" "signature-email"])))

(defn- emails-from-answers [answers]
       (map :value (formutil/filter-values #(is-notification-email-field? %) (answers :value))))

(defn- paatos-emails [hakemus-id]
       (let [hakemus (hakija-api/get-hakemus hakemus-id)
             submission (hakija-api/get-hakemus-submission hakemus)
             answers (:answers submission)
             emails (vec (remove nil? (distinct (emails-from-answers answers))))]
            emails))

(defn send-paatos [hakemus-id emails]
      (let [hakemus (hakija-api/get-hakemus hakemus-id)
            avustushaku-id (:avustushaku hakemus)
            avustushaku (hakija-api/get-avustushaku avustushaku-id)
            presenting-officer-email (hakudata/presenting-officer-email avustushaku-id)
            decision (decision/paatos-html hakemus-id)
            arvio (virkailija-db/get-arvio hakemus-id)
            token (when (get-in config [:application-change :refuse-enabled?])
                        (create-application-token (:id hakemus)))]
           (log/info "Sending paatos email for hakemus" hakemus-id " to " emails)
           (if (and (some? token) (not= (:status arvio) "rejected"))
             (email/send-paatos-refuse!
               emails avustushaku hakemus presenting-officer-email token)
             (email/send-paatos! emails avustushaku hakemus presenting-officer-email))
           (hakija-api/add-paatos-sent-emails hakemus emails decision)
           (ok {:status "sent" :hakemus hakemus-id :emails emails})))

(defn resend-paatos [hakemus-id emails]
      (let [hakemus (hakija-api/get-hakemus hakemus-id)
            avustushaku-id (:avustushaku hakemus)
            avustushaku (hakija-api/get-avustushaku avustushaku-id)
            presenting-officer-email (hakudata/presenting-officer-email avustushaku-id)
            decision (decision/paatos-html hakemus-id)
            arvio (virkailija-db/get-arvio hakemus-id)
            token (when (get-in config [:application-change :refuse-enabled?])
                        (create-application-token (:id hakemus)))]
           (log/info "Reending paatos email for hakemus" hakemus-id " to " emails)
           (if (and (some? token) (not= (:status arvio) "rejected"))
             (email/send-paatos-refuse!
               emails avustushaku hakemus presenting-officer-email token)
             (email/send-paatos! emails avustushaku hakemus presenting-officer-email))
           (hakija-api/update-paatos-sent-emails hakemus emails decision)
           (ok {:status "sent" :hakemus hakemus-id :emails emails})))

(defn re-send-paatos-email [hakemus-id]
      (let [emails (paatos-emails hakemus-id)
            hakemus (hakija-api/get-hakemus hakemus-id)
            avustushaku-id (:avustushaku hakemus)
            avustushaku (hakija-api/get-avustushaku avustushaku-id)
            presenting-officer-email (hakudata/presenting-officer-email avustushaku-id)
            token (get-application-token hakemus-id)]
           (email/send-paatos-refuse!
             emails avustushaku hakemus presenting-officer-email token)
           (ok {:status "sent" :hakemus hakemus-id :emails emails})))

(defn regenerate-paatos [hakemus-id]
      (let [hakemus (hakija-api/get-hakemus hakemus-id)
            submission (hakija-api/get-hakemus-submission hakemus)
            answers (:answers submission)
            decision (decision/paatos-html hakemus-id)]
           (hakija-api/update-paatos-decision hakemus-id decision)
           (ok {:status "regenerated"})))

(defn send-paatos-for-all [hakemus-id]
      (log/info "send-paatos-for-all" hakemus-id)
      (let [emails (paatos-emails hakemus-id)]
           (send-paatos hakemus-id emails)))

(defn resend-paatos-for-all [hakemus-id]
      (log/info "rexsend-paatos-for-all" hakemus-id)
      (let [emails (paatos-emails hakemus-id)]
           (resend-paatos hakemus-id emails)))

(defn send-selvitys-for-all [avustushaku-id selvitys-type hakemus-id]
      (log/info "send-loppuselvitys-for-all" hakemus-id)
      (let [hakemus (hakija-api/get-hakemus hakemus-id)
            submission (hakija-api/get-hakemus-submission hakemus)
            avustushaku (hakija-api/get-avustushaku avustushaku-id)
            roles (hakija-api/get-avustushaku-roles avustushaku-id)
            arvio (virkailija-db/get-arvio hakemus-id)
            answers (:answers submission)
            emails (vec (remove nil? (distinct (emails-from-answers answers))))]
           (email/send-selvitys-notification! emails avustushaku hakemus selvitys-type arvio roles)))

(defn get-paatos-email-status
      "Returns only data related to those hakemus ids which are rejected or accepted,
      other statuses are ignored. This is a safeguard: we can't accidentally send email
      to those people which have their hakemus in an invalid state"
      [avustushaku-id]
      (let [status-from-hakija-api (hakija-api/get-paatos-email-status avustushaku-id)
            ids-accepted-or-rejected (virkailija-db/get-finalized-hakemus-ids (map :id status-from-hakija-api))]
           (filter #(contains? (set ids-accepted-or-rejected) (:id %)) status-from-hakija-api)))

(defn get-hakemus-ids-to-send [avustushaku-id]
      (let [hakemukset-email-status (get-paatos-email-status avustushaku-id)]
           (map :id (filter #(nil? (:sent-emails %)) hakemukset-email-status))))

(defn get-hakemus-ids-to-resend [avustushaku-id]
      (let [hakemukset-email-status (get-paatos-email-status avustushaku-id)]
           (map :id (filter #(some? (:sent-emails %)) hakemukset-email-status))))

(defn get-sent-status [avustushaku-id]
      (let [hakemukset-email-status (get-paatos-email-status avustushaku-id)]
           {:ids       (map :id hakemukset-email-status)
            :sent      (count (filter #((complement nil?) (:sent-emails %)) hakemukset-email-status))
            :count     (count hakemukset-email-status)
            :paatokset hakemukset-email-status
            :sent-time (:sent-time (first hakemukset-email-status))}))

(defn send-selvitys-emails [avustushaku-id selvitys-type]
      (let [is-loppuselvitys (= selvitys-type "loppuselvitys")
            list-selvitys (if is-loppuselvitys hakija-api/list-loppuselvitys-hakemus-ids hakija-api/list-valiselvitys-hakemus-ids)
            json-ids (list-selvitys avustushaku-id)
            ids (map :id json-ids)
            accepted-ids (virkailija-db/get-accepted-hakemus-ids ids)]
           (log/info "Send all paatos ids " accepted-ids)
           (run! (partial send-selvitys-for-all avustushaku-id selvitys-type) accepted-ids)
           (ok {:count (count accepted-ids)})))

(compojure-api/defroutes
  paatos-routes "Paatos routes"

  (compojure-api/GET "/liitteet" []
                     (ok decision-liitteet/Liitteet))

  (compojure-api/POST "/sendall/:avustushaku-id" [:as request]
                      :path-params [avustushaku-id :- Long]
                      (let [ids (get-hakemus-ids-to-send avustushaku-id)]
                           (when (get-in config [:payments :enabled?])
                                 (do
                                   (log/info "Create initial payment for applications")
                                   (payments-data/create-grant-payments
                                     avustushaku-id 0 (authentication/get-request-identity request))))
                           (log/info "Send all paatos ids " ids)
                           (run! send-paatos-for-all ids)
                           (ok (merge {:status "ok"}
                                      (select-keys (get-sent-status avustushaku-id) [:sent :count :sent-time :paatokset])))))

  (compojure-api/POST "/resendall/:avustushaku-id" [:as request]
                      :path-params [avustushaku-id :- Long]
                      (let [ids (get-hakemus-ids-to-resend avustushaku-id)]
                           (log/info "Send all paatos ids " ids)
                           (run! resend-paatos-for-all ids)
                           (ok (merge {:status "ok"}
                                      (select-keys (get-sent-status avustushaku-id) [:sent :count :sent-time :paatokset])))))

  (compojure-api/POST "/regenerate/:avustushaku-id" []
                      :path-params [avustushaku-id :- Long]
                      (let [ids-result (hakija-api/find-regenerate-hakemus-paatos-ids avustushaku-id)
                            ids (map :hakemus_id ids-result)]
                           (log/info "Regenereate " ids)
                           (run! regenerate-paatos ids)
                           (ok {:status "ok"})))

  (compojure-api/GET "/sent/:avustushaku-id" []
                     :path-params [avustushaku-id :- Long]
                     (let [avustushaku (hakija-api/get-avustushaku avustushaku-id)
                           avustushaku-name (-> avustushaku :content :name :fi)
                           sent-status (get-sent-status avustushaku-id)
                           first-hakemus-id (first (:ids sent-status))
                           first-hakemus (hakija-api/get-hakemus first-hakemus-id)
                           first-hakemus-user-key (:user_key first-hakemus)
                           first-hakemus-token (get-application-token first-hakemus-id)]
                          (ok (merge
                                {:status      "ok"
                                 :mail        (email/mail-example
                                                (if (get-in config [:application-change :refuse-enabled?])
                                                  :paatos-refuse
                                                  :paatos)
                                                {:avustushaku-name avustushaku-name
                                                 :url              "URL_PLACEHOLDER"
                                                 :refuse-url       "REFUSE_URL_PLACEHOLDER"
                                                 :register-number  (:register_number first-hakemus)
                                                 :project-name     (:project_name first-hakemus)})
                                 :example-url (email/paatos-url avustushaku-id first-hakemus-user-key :fi)
                                 :example-refuse-url
                                              (refuse-url
                                                avustushaku-id first-hakemus-user-key :fi first-hakemus-token)}
                                (select-keys sent-status [:sent :count :sent-time :paatokset])))))

  (compojure-api/GET "/views/:hakemus-id" []
                     :path-params [hakemus-id :- Long]
                     (ok {:views (hakija-api/find-paatos-views hakemus-id)}))

  (compojure-api/GET "/emails/:hakemus-id" []
                     :path-params [hakemus-id :- Long]
                     (ok {:emails (paatos-emails hakemus-id)})))
