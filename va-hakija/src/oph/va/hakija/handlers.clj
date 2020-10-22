(ns oph.va.hakija.handlers
  (:use [clojure.tools.trace :only [trace]])
  (:require [clojure.tools.logging :as log]
            [ring.util.http-response :refer :all]
            [oph.soresu.common.config :refer [config]]
            [oph.common.datetime :as datetime]
            [oph.soresu.form.db :as form-db]
            [oph.soresu.form.validation :as validation]
            [oph.soresu.form.routes
             :refer [get-form-submission without-id update-form-submission]]
            [oph.soresu.form.formutil :refer :all]
            [oph.va.routes :refer :all]
            [oph.soresu.form.schema :refer :all]
            [oph.va.budget :as va-budget]
            [oph.va.hakija.db :as va-db]
            [oph.va.hakija.notification-formatter :as va-submit-notification]
            [oph.va.hakija.attachment-validator :as attachment-validator]
            [oph.va.hakija.email :as va-email]
            [ring.util.response :as resp]))

(defn- hakemus-conflict-response [hakemus]
  (conflict! {:id (if (:enabled? (:email config)) "" (:user_key hakemus))
              :status (:status hakemus)
              :version (:version hakemus)
              :version-date (:last_status_change_at hakemus)}))

(defn- get-open-avustushaku [haku-id hakemus]
  (let [avustushaku (va-db/get-avustushaku haku-id)
        phase (avustushaku-phase avustushaku)]
    (if (or (= phase "current") (= (:status hakemus) "pending_change_request") (= (:status hakemus) "officer_edit") (= (:status hakemus) "applicant_edit"))
      avustushaku
      (method-not-allowed! {:phase phase}))))

(defn- hakemus-ok-response [hakemus submission validation]
  (ok {:id (if (:enabled? (:email config)) "" (:user_key hakemus))
       :created-at (:created_at hakemus)
       :status (:status hakemus)
       :status-comment (:status_change_comment hakemus)
       :register-number (:register_number hakemus)
       :version (:version hakemus)
       :version-date (:last_status_change_at hakemus)
       :submission (without-id submission)
       :validation-errors validation
       :refused (:refused hakemus)
       :refused-at (:refused_at hakemus)
       :refused-comment (:refused_comment hakemus)}))

(defn on-hakemus-create [haku-id answers]
  (let [avustushaku (get-open-avustushaku haku-id {})
        avustushaku-content (:content avustushaku)
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        security-validation (validation/validate-form-security form answers)]
    (if (every? empty? (vals security-validation))
      (let [budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)]
        (if-let [new-hakemus (va-db/create-hakemus! haku-id
                                                    form-id
                                                    answers
                                                    "hakemus"
                                                    nil
                                                    budget-totals)]
          (let [validation (merge (validation/validate-form form answers {})
                                  (va-budget/validate-budget-hakija answers budget-totals form))
                language (keyword (-> new-hakemus :hakemus :language))
                avustushaku-title (-> avustushaku-content :name language)
                avustushaku-duration (->> avustushaku-content
                                          :duration)
                avustushaku-start-date (->> avustushaku-duration
                                            :start
                                            (datetime/parse))
                avustushaku-end-date (->> avustushaku-duration
                                          :end
                                          (datetime/parse))
                email (find-answer-value answers "primary-email")
                user-key (-> new-hakemus :hakemus :user_key)]
            (va-email/send-new-hakemus-message! language
                                                [email]
                                                haku-id
                                                avustushaku-title
                                                user-key
                                                avustushaku-start-date
                                                avustushaku-end-date)
            (hakemus-ok-response (:hakemus new-hakemus) (without-id (:submission new-hakemus)) validation))
          (internal-server-error!)))
      (bad-request! security-validation))))

(defn- ok-id [hakemus]
  (ok {:id (:user_key hakemus)
       :language (:language hakemus)}))

