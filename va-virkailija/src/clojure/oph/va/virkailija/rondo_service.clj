(ns oph.va.virkailija.rondo-service
  (:require [clj-ssh.ssh :as ssh]
            [ring.util.http-response :refer :all]
            [oph.va.hakija.api :as hakija-api];
            [oph.va.virkailija.invoice :as invoice]
            [oph.soresu.common.config :refer [config]]
            [clojure.tools.logging :as log]))

(defn send-sftp! [file sftp-config]
  (let [agent (ssh/ssh-agent {:use-system-ssh-agent false})
        session (ssh/session agent (:host-ip sftp-config)
                             {:username (:username sftp-config)
                              :password (:password sftp-config)
                              :port (:port sftp-config)
                              :strict-host-key-checking :no})]
    (ssh/with-connection session
      (let [channel (ssh/ssh-sftp session)]
        (ssh/with-channel-connection channel
          (ssh/sftp channel {} :put file (:remote_path sftp-config)))))))

(defn send-to-rondo! [{:keys [payment application grant filename]}]
  (let [sftp-config (:rondo-sftp config)
        file (format "%s/%s" (:local-path sftp-config) filename)]
    (invoice/write-xml! (invoice/payment-to-xml payment application grant) file)
    (if (:enabled? sftp-config)
      (let [result (send-sftp! file sftp-config)]
        (if (nil? result)
          {:success true}
          {:success false :value result}))
      (do
        (log/info (format "Would send %s to %s" file (:host-ip sftp-config)))
        {:success true}))))

(defn get-sftp [file sftp-config]
    (let [agent (ssh/ssh-agent {:use-system-ssh-agent false})
        session (ssh/session agent (:host-ip sftp-config)
                             {:username (:username sftp-config)
                              :password (:password sftp-config)
                              :port (:port sftp-config)
                              :strict-host-key-checking :no})]
    (ssh/with-connection session
      (let [channel (ssh/ssh-sftp session)]
        (ssh/with-channel-connection channel
          (ssh/sftp channel {} :get (format "%s/%s" (:remote_path config) file) file))))))
