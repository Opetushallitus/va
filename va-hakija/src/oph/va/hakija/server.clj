(ns oph.va.hakija.server
  (:use [oph.va.hakija.routes :only [all-routes restricted-routes]])
  (:require [ring.middleware.reload :refer [wrap-reload]]
            [ring.middleware.not-modified :refer [wrap-not-modified]]
            [ring.middleware.defaults :refer :all]
            [clojure.tools.logging :as log]
            [oph.common.background-job-supervisor :as job-supervisor]
            [oph.common.server :as server]
            [oph.soresu.common.config :refer [config]]
            [oph.soresu.common.db :as db]
            [oph.va.hakija.db.migrations :as dbmigrations]
            [oph.va.hakija.email :as email]))

(defn- startup [config]
  (log/info "Startup, with configuration:" config)
  (dbmigrations/migrate "hakija"
                        "db.migration"
                        "oph.va.hakija.db.migrations")
  (email/start-background-job-send-mails))

(defn- shutdown []
  (log/info "Shutting down...")
  (email/stop-background-job-send-mails)
  (db/close-datasource!)
  (job-supervisor/await-jobs!))

(defn- create-restricted-routes [] #'restricted-routes)
(defn- create-all-routes [] #'all-routes)

(defn- create-routes []
  (if (-> config :api :restricted-routes?)
    (create-restricted-routes)
    (do
      (log/warn "Enabling all routes. This setting should be used only in development!")
      (create-all-routes))))

(defn start-server [host port auto-reload?]
  (let [defaults (assoc-in site-defaults [:security :anti-forgery] false)
        handler (as-> (create-routes) h
                  (wrap-defaults h defaults)
                  (server/wrap-logger h)
                  (server/wrap-cache-control h)
                  (wrap-not-modified h)
                  (if auto-reload?
                    (wrap-reload h)
                    h))
        threads (or (-> config :server :threads) 16)
        attachment-max-size (or (-> config :server :attachment-max-size) 50)]
    (server/start-server {:host host
                          :port port
                          :auto-reload? auto-reload?
                          :routes handler
                          :on-startup (partial startup config)
                          :on-shutdown shutdown
                          :threads threads
                          :attachment-max-size attachment-max-size})))