(defn on-selvitys-init [haku-id hakemus-key selvitys-type]
  (if-some [avustushaku (va-db/get-avustushaku haku-id)]
    (if-some [hakemus (va-db/get-hakemus hakemus-key)]
      (let [form-keyword (keyword (str "form_" selvitys-type))
            form-id      (form-keyword avustushaku)
            hakemus-id   (:id hakemus)]
        (if-some [existing-selvitys (va-db/find-hakemus-by-parent-id-and-type hakemus-id selvitys-type)]
          (ok-id existing-selvitys)
          (let [form (form-db/get-form form-id)
                register-number             (:register_number hakemus)
                answers                     {:value [{:key "language"
                                                      :value (:language hakemus)
                                                      :fieldType "radioButton"}]}
                budget-totals               (va-budget/calculate-totals-hakija answers avustushaku form)
                new-hakemus-with-submission (va-db/create-hakemus! haku-id
                                                                   form-id
                                                                   answers
                                                                   selvitys-type
                                                                   register-number
                                                                   budget-totals)
                new-hakemus                 (:hakemus new-hakemus-with-submission)
                new-hakemus-id              (:id new-hakemus)
                updated                     (va-db/update-hakemus-parent-id new-hakemus-id hakemus-id)]
            (ok-id new-hakemus))))
      (not-found))
    (not-found)))

(defn on-get-decision-answers [haku-id hakemus-id form-key]
  (let [avustushaku (va-db/get-avustushaku haku-id)
        form-id (form-key avustushaku)
        form (form-db/get-form form-id)
        current-hakemus (va-db/get-hakemus hakemus-id)
        paatos (va-db/get-hakemus-paatos (:id current-hakemus))]
    (if (nil? paatos)
      (no-content)
      (let [hakemus (va-db/get-hakemus-version hakemus-id (:hakemus_version paatos))
            submission-id (:form_submission_id hakemus)
            submission (form-db/get-form-submission-version
                        form-id submission-id
                        (:form_submission_version hakemus))
            submission-version (:version submission)
            answers (:answers submission)
            attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
            budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
            validation (merge (validation/validate-form form answers attachments)
                              (va-budget/validate-budget-hakija answers budget-totals form))]
        (hakemus-ok-response hakemus submission validation)))))

(defn on-hakemus-applicant-edit-open [haku-id hakemus-id]
  (let [hakemus (va-db/get-hakemus hakemus-id)
        avustushaku (va-db/get-avustushaku haku-id)
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        submission-id (:form_submission_id hakemus)
        submission (form-db/get-form-submission-version
                    form-id submission-id
                    (:form_submission_version hakemus))
        submission-version (:version submission)
        register-number (:register_number hakemus)
        answers (:answers submission)
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)]
    (va-db/open-hakemus-applicant-edit haku-id hakemus-id submission-id submission-version register-number answers budget-totals)))

(defn on-get-current-answers [haku-id hakemus-id form-key]
  (let [avustushaku (va-db/get-avustushaku haku-id)
        form-id (form-key avustushaku)
        form (form-db/get-form form-id)
        hakemus (va-db/get-hakemus hakemus-id)
        submission-id (:form_submission_id hakemus)
        submission (:body (get-form-submission form-id submission-id))
        submission-version (:version submission)
        answers (:answers submission)
        attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
        validation (merge (validation/validate-form form answers attachments)
                          (va-budget/validate-budget-hakija answers budget-totals form))]
    (if (= (:status hakemus) "new")
      (let [verified-hakemus (va-db/verify-hakemus haku-id
                                                   hakemus-id
                                                   submission-id
                                                   submission-version
                                                   (:register_number hakemus)
                                                   answers
                                                   budget-totals)]
        (hakemus-ok-response verified-hakemus submission validation))
      (hakemus-ok-response hakemus submission validation))))

