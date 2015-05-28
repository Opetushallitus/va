(ns oph.va.db.queries
  (:require [yesql.core :refer [defquery]]))

(defquery list-forms "sql/list-forms.sql")
(defquery get-form "sql/get-form.sql")
(defquery submit-form! "sql/submit-form.sql")
(defquery get-form-submission "sql/get-form-submission.sql")
