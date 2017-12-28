(ns va-payments-ui.grants
  (:require [reagent.core :as r]
            [cljsjs.material-ui]
            [cljs-react-material-ui.core :refer [get-mui-theme color]]
            [cljs-react-material-ui.reagent :as ui]
            [cljs-react-material-ui.icons :as ic]
            [va-payments-ui.theme :refer [material-styles]]))

(def status-str
  {"deleted" "Poistettu"
   "draft" "Luonnos"
   "published" "Julkaistu"
   "resolved" "Ratkaistu"
   "new" "Uusi"})

(def phase-str {"current" "Auki" "unpublished" "Kiinni" "ended" "Kiinni"})

(defn grant-row
  [grant selected]
  [ui/table-row {:key (:id grant) :selected selected}
   [ui/table-row-column (get grant :register-number)]
   [ui/table-row-column (get-in grant [:content :name :fi])]
   [ui/table-row-column (get status-str (:status grant))]
   [ui/table-row-column (get phase-str (:phase grant))]
   [ui/table-row-column (get-in grant [:content :duration :start])]
   [ui/table-row-column (get-in grant [:content :duration :end])]])

(defn grants-table
  [{:keys [on-change grants value]}]
  [ui/table
   {:on-cell-click #(on-change %1)
    :selectable true
    :multi-selectable false
    :height "250px"
    :style (:table material-styles)
    :class "table"}
   [ui/table-header {:display-select-all false :adjust-for-checkbox false}
    [ui/table-row {:style {:font-size "80px"}}
     [ui/table-header-column "Diaarinumero"] [ui/table-header-column "Nimi"]
     [ui/table-header-column "Tila"] [ui/table-header-column "Vaihe"]
     [ui/table-header-column "Haku alkaa"]
     [ui/table-header-column "Haku päättyy"]]]
   [ui/table-body {:display-row-checkbox false :deselect-on-clickaway false}
    (for [grant grants] (grant-row grant (= (.indexOf grants grant) value)))]])

(defn project-info
  [grant]
  [ui/grid-list {:cols 6 :cell-height "auto" :style {:margin 20}}
   [:div [:label "Toimintayksikkö: "]
    (get-in grant [:content :operational-unit])]
   [:div [:label "Projekti: "] (get-in grant [:content :project])]
   [:div [:label "Toiminto: "] (get-in grant [:content :operation])]])
