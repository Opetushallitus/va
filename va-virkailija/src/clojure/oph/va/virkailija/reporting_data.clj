(ns oph.va.virkailija.reporting-data
  (:require
   [oph.soresu.common.db :refer [exec]]
   [oph.va.virkailija.db.queries :as queries]
   [oph.va.hakija.api.queries :as hakija-queries]
   [oph.va.virkailija.utils :refer [convert-to-dash-keys]]
   [clojure.pprint :refer [print-table]])
  (:import (oph.va.jdbc.enums HakuStatus)))

(defn year-to-int-all-v [c]
  (mapv #(update % :year int)
        (filter #(some? (get % :year)) c)))

(defn get-yearly-application-info []
  (mapv convert-to-dash-keys
        (year-to-int-all-v
          (exec hakija-queries/get-yearly-application-info {}))))

(defn get-yearly-application-count []
  (mapv convert-to-dash-keys
        (year-to-int-all-v
          (exec hakija-queries/get-yearly-application-count {}))))

(defn get-accepted-count-by-year []
  (year-to-int-all-v
    (exec queries/get-yearly-evaluation-count-by-status
          {:status "accepted"})))

(defn get-rejected-count-by-year []
  (year-to-int-all-v
    (exec queries/get-yearly-evaluation-count-by-status
          {:status "rejected"})))

(defn get-yearly-total-grant-size []
  (->> (exec hakija-queries/get-yearly-total-grant-size {})
       year-to-int-all-v
       (map convert-to-dash-keys)))

(defn get-yearly-granted []
  (let [grant-sizes (reduce #(assoc %1 (:year %2) (:total-grant-size %2))
                            {}
                            (get-yearly-total-grant-size))]
    (mapv
      #(assoc (convert-to-dash-keys %)
              :total-grant-size (get grant-sizes (:year %)))
         (year-to-int-all-v
           (exec queries/get-yearly-granted {})))))

(defn get-total-grant-count []
  (first (exec hakija-queries/get-total-grant-count {})))

(defn get-yearly-resolved-count []
  (mapv convert-to-dash-keys
        (year-to-int-all-v
          (exec hakija-queries/get-yearly-resolved-grants {}))))

(defn get-yearly-education-levels []
  (->> (exec queries/get-yearly-education-level {})
      year-to-int-all-v
      (map convert-to-dash-keys)
      (group-by :year)))

(defn get-yearly-report []
  {:applications (get-yearly-application-info)
   :granted (get-yearly-granted)
   :total-grant-count (:count (get-total-grant-count))})
