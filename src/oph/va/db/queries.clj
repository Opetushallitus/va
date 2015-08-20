(ns oph.va.db.queries
  (:require [yesql.core :refer [defquery]]))

(defquery health-check "sql/healthcheck.sql")

(defquery create-hakemus<! "sql/hakemus/create.sql")
(defquery get-hakemus-by-user-id "sql/hakemus/get_by_user_id.sql")
(defquery update-hakemus-submission<! "sql/hakemus/update-submission.sql")
(defquery update-hakemus-status<! "sql/hakemus/update-status.sql")
(defquery lock-hakemus "sql/hakemus/lock.sql")
(defquery close-existing-hakemus! "sql/hakemus/close-existing.sql")

(defquery get-avustushaku "sql/avustushaku/get.sql")