(defn on-hakemus-update [haku-id hakemus-id base-version answers]
  (let [hakemus (va-db/get-hakemus hakemus-id)
        avustushaku (get-open-avustushaku haku-id hakemus)
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        security-validation (validation/validate-form-security form answers)]
    (if (every? empty? (vals security-validation))
      (if (= base-version (:version hakemus))
        (let [attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
              budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
              validation (merge (validation/validate-form form answers attachments)
                                (va-budget/validate-budget-hakija answers budget-totals form))
              updated-submission (:body (update-form-submission form-id (:form_submission_id hakemus) answers))
              updated-hakemus (va-db/update-submission haku-id
                                                       hakemus-id
                                                       (:form_submission_id hakemus)
                                                       (:version updated-submission)
                                                       (:register_number hakemus)
                                                       answers
                                                       budget-totals)]
          (hakemus-ok-response updated-hakemus updated-submission validation))
        (hakemus-conflict-response hakemus))
      (bad-request! security-validation))))

(defn on-refuse-application [grant-id application-id base-version comment token]
  (let [application (va-db/get-hakemus application-id)
        grant (va-db/get-avustushaku (:avustushaku application))
        submission (:body (get-form-submission
                           (:form grant)
                           (:form_submission_id application)))
        lang (keyword (get-in application [:hakemus :language] "fi"))]
    (cond
      (not (va-db/valid-token? token (:id application)))
      (unauthorized "Incorrect token")
      (and (= (:version application) base-version)
           (not (:refused application)))
      (do
        (va-db/refuse-application application comment)
        (let [roles (filter #(= (:role %) "presenting_officer")
                            (va-db/get-avustushaku-roles (:id grant)))]
          (when (some #(when (some? (:email %)) true) roles)
            (va-email/send-refused-message-to-presenter!
             (map :email (filter #(some? (:email %)) roles))
             grant
             (:id application))))
        (when-let [email (find-answer-value
                          (:answers submission) "primary-email")]
          (va-email/send-refused-message!
           lang [email] (get-in grant [:content :name lang])))
        (hakemus-ok-response (va-db/get-hakemus application-id) submission {}))
      :else (hakemus-conflict-response application))))

(defn on-selvitys-update [haku-id hakemus-id base-version answers form-key]
  (let [hakemus (va-db/get-hakemus hakemus-id)
        avustushaku (va-db/get-avustushaku haku-id)
        form-id (form-key avustushaku)
        form (form-db/get-form form-id)
        security-validation (validation/validate-form-security form answers)]
    (if (every? empty? (vals security-validation))
      (if (= base-version (:version hakemus))
        (let [attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
              budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
              validation (merge (validation/validate-form form answers attachments)
                                (va-budget/validate-budget-hakija answers budget-totals form))
              updated-submission (:body (update-form-submission form-id (:form_submission_id hakemus) answers))
              updated-hakemus (va-db/update-submission haku-id
                                                       hakemus-id
                                                       (:form_submission_id hakemus)
                                                       (:version updated-submission)
                                                       (:register_number hakemus)
                                                       answers
                                                       budget-totals)]
          (hakemus-ok-response updated-hakemus updated-submission validation))
        (hakemus-conflict-response hakemus))
      (bad-request! security-validation))))

(defn on-hakemus-submit [haku-id hakemus-id base-version answers]
  (let [avustushaku (get-open-avustushaku haku-id {})
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        hakemus (va-db/get-hakemus hakemus-id)
        attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
        validation (merge (validation/validate-form form answers attachments)
                          (va-budget/validate-budget-hakija answers budget-totals form))]
    (if (every? empty? (vals validation))
      (if (= base-version (:version hakemus))
        (let [submission-id (:form_submission_id hakemus)
              saved-submission (:body (update-form-submission form-id submission-id answers))
              submission-version (:version saved-submission)
              submitted-hakemus (va-db/submit-hakemus haku-id
                                                      hakemus-id
                                                      submission-id
                                                      submission-version
                                                      (:register_number hakemus)
                                                      answers
                                                      budget-totals)]
          (va-submit-notification/send-submit-notifications! va-email/send-hakemus-submitted-message! false answers submitted-hakemus avustushaku)
          (hakemus-ok-response submitted-hakemus saved-submission validation))
        (hakemus-conflict-response hakemus))
      (bad-request! validation))))

(defn on-selvitys-submit [haku-id hakemus-id base-version answers selvitys-field-keyword selvitys-type]
  (let [avustushaku (va-db/get-avustushaku haku-id)
        form-id (selvitys-field-keyword avustushaku)
        form (form-db/get-form form-id)
        hakemus (va-db/get-hakemus hakemus-id)
        attachments (va-db/get-attachments (:user_key hakemus) (:id hakemus))
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
        validation (merge (validation/validate-form form answers attachments)
                          (va-budget/validate-budget-hakija answers budget-totals form))]
    (if (every? empty? (vals validation))
      (if (= base-version (:version hakemus))
        (let [submission-id (:form_submission_id hakemus)
              saved-submission (:body (update-form-submission form-id submission-id answers))
              submission-version (:version saved-submission)
              parent_id (:parent_id hakemus)
              submitted-hakemus (va-db/submit-hakemus haku-id
                                                      hakemus-id
                                                      submission-id
                                                      submission-version
                                                      (:register_number hakemus)
                                                      answers
                                                      budget-totals)
              is-loppuselvitys (= selvitys-type "loppuselvitys")
              updated-selvitys-status (if is-loppuselvitys (va-db/update-loppuselvitys-status parent_id "submitted") (va-db/update-valiselvitys-status parent_id "submitted"))]
          (hakemus-ok-response submitted-hakemus saved-submission validation))
        (hakemus-conflict-response hakemus))
      (bad-request! validation))))

(defn on-hakemus-change-request-response [haku-id hakemus-id base-version answers]
  (let [hakemus (va-db/get-hakemus hakemus-id)
        avustushaku (get-open-avustushaku haku-id hakemus)
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        attachments (va-db/get-attachments hakemus-id (:id hakemus))
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
        validation (merge (validation/validate-form form answers attachments)
                          (va-budget/validate-budget-hakija answers budget-totals form))]
    (if (every? empty? (vals validation))
      (if (= base-version (:version hakemus))
        (let [submission-id (:form_submission_id hakemus)
              saved-submission (:body (update-form-submission form-id submission-id answers))
              submission-version (:version saved-submission)
              submitted-hakemus (va-db/submit-hakemus haku-id
                                                      hakemus-id
                                                      submission-id
                                                      submission-version
                                                      (:register_number hakemus)
                                                      answers
                                                      budget-totals)
              change-requests (va-db/list-hakemus-change-requests hakemus-id)
              email-of-virkailija (:user_email (last change-requests))]
          (if email-of-virkailija
            (va-email/send-change-request-responded-message-to-virkailija! [email-of-virkailija] (:id avustushaku) (-> avustushaku :content :name :fi) (:id submitted-hakemus)))
          (va-submit-notification/send-submit-notifications! va-email/send-hakemus-submitted-message! true answers submitted-hakemus avustushaku)
          (method-not-allowed! {:change-request-response "saved"}))
        (hakemus-conflict-response hakemus))
      (bad-request! validation))))

(defn on-hakemus-edit-submit [haku-id hakemus-id base-version answers edit-type]
  (let [hakemus (va-db/get-hakemus hakemus-id)
        avustushaku (va-db/get-avustushaku (:avustushaku hakemus))
        form-id (:form avustushaku)
        form (form-db/get-form form-id)
        attachments (va-db/get-attachments hakemus-id (:id hakemus))
        budget-totals (va-budget/calculate-totals-hakija answers avustushaku form)
        validation (merge (validation/validate-form form answers attachments)
                          (va-budget/validate-budget-hakija answers budget-totals form))
        lang (keyword (get-in hakemus [:hakemus :language] "fi"))]
    (if (every? empty? (vals validation))
      (if (= base-version (:version hakemus))
        (let [submission-id (:form_submission_id hakemus)
              saved-submission (:body (update-form-submission form-id submission-id answers))
              submission-version (:version saved-submission)
              submitted-hakemus (va-db/submit-hakemus haku-id
                                                      hakemus-id
                                                      submission-id
                                                      submission-version
                                                      (:register_number hakemus)
                                                      answers
                                                      budget-totals)
              roles (filter #(= (:role %) "presenting_officer")
                            (va-db/get-avustushaku-roles haku-id))
              submission (:body (get-form-submission
                                 (:form avustushaku)
                                 (:form_submission_id hakemus)))]

          (when (= edit-type :applicant-edit)
            (when (some #(when (some? (:email %)) true) roles)
              (va-email/send-applicant-edit-message-to-presenter!
               (map :email (filter #(some? (:email %)) roles))
               :fi hakemus-id (get-in avustushaku [:content :name lang]) hakemus))
            (when-let [email (find-answer-value
                              (:answers submission) "primary-email")]
              (va-email/send-applicant-edit-message!
               lang [email] (get-in avustushaku [:content :name lang]) hakemus)))

          (method-not-allowed! {edit-type "saved"}))
        (hakemus-conflict-response hakemus))
      (bad-request! validation))))

(defn on-attachment-list [haku-id hakemus-id]
  (if-let [hakemus (va-db/get-hakemus hakemus-id)]
    (va-db/get-attachments hakemus-id (:id hakemus))))

(defn on-attachment-create
  [haku-id hakemus-id hakemus-base-version field-id filename provided-content-type size tempfile]
  {:post [(some? %)]}
  (let [content-type-validation-result (attachment-validator/validate-file-content-type tempfile provided-content-type)
        detected-content-type          (:detected-content-type content-type-validation-result)]
    (if (:allowed? content-type-validation-result)
      (if-let [hakemus (va-db/get-hakemus hakemus-id)]
        (let [fixed-filename (attachment-validator/file-name-according-to-content-type filename detected-content-type)]
          (when (not= fixed-filename filename)
            (log/warn (str "Request with filename '"
                           filename
                           "' has wrong extension for it's content-type '"
                           detected-content-type
                           "'. Renaming to '"
                           fixed-filename
                           "'.")))
          (when-let [attachment (va-db/create-attachment (:id hakemus)
                                                         hakemus-base-version
                                                         field-id
                                                         fixed-filename
                                                         detected-content-type
                                                         size
                                                         tempfile)]
            (-> (ok (va-db/convert-attachment (:id hakemus) attachment)))))
        (not-found))
      (do
        (log/warn (str "Request with illegal content-type '"
                       detected-content-type
                       "' of file '"
                       filename
                       "' (provided '"
                       provided-content-type
                       "')"))
        (bad-request (merge content-type-validation-result {:error true}))))))

(defn on-attachment-delete [haku-id hakemus-id field-id]
  (if-let [hakemus (va-db/get-hakemus hakemus-id)]
    (if (va-db/attachment-exists? (:id hakemus) field-id)
      (do (va-db/close-existing-attachment! (:id hakemus) field-id)
          (ok))
      (not-found))
    (not-found)))

(defn on-muutoshakemus-create [user-key hakemus-version haen-kayttoajan-pidennysta kayttoajan-pidennys-perustelut haettu-kayttoajan-paattymispaiva]
  (va-db/add-muutoshakemus! user-key hakemus-version haen-kayttoajan-pidennysta kayttoajan-pidennys-perustelut haettu-kayttoajan-paattymispaiva)
  (ok))

(defn on-attachment-get [haku-id hakemus-id field-id]
  (if-let [hakemus (va-db/get-hakemus hakemus-id)]
    (if (va-db/attachment-exists? (:id hakemus) field-id)
      (let [{:keys [data size filename content-type]} (va-db/download-attachment (:id hakemus) field-id)]
        (-> (ok data)
            (assoc-in [:headers "Content-Type"] content-type)
            (assoc-in [:headers "Content-Disposition"] (str "inline; filename=\"" filename "\""))))
      (not-found))))
