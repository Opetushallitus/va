(ns oph.va.hakija.db
  (:use [oph.soresu.common.db]
        [oph.soresu.form.db :as form-db]
        [clojure.tools.trace :only [trace]])
  (:require [clojure.java.io :as io]
            [clojure.tools.logging :as log]
            [oph.soresu.common.db :refer [exec get-datasource]]
            [clojure.java.jdbc :as jdbc]
            [oph.soresu.common.jdbc.extensions :refer :all]
            [oph.soresu.form.formutil :as form-util]
            [oph.va.jdbc.extensions :refer :all]
            [oph.va.hakija.db.queries :as queries]))

(defn slurp-binary-file! [file]
  (io! (with-open [reader (io/input-stream file)]
         (let [buffer (byte-array (.length file))]
           (.read reader buffer)
           buffer))))

(defn health-check []
  (->> {}
       (exec :form-db queries/health-check)
       first
       :?column?
       (= 1)))

(defn junction-hackathon-dump []
  (->> {}
       (exec :form-db queries/junction-hackathon-dump)
       first
       :dump))

(defn get-avustushaku [id]
  (->> (exec :form-db queries/get-avustushaku {:id id})
       first))

(defn get-avustushaku-roles [avustushaku-id]
  (exec :form-db queries/get-avustushaku-roles {:avustushaku avustushaku-id}))

(defn list-avustushaut []
  (exec :form-db queries/list-avustushaut {}))


(defn add-paatos-view [hakemus-id headers remote-addr]
  (exec :form-db queries/create-paatos-view! {:hakemus_id hakemus-id :headers headers :remote_addr remote-addr}))

(defn- pluck-key [answers key as default]
  (let [value (or (form-util/find-answer-value answers key) default)]
    {as value}))

(defn- get-organization-name [answers] (pluck-key answers "organization" :organization_name ""))
(defn- get-project-name [answers] (pluck-key answers "project-name" :project_name ""))
(defn- get-language [answers] (pluck-key answers "language" :language "fi"))

(defn- merge-calculated-params [params avustushaku-id answers]
  (merge params
         (get-organization-name answers)
         (get-project-name answers)
         (get-language answers)))

(defn get-hakemus [hakemus-id]
  (->> {:user_key hakemus-id}
       (exec :form-db queries/get-hakemus-by-user-id)
       first))

(defn get-hakemus-version [hakemus-id version]
  (first
    (exec :form-db queries/get-hakemus-version-by-user-id
          {:user_key hakemus-id :version version})))

(defn get-hakemus-paatos [hakemus-id]
  (->> {:hakemus_id hakemus-id}
       (exec :form-db queries/get-hakemus-paatokset)
       first))

(defn list-hakemus-change-requests [hakemus-id]
  (->> {:user_key hakemus-id}
       (exec :form-db queries/list-hakemus-change-requests-by-user-id)))

(defn find-hakemus-by-parent-id-and-type [parent-id hakemus-type]
  (->> {:parent_id parent-id :hakemus_type hakemus-type}
       (exec :form-db queries/find-by-parent-id-and-hakemus-type) first))

(defn- register-number-sequence-exists? [register-number]
  (->> (exec :form-db queries/register-number-sequence-exists? {:suffix register-number})
       first
       nil?
       not))

