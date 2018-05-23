(ns oph.va.virkailija.db.queries
  (:require [yesql.core :refer [defquery]]))

(defquery health-check "sql/healthcheck.sql")

(defquery create-empty-arvio<! "sql/virkailija/arvio/create-empty.sql")
(defquery create-arvio<! "sql/virkailija/arvio/create.sql")
(defquery update-arvio<! "sql/virkailija/arvio/update.sql")
(defquery get-arviot "sql/virkailija/arvio/get-by-ids.sql")
(defquery get-accepted-or-rejected-hakemus-ids "sql/virkailija/arvio/accepted-or-rejected-hakemus-ids-by-ids.sql")
(defquery get-accepted-hakemus-ids "sql/virkailija/arvio/get-accepted-hakemus-ids.sql")
(defquery get-arvio "sql/virkailija/arvio/get.sql")
(defquery list-arvio-status-and-budget-granted-by-hakemus-ids "sql/virkailija/arvio/list-status-and-budget-granted-by-hakemus-ids.sql")
(defquery set-all-unhandled! "sql/virkailija/arvio/set-all-unhandled.sql")

(defquery create-comment<! "sql/virkailija/comment/create.sql")
(defquery list-comments "sql/virkailija/comment/list.sql")

(defquery create-score<! "sql/virkailija/score/create.sql")
(defquery update-score<! "sql/virkailija/score/update.sql")
(defquery list-scores "sql/virkailija/score/list.sql")
(defquery list-avustushaku-scores "sql/virkailija/score/list-by-avustushaku.sql")

(defquery find-search "sql/virkailija/saved_search/find.sql")
(defquery create-search<! "sql/virkailija/saved_search/create.sql")
(defquery get-search "sql/virkailija/saved_search/get.sql")

(defquery get-grants "sql/virkailija/grants/get-grants.sql")
(defquery get-resolved-grants-with-content
  "sql/virkailija/grants/get-resolved-grants-with-content.sql")
(defquery find-grants "sql/virkailija/grants/find-grants.sql")
(defquery get-grant "sql/virkailija/grants/get-grant.sql")
(defquery get-grant-applications "sql/virkailija/grants/get-grant-applications.sql")
(defquery get-grant-applications-with-evaluation
  "sql/virkailija/grants/get-accepted-grant-applications-with-evaluation.sql")
(defquery get-grant-payments "sql/virkailija/grants/get-grant-payments.sql")
(defquery delete-grant-payments
  "sql/virkailija/grants/delete-grant-payments.sql")
(defquery get-grant-payments-info
  "sql/virkailija/grants/get-grant-payments-info.sql")
(defquery get-unpaid-applications
  "sql/virkailija/grants/get-unpaid-applications.sql")

(defquery get-payment "sql/virkailija/payments/get-payment.sql")
(defquery get-payment-version "sql/virkailija/payments/get-payment-version.sql")
(defquery payment-close-version
  "sql/virkailija/payments/payment-close-version.sql")
(defquery update-payment "sql/virkailija/payments/update-payment.sql")
(defquery get-payment-history "sql/virkailija/applications/get-payment-history.sql")
(defquery create-payment "sql/virkailija/payments/create-payment.sql")
(defquery delete-payment "sql/virkailija/payments/delete-payment.sql")
(defquery find-payments-by-application-id-and-invoice-date
  "sql/virkailija/payments/find-by-application-id-and-invoice-date.sql")

(defquery find-batch "sql/virkailija/payment_batches/find-batch.sql")
(defquery create-batch "sql/virkailija/payment_batches/create-batch.sql")
(defquery get-batch "sql/virkailija/payment_batches/get-batch.sql")

(defquery get-application-evaluation
  "sql/virkailija/applications/get-application-evaluation.sql")
(defquery get-application-payments
  "sql/virkailija/applications/get-application-payments.sql")
(defquery get-application-payment
  "sql/virkailija/applications/get-application-payment.sql")
(defquery get-application-payment-by-state
  "sql/virkailija/applications/get-application-payment-by-state.sql")
(defquery get-total-paid "sql/virkailija/applications/get-total-paid.sql")
(defquery is-application-unpaid
  "sql/virkailija/applications/is-unpaid.sql")
(defquery application-has-payments
  "sql/virkailija/applications/has-payments.sql")
(defquery get-application-unsent-payments
  "sql/virkailija/applications/get-unsent-payments.sql")

(defquery lock-va-users-cache-exclusively! "sql/virkailija/va_users_cache/lock-exclusively.sql")
(defquery update-va-user-cache! "sql/virkailija/va_users_cache/update.sql")
(defquery create-va-user-cache<! "sql/virkailija/va_users_cache/create.sql")
(defquery delete-va-user-cache-by-not-in! "sql/virkailija/va_users_cache/delete-by-not-in.sql")
(defquery delete-va-user-cache! "sql/virkailija/va_users_cache/delete.sql")
(defquery get-va-user-cache-by-person-oid "sql/virkailija/va_users_cache/get-by-person-oid.sql")

(defquery get-yearly-evaluation-count-by-status
  "sql/virkailija/reporting/get-yearly-evaluation-count-by-status.sql")
(defquery get-yearly-granted "sql/virkailija/reporting/get-yearly-granted.sql")

(defquery get-va-code-value
  "sql/virkailija/va_code_values/get-va-code-value.sql")
(defquery get-va-code-values-by-type-and-year
  "sql/virkailija/va_code_values/get-va-code-values-by-type-and-year.sql")
(defquery get-va-code-values-by-year
  "sql/virkailija/va_code_values/get-va-code-values-by-year.sql")
(defquery get-current-va-code-values-by-type
  "sql/virkailija/va_code_values/get-current-va-code-values-by-type.sql")
(defquery get-current-va-code-values
  "sql/virkailija/va_code_values/get-current-va-code-values.sql")
(defquery create-va-code-value
  "sql/virkailija/va_code_values/create-va-code-value.sql")
(defquery delete-va-code-value
  "sql/virkailija/va_code_values/delete-va-code-value.sql")
