(ns oph.va.virkailija.grant-routes
  (:require [compojure.api.sweet :as compojure-api]
            [oph.va.hakija.grant-data :as grant-data]
            [ring.util.http-response :refer [ok not-found]]
            [compojure.core :as compojure]
            [schema.core :as s]
            [oph.va.virkailija.schema :as virkailija-schema]))

(defn- get-grants []
  (compojure-api/GET "/" []
    :path-params []
    :query-params [{include :- String ""}]
    :return virkailija-schema/Grants
    :summary "Return list of grants"
    (prn include)
    (ok (grant-data/get-grants {:include-content (= include "content")}))))

(defn- get-grant []
  (compojure-api/GET
    "/:grant-id/" [grant-id :as request]
    :path-params [grant-id :- Long]
    :return virkailija-schema/Grant
    :summary "Return basic info of single grant"
    (if-let [response (grant-data/get-grant grant-id)]
      (ok response)
      (not-found))))

(compojure-api/defroutes routes
  "grant routes"
  (get-grant)
  (get-grants))