(defn generate-register-number [avustushaku-id user-key]
  (if-let [avustushaku-register-number (-> (get-avustushaku avustushaku-id) :register_number)]
    (when (re-matches #"\d+/\d+" avustushaku-register-number)
      (let [params {:suffix avustushaku-register-number}
            {:keys [suffix seq_number]} (if (register-number-sequence-exists? avustushaku-register-number)
                                          (exec :form-db queries/update-register-number-sequence<! params)
                                          (exec :form-db queries/create-register-number-sequence<! params))]
        (format "%d/%s" seq_number avustushaku-register-number)))))

(defn- convert-budget-totals [budget-totals]
  {:budget_total (or (:total-needed budget-totals) 0)
   :budget_oph_share (or (:oph-share budget-totals) 0)})

(defn create-hakemus! [avustushaku-id form-id answers hakemus-type register-number budget-totals]
  (let [submission (form-db/create-submission! form-id answers)
        user-key (generate-hash-id)
        params (-> {:avustushaku_id avustushaku-id
                    :user_key user-key
                    :form_submission (:id submission)
                    :register_number (if (nil? register-number) (generate-register-number avustushaku-id user-key) register-number)
                    :hakemus_type hakemus-type}
                   (merge (convert-budget-totals budget-totals))
                   (merge-calculated-params avustushaku-id answers))
        hakemus (exec :form-db queries/create-hakemus<! params)]
    {:hakemus hakemus :submission submission}))

(defn get-normalized-hakemus [user-key]
  (log/info (str "Get normalized hakemus with id: " user-key))
  (let [hakemukset (jdbc/with-db-transaction [connection {:datasource (get-datasource :form-db)}]
                 (jdbc/query
                   connection
                   ["SELECT * from virkailija.avustushaku_hakemukset WHERE user_key = ?" user-key]
                  {:identifiers #(.replace % \_ \-)}))]
    (log/info (str "Succesfully fetched hakemus with id: " user-key))
    (first hakemukset)))

(defn get-muutoshaku [hakemus-id]
  (log/info (str "Get muutoshakemus with id: " hakemus-id))
  (let [muutoshaku (jdbc/with-db-transaction [connection {:datasource (get-datasource :form-db)}]
                                             (jdbc/query
                                              connection
                                              ["SELECT
                                                id,
                                                user_key,
                                                hakemus_version,
                                                haen_kayttoajan_pidennysta,
                                                kayttoajan_pidennys_perustelut,
                                                created_at,
                                                to_char(haettu_kayttoajan_paattymispaiva, 'YYYY-MM-DD') as haettu_kayttoajan_paattymispaiva
                                              from hakija.muutoshakemus WHERE user_key = ?
                                              ORDER BY id DESC" hakemus-id]
                                              {:identifiers #(.replace % \_ \-)}))]
    (log/info (str "Succesfully fetched muutoshaku with id: " hakemus-id))
    (first muutoshaku)))

(defn change-normalized-hakemus-contact-person-details [user-key, contact-person-details]
  (log/info (str "Change normalized contact person details with user-key: " user-key))
  (let [ contact-person (:contact-person contact-person-details)
         contact-phone (:contact-phone contact-person-details)
         contact-email (:contact-email contact-person-details)]
    (jdbc/with-db-transaction [connection {:datasource (get-datasource :form-db)}]
                  (jdbc/execute!
                    connection
                    ["UPDATE virkailija.avustushaku_hakemukset SET contact_person = ?, contact_email = ?, contact_phone = ? WHERE user_key = ?" contact-person, contact-email, contact-phone, user-key]
                    )))
    (log/info (str "Succesfully changed contact person details with user-key: " user-key)))

(defn update-hakemus-parent-id [hakemus-id parent-id]
  (exec :form-db queries/update-hakemus-parent-id! {:id hakemus-id :parent_id parent-id}))

(defn update-submission [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals]
  (let [register-number (or register-number
                            (generate-register-number avustushaku-id hakemus-id))
        params (-> {:avustushaku_id avustushaku-id
                    :user_key hakemus-id
                    :user_oid nil
                    :user_first_name nil
                    :user_last_name nil
                    :user_email nil
                    :register_number register-number
                    :form_submission_id submission-id
                    :form_submission_version submission-version}
                   (merge (convert-budget-totals budget-totals))
                   (merge-calculated-params avustushaku-id answers))]
    (exec-all :form-db [queries/lock-hakemus params
                   queries/close-existing-hakemus! params
                   queries/update-hakemus-submission<! params])))

(defn- update-status [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals status status-change-comment]
  (let [params (-> {:avustushaku_id avustushaku-id
                    :user_key hakemus-id
                    :user_oid nil
                    :user_first_name nil
                    :user_last_name nil
                    :user_email nil
                    :form_submission_id submission-id
                    :form_submission_version submission-version
                    :register_number register-number
                    :status status
                    :status_change_comment status-change-comment}
                   (merge (convert-budget-totals budget-totals))
                   (merge-calculated-params avustushaku-id answers))]
    (exec-all :form-db [queries/lock-hakemus params
                   queries/close-existing-hakemus! params
                   queries/update-hakemus-status<! params])))

(defn open-hakemus-applicant-edit [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals]
   (update-status avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals :applicant_edit nil))

(defn set-submitted-version [user-key form-submission-id]
  (let [params {:user_key user-key
                :form_submission_id form-submission-id}]
    (exec-all :form-db [queries/lock-hakemus params
                        queries/close-existing-hakemus! params
                        queries/set-application-submitted-version<! params])))

(defn verify-hakemus [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals]
  (update-status avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals :draft nil))

(defn submit-hakemus [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals]
  (update-status avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals :submitted nil)
  (set-submitted-version hakemus-id submission-id))

(defn cancel-hakemus [avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals comment]
  (update-status avustushaku-id hakemus-id submission-id submission-version register-number answers budget-totals :cancelled comment))

(defn refuse-application [application comment]
  (let [params (assoc application :refused true :refused_comment comment)]
    (exec-all :form-db [queries/lock-hakemus params
                        queries/close-existing-hakemus! params
                        queries/set-refused params])))

(defn update-loppuselvitys-status [hakemus-id status]
  (exec :form-db queries/update-loppuselvitys-status<! {:id hakemus-id :status status}))

(defn update-valiselvitys-status [hakemus-id status]
  (exec :form-db queries/update-valiselvitys-status<! {:id hakemus-id :status status}))

(defn attachment-exists? [hakemus-id field-id]
  (->> {:hakemus_id hakemus-id
        :field_id field-id}
       (exec :form-db queries/attachment-exists?)
       first))

(defn convert-attachment [hakemus-id attachment]
  {:id (:id attachment)
   :hakemus-id hakemus-id
   :version (:version attachment)
   :field-id (:field_id attachment)
   :file-size (:file_size attachment)
   :content-type (:content_type attachment)
   :hakemus-version (:hakemus_version attachment)
   :created-at (:created_at attachment)
   :filename (:filename attachment)})

(defn create-attachment [hakemus-id hakemus-version field-id filename content-type size file]
  (let [blob (slurp-binary-file! file)
        params (-> {:hakemus_id hakemus-id
                    :hakemus_version hakemus-version
                    :field_id field-id
                    :filename filename
                    :content_type content-type
                    :file_size size
                    :file_data blob})]
    (if (attachment-exists? hakemus-id field-id)
      (exec-all :form-db [queries/close-existing-attachment! params
                     queries/update-attachment<! params])
      (exec :form-db queries/create-attachment<! params))))

(defn close-existing-attachment! [hakemus-id field-id]
  (->> {:hakemus_id hakemus-id
        :field_id field-id}
       (exec :form-db queries/close-existing-attachment!)))

(defn add-muutoshakemus! [user-key hakemus-version haen-kayttoajan-pidennysta kayttoajan-pidennys-perustelut haettu-kayttoajan-paattymispaiva]
  (->> {:user_key user-key,
        :hakemus_version hakemus-version,
        :haen_kayttoajan_pidennysta haen-kayttoajan-pidennysta,
        :kayttoajan_pidennys_perustelut kayttoajan-pidennys-perustelut,
        :haettu_kayttoajan_paattymispaiva haettu-kayttoajan-paattymispaiva}
       (exec :form-db queries/add-muutoshakemus!)))

(defn list-attachments [hakemus-id]
  (->> {:hakemus_id hakemus-id}
       (exec :form-db queries/list-attachments)))

(defn get-attachments [external-hakemus-id hakemus-id]
  (->> (list-attachments hakemus-id)
       (map (partial convert-attachment external-hakemus-id))
       (map (fn [attachment] [(:field-id attachment) attachment]))
       (into {})))

(defn download-attachment [hakemus-id field-id]
  (let [result (->> {:hakemus_id hakemus-id
                     :field_id field-id}
                    (exec :form-db queries/download-attachment)
                    first)]
    {:data (io/input-stream (:file_data result))
     :content-type (:content_type result)
     :filename (:filename result)
     :size (:file_size result)}))

(defn valid-token? [token application-id]
  (and
    (some? token)
    (not
      (empty?
        (exec :form-db queries/get-application-token
              {:token token :application_id application-id})))))

(defn valid-user-key-token? [token user-key]
  (let [application (get-hakemus user-key)]
    (and
      (some? application)
      (valid-token? token (:id application)))))

(defn revoke-token [token]
  (exec :form-db queries/revoke-application-token!
        {:token token}))
