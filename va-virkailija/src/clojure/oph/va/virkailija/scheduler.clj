(ns oph.va.virkailija.scheduler
  (:require [clojure.core.async
             :refer [timeout go-loop chan poll! <! put! close!]]))

(def units
  {:millisecond 1
   :second 1000
   :minute 60000
   :hour 3600000})

(defn stop [c]
  (put! c :stop)
  (close! c))

(defn to-ms [time unit]
  (if-let [multiplier (get units unit)]
    (* time multiplier)
    (throw (.Exception "Unit not allowed"))))

(defn after-ms [ms f & args]
  (let [c (chan)]
    (go-loop []
      (<! (timeout ms))
      (when-not (poll! c)
        (do
          (apply f args)
          (recur))))
    c))

(defn after [time unit f & args]
  (apply after-ms (to-ms time unit) f args))
