(ns oph.va.virkailija.payment-batches-data
  (:require [clojure.core.async :as a]
            [oph.soresu.common.db :refer [exec]]
            [oph.va.virkailija.db.queries :as queries]
            [oph.va.virkailija.utils
             :refer [convert-to-dash-keys convert-to-underscore-keys
                     with-timeout]]
            [oph.va.virkailija.payments-data
             :refer [convert-timestamps-from-sql]]
            [oph.va.virkailija.application-data :as application-data]
            [oph.va.virkailija.rondo-service :as rondo-service]
            [oph.va.virkailija.payments-data :as payments-data]
            [oph.va.virkailija.grant-data :as grant-data]
            [oph.soresu.common.config :refer [config]]))

(def timeout-limit 10000)

(defn find-batch [date grant-id]
  (-> (exec :virkailija-db queries/find-batch {:batch_date date :grant_id grant-id})
      first
      convert-to-dash-keys
      convert-timestamps-from-sql))

(defn create-batch [values]
  (->> values
       convert-to-underscore-keys
       (exec :virkailija-db queries/create-batch)
       first
       convert-to-dash-keys
       convert-timestamps-from-sql))

(defn get-batch [id]
  (-> (exec :virkailija-db queries/get-batch {:batch_id id})
      first
      convert-to-dash-keys
      convert-timestamps-from-sql))

(defn create-payment-data [application batch sum]
  {:application-id (:id application)
   :application-version (:version application)
   :state 0
   :batch-id (:id batch)
   :payment-sum sum})

(defn create-filename
  ([payment id-gen-fn] (format "payment-%d-%d.xml" (:id payment) (id-gen-fn)))
  ([payment] (create-filename payment  #(System/currentTimeMillis))))

(defn send-to-rondo! [payment application grant filename batch]
  (with-timeout
    #(try
       (rondo-service/send-to-rondo!
         {:payment (payments-data/get-payment (:id payment))
          :application application
          :grant grant
          :filename filename
          :batch batch
          :config (get-in config [:server :rondo-sftp])})
       (catch Exception e
         {:success false :error {:error-type :exception :exception e}}))
    timeout-limit {:success false :error {:error-type :timeout}}))

(defn get-unpaid-payment [payments]
  (some #(when (< (:state %) 2) %) payments))

(defn send-payment [application data]
  (let [payment (application-data/get-application-payment-by-state
                  (:id application) 1)]
    (if (some? payment)
      (let [filename (create-filename payment)
            updated-payment (payments-data/update-payment
                             (assoc payment :batch-id (get-in data [:batch :id]))
                             (:identity data))]
        (-> updated-payment
            (send-to-rondo! application (:grant data) filename (:batch data))
            (assoc :filename filename :payment updated-payment)))
      {:success false :error {:error-type :no-payments}})))

(defn create-payments [data]
  (let [{:keys [identity grant]} data
        c (a/chan)]
    (a/go
      (doseq [application
              (filter
                payments-data/valid-for-send-payment?
                (grant-data/get-grant-applications-with-evaluation (:id grant)))]

        (let [result (send-payment application data)]
          (when (:success result)
            (do
              (payments-data/update-payment
                (assoc (:payment result)
                       :state 2 :filename (:filename result)) identity)
              (application-data/revoke-application-tokens (:id application))))
          (a/>! c result)))
      (a/close! c))
    c))
