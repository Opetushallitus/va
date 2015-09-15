(ns oph.va.virkailija.db.queries
  (:require [yesql.core :refer [defquery]]))

(defquery health-check "sql/healthcheck.sql")

(defquery create-arvio<! "sql/virkailija/arvio/create.sql")
(defquery update-arvio<! "sql/virkailija/arvio/update.sql")
(defquery get-arviot "sql/virkailija/arvio/get.sql")
