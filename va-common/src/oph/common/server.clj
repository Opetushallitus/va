(ns oph.common.server
  (:use [org.httpkit.server :only [run-server]])
  (:require [clojure.tools.logging :as log]
            [ring.util.response :refer [get-header header]]
            [oph.va.jdbc.extensions])
  (:import (java.net Socket)
           (java.io IOException)))

(defn- fail-if-server-running [host port]
  (try
    (let [socket (Socket. host port)]
      (.close socket)
      (throw (Exception. (format "Server is already running %s:%d" host port))))
    (catch IOException e)))

(defn start-server [{:keys [host port auto-reload? routes on-startup on-shutdown threads attachment-max-size]}]
  (fail-if-server-running host port)
  (on-startup)
  (log/info (format "Starting server in URL http://%s:%d/" host port))
  (let [max-body (* attachment-max-size 1024 1024)
        stop (run-server routes {:host host
                                 :port port
                                 :thread threads
                                 :max-body max-body})]
    (.addShutdownHook (Runtime/getRuntime) (Thread. on-shutdown))
    ;; Return stop-function with our own shutdown
    (fn []
      (stop)
      (on-shutdown))))

(defn wrap-cache-control [handler]
  (fn [request]
    (let [response (handler request)
          response-cache-validated? (or (get-header response "Last-Modified")
                                        (get-header response "ETag"))]
      (-> response
        (header "Expires" 0)
        (header "Pragma" "no-cache")
        (header "Cache-Control" (if response-cache-validated?
                                  "no-cache, public, max-age=0"
                                  "no-store, max-age=0"))))))
