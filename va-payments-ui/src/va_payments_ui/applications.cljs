(ns va-payments-ui.applications
  (:require [reagent.core :as r]
            [cljsjs.material-ui]
            [cljs-react-material-ui.reagent :as ui]
            [cljs-react-material-ui.icons :as ic]
            [va-payments-ui.utils :refer [assoc-all-with toggle toggle-in]]
            [va-payments-ui.theme :refer [material-styles]]
            [va-payments-ui.utils :refer [format]]))

(defn get-answer-value
  [answers key]
  (:value (first (filter #(= (:key %) key) answers))))

(defn state-to-str
  [state]
  (case state
    0 "Luotu"
    1 "Hyväksytty"
    2 "Lähetetty Rondoon"
    3 "Maksettu"
    "Odottaa maksatusta"))

(defn render-application
  [i application on-info-clicked]
  [ui/table-row {:key i}
   [ui/table-row-column (state-to-str (:payment-state application))]
   [ui/table-row-column (:organization-name application)]
   [ui/table-row-column
    [:a
     {:target "_blank"
      :href (format "/avustushaku/%d/hakemus/%d/arviointi/"
                    (:grant-id application)
                    (:id application))} (:project-name application)]]
   [ui/table-row-column (get application :budget-granted)]
   [ui/table-row-column (get-answer-value (:answers application) "bank-iban")]
   [ui/table-row-column (get application :register-number)]
   [ui/table-row-column (get-in application [:arvio :lkp-account])]
   [ui/table-row-column (get-in application [:arvio :takp-account])]
   [ui/table-row-column (get-in application [:arvio :amount])]
   [ui/table-row-column
    [ui/icon-button {:on-click #(on-info-clicked (:id application))}
     [ic/action-info-outline]]]])

(defn applications-table
  [applications on-info-clicked]
  [:div
   [ui/table
    {:fixed-header true
     :height "250px"
     :selectable false
     :style (:table material-styles)}
    [ui/table-header {:adjust-for-checkbox false :display-select-all false}
     [ui/table-row [ui/table-header-column "Tila"]
      [ui/table-header-column "Toimittajan nimi"]
      [ui/table-header-column "Hanke"]
      [ui/table-header-column "Myönnetty summa"] [ui/table-header-column "IBAN"]
      [ui/table-header-column "Pitkäviite"] [ui/table-header-column "LKP-tili"]
      [ui/table-header-column "TaKp-tili"]
      [ui/table-header-column "Tiliöintisumma"]
      [ui/table-header-column "Lisätietoja"]]]
    [ui/table-body {:display-row-checkbox false}
     (doall (map-indexed #(render-application %1 %2 on-info-clicked)
                         applications))]]])
