(ns oph.va.virkailija.login
  (:use [clojure.tools.trace :only [trace]])
  (:require [oph.soresu.common.config :refer [config config-simple-name login-url]]
            [clojure.edn :as edn]
            [cheshire.core :as json]
            [clj-ldap.client :as ldap]
            [clj-util.cas :as cas]
            [clojure.tools.logging :as log])
  (:import (java.net InetAddress)))

(defn- people-path [uid]
  (let [people-path-base (-> config :ldap :people-path-base)]
    (str "uid=" uid people-path-base)))

(defn- ldap-pool [{:keys [hostname port user password]}]
  (ldap/connect {:host [{:address (.getHostName hostname) :port port}]
                 :bind-dn (people-path user)
                 :password password
                 :ssl? true
                 :num-connections 1}))

(defn- create-ldap-connection []
  (let [ldap-config (:ldap config)
        hostname (InetAddress/getByName (:server ldap-config))]
    (ldap-pool {:hostname hostname
                :port (:port ldap-config)
                :user (:user ldap-config)
                :password (:password ldap-config)})))

(defn- find-user-details [ldap-server username]
  (ldap/bind? ldap-server
              (people-path (-> config :ldap :user))
              (-> config :ldap :password))
  (ldap/get ldap-server (people-path username)))

(defn- check-app-access [ldap-server username]
  (let [user-details (find-user-details ldap-server username)
        description (-> user-details :description json/parse-string)
        required-group (-> config :ldap :required-group)
        has-access? (some #{required-group} description)]
    (if has-access?
      description
      (log/warn (str "Authorization failed for username '"
                     username "' : "
                     required-group " missing, got only "
                     (pr-str description))))))

(defn- details->map [details]
  (when details
    {:username (:uid details)
     :person-oid (:employeeNumber details)
     :first-name (:cn details)
     :surname (:sn details)
     :email (:mail details)
     :lang (:preferredLanguage details)}))

(defn get-details [username]
  (let [ldap-server (create-ldap-connection)]
    (details->map (find-user-details ldap-server username))))

(defn login [cas-ticket]
  (let [cas-client (cas/cas-client (-> config :opintopolku :url))
        username (.run (.validateServiceTicket cas-client login-url cas-ticket))]
  (if username
    (let [ldap-server (create-ldap-connection)]
      (when (check-app-access ldap-server username)
        (details->map (find-user-details ldap-server username)))))))
