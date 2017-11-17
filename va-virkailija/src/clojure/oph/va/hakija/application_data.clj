(ns oph.va.hakija.application-data
  (:require [oph.soresu.common.db :refer [exec]]
            [oph.va.hakija.api.queries :as hakija-queries]
            [oph.va.hakija.api :refer [convert-to-dash-keys]]
            [clj-time.core :as t]
            [clj-time.coerce :as c]
            [oph.va.hakija.grant-data :as grant-data])
  (:import (oph.va.jdbc.enums)))

(defn get-application [id]
  (convert-to-dash-keys
   (first
    (exec :form-db hakija-queries/get-application {:application_id id}))))

(defn get-application-with-evaluation-and-answers [id]
  (convert-to-dash-keys
   (first
    (exec :form-db hakija-queries/get-application-with-evaluation-and-answers
          {:application_id id}))))

(defn create-payment [application-id payment-data]
  (let [application (get-application application-id)
        payment {:application_id application-id
                 :application_version (:version application)
                 :grant_id (:grant-id application)
                 :state 0
                 :document_type (get payment-data :document-type "XA")
                 :invoice_date  (get payment-data :invoice-date
                                     (c/to-sql-time (t/now)))
                 :due_date (get payment-data :due-date
                                (c/to-sql-time (t/now)))
                 :receipt_date (get payment-data :receipt-date
                                    (c/to-sql-time (t/now)))
                 :transaction_account (get payment-data :transaction-account "")
                 :currency (get payment-data :currency "EUR")
                 :partner (get payment-data :partner "")
                 :inspector_email (get payment-data :inspector-email "")
                 :acceptor_email (get payment-data :acceptor-email "")
                 :organisation (get payment-data :organisation "")
                 :installment_number (get payment-data :installment-number 0)}]
    (convert-to-dash-keys
     (first (exec :form-db hakija-queries/create-payment payment)))))

(defn update-payment [application-id payment-data]
  (let [application (get-application application-id)
        grant (grant-data/get-grant (:grant-id application))
        payment {:application_id application-id
                 :application_version (:version application)
                 :grant_id (:id grant)
                 :state 0
                 :document_type (get payment-data :document-type "XA")
                 :transaction_account (get payment-data :transaction-account "")
                 :currency (get payment-data :currency "EUR")
                 :partner (:partner payment-data "")
                 :inspector_email (:inspector-email payment-data "")
                 :acceptor_email (:acceptor-email payment-data "")
                 :organisation (:organisation payment-data "")
                 :installment_number (:installment-number payment-data 0)}]
    (exec :form-db hakija-queries/create-payment payment)))
