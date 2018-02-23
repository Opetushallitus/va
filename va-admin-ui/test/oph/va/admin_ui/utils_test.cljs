(ns oph.va.admin-ui.utils-test
  (:require [cljs.test :refer-macros [is are deftest testing use-fixtures]]
            [oph.va.admin-ui.payments.utils :as utils]))

(deftest test-any-nil
  (is (not (utils/any-nil? {} [])))
  (is (not (utils/any-nil? {:hello "word"} [])))
  (is (not (utils/any-nil? {:hello nil} [])))
  (is (utils/any-nil? {nil nil} [nil]))
  (is (utils/any-nil? {} [:hello :world]))
  (is (utils/any-nil? {:hello "something"} [:hello :world]))
  (is (not (utils/any-nil? {:hello "something" :world "words"} [:hello :world])))
  (is (utils/any-nil? {:hello "something" :world "words"} [:hello :world :sep]))
  (is
   (utils/any-nil? {:hello "something" :world "words" :sep nil} [:hello :world :sep]))
  (is (not (utils/any-nil?
            {:hello "something" :world "words" :sep "others"} [:hello :world :sep]))))
