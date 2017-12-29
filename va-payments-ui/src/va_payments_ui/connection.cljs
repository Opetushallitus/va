(ns va-payments-ui.connection
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs.core.async :refer [<! chan]]
            [cljs-http.client :as http]
            [goog.net.cookies]
            [va-payments-ui.utils :refer [format]]))

(def ^:private api-path "api/v2")

(defonce ^:private cache (atom {}))

(defonce ^:private config (atom {}))

(defn get-cached
  [url]
  (let [c (chan)
        cached-result (get @cache url)]
    (go (if (nil? cached-result)
          (let [result (<! (http/get url {:with-credentials? true}))]
            (when (:success result)
              (swap! cache assoc url (assoc result :cached true)))
            (>! c result))
          (>! c cached-result)))
    c))

(defn login-url-with-service
  []
  (format "%s?service=%s/login/cas"
          (get-in config [:opintopolku :url])
          (get-in config [:virkailija-server :url])))

(defn get-grant-data
  [id]
  (http/get (format "/%s/grants/%d/" api-path id) {:with-credentials? true}))

(defn get-grant-applications
  [id]
  (get-cached (format "/%s/grants/%d/applications/?template=with-evaluation"
                      api-path
                      id)))

(defn get-grants
  []
  (http/get (format "/%s/grants/?template=with-content" api-path)
            {:with-credentials? true}))

(defn get-grant-payments
  [id]
  (http/get (format "/%s/grants/%d/payments/" api-path id)
            {:with-credentials? true}))

(defn create-payment
  [values]
  (http/post (format "/%s/payments/" api-path)
             {:json-params values :with-credentials? true}))

(defn update-payment
  [payment]
  (http/put (format "/%s/payments/%d/" api-path (:id payment))
            {:json-params payment :with-credentials? true}))

(defn send-payments-email
  [id]
  (http/post (format "/api/avustushaku/%d/payments-email/" id)
             {:json-params {} :with-credentials? true}))

(defn get-payment-history
  [id]
  (http/get (format "/%s/applications/%d/payments-history/" api-path id)))

(defn delete-grant-payments
  [id]
  (http/delete (format "/%s/grants/%d/payments/" api-path id)))

(defn get-config
  []
  (http/get (format "/environment") {:with-credentials? true}))

(defn get-user-info
  []
  (http/get (format "/api/userinfo/") {:with-credentials? true}))

(defn get-next-installment-number
  []
  (http/get (format "/%s/payments/next-installment-number/" api-path)
            {:with-credentials? true}))

(defn set-config! [c] (reset! config c))
