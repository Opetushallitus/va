(ns oph.form.validation
  (:use [clojure.tools.trace :only [trace]])
  (:require [clojure.string :as string]
            [oph.form.formutil :refer :all]
            [oph.form.rules :as rules]))

(defn validate-required [field answer]
  (if (and (:required field)
           (empty? answer))
    [{:error "required"}]
    []))

(defn- is-valid-option-value? [options value]
  (some #{value} (map (fn [option] (option :value)) options)))

(defn- is-valid-option? [options values]
  (if (coll? values)
    (every? (partial is-valid-option-value? options) values)
    (is-valid-option-value? options values)))

(defn validate-options [field answer]
  (if (and (> (count (field :options)) 0)
           (not (empty? answer))
           (not (is-valid-option? (field :options) answer)))
    [{:error "invalid-option"}]
    []))

(defn validate-textarea-maxlength [field answer]
  (let [maxlength ((get field :params {}) :maxlength)]
    (if (and (has-field-type? "textArea" field)
             (> (count answer) maxlength))
      [{:error "maxlength", :max maxlength}]
      [])))

(defn validate-texfield-maxlength [field answer]
  (let [maxlength ((get field :params {}) :maxlength)]
    (if (and (has-field-type? "textField" field)
             (> (count answer) maxlength))
      [{:error "maxlength", :max maxlength}]
      [])))

(defn validate-email-security [field answer]
  (if (and (has-field-type? "emailField" field)
           (not (nil? answer))
           (or (re-matches #".*%0[aA].*" answer)
               (> (count answer) 254)))
    [{:error "email"}]
    []))

(defn validate-email-field [field answer]
  (if (not (and (has-field-type? "emailField" field)
                (= (:required field))))
    []
    (if (and (not (nil? answer))
             (not (string/blank? answer))
             (re-matches #"\S+@\S+\.\S+" answer)
             (not (re-matches #".*%0[aA].*" answer))
             (<= (count answer) 254)
             (> (-> answer (string/split #"\.") last count) 1))
        []
        [{:error "email"}])))

(defn validate-finnish-business-id-field [field answer]
  (if (not (and (has-field-type? "finnishBusinessIdField" field)
                (:required field)))
    []
    (if (and (not (nil? answer))
             (re-matches #"^[0-9]{7}-[0-9]$" answer))
      (let [multipliers [7 9 10 5 8 4 2]
            check-digit (read-string (subs answer 8 9))
            digits (mapv (comp read-string str) (subs answer 0 7))
            sum (apply + (map * multipliers digits))
            remainder (mod sum 11)
            calculated-check-digit (- 11 remainder)]
        (if (= check-digit calculated-check-digit)
          []
          [{:error "finnishBusinessId"}]))
      [{:error "finnishBusinessId"}])))

(defn validate-field-security [answers field]
  (let [answer (find-answer-value answers (:id field))]
    {(keyword (:id field)) (concat
       (validate-options field answer)
       (validate-textarea-maxlength field answer)
       (validate-texfield-maxlength field answer)
       (validate-email-security field answer))}))

(defn validate-attachment [attachments field]
  (if (and (not (contains? attachments (:id field)))
           (:required field))
    [{:error "required"}]
    []))

(defn validate-field [answers attachments field]
  (if (has-field-type? "namedAttachment" field)
    {(keyword (:id field)) (concat
      (validate-attachment attachments field))}
    (let [answer (find-answer-value answers (:id field))]
      {(keyword (:id field)) (concat
         (validate-required field answer)
         (validate-options field answer)
         (validate-textarea-maxlength field answer)
         (validate-texfield-maxlength field answer)
         (validate-email-field field answer)
         (validate-finnish-business-id-field field answer))})))

(defn validate-form-security [form answers]
  (let [applied-form (rules/apply-rules form answers {})
        validator (partial validate-field-security answers)]
    (->> (find-fields (:content applied-form))
         (map validator)
         (into {}))))

(defn validate-form [form answers attachments]
  (let [applied-form (rules/apply-rules form answers attachments)
        validator (partial validate-field answers attachments)]
    (->> (find-fields (:content applied-form))
       (map validator)
       (into {}))))
