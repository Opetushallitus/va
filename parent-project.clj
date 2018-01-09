(defproject oph-va/root "0.1.0-SNAPSHOT"
  :description "OPH Valtionavustus"

  :url "https://github.com/Opetushallitus/valtionavustus"

  :license {:name "EUPL licence"
            :url "http://opensource.org/licenses/EUPL-1.1"}

  :min-lein-version "2.7.1"

  :repositories [["releases"       {:url "https://artifactory.oph.ware.fi/artifactory/oph-sade-release-local"
                                    :sign-releases false
                                    :snapshots false}]
                 ["snapshots"      {:url "https://artifactory.oph.ware.fi/artifactory/oph-sade-snapshot-local"
                                    :releases false}]
                 ["Laughing Panda" {:url "http://maven.laughingpanda.org/maven2"
                                    :snapshots false}]]

  :managed-dependencies [[org.clojure/clojure "1.8.0"]

                         ;; our child projects
                         [oph/soresu "0.1.0-SNAPSHOT"]
                         [oph-va/common "0.1.0-SNAPSHOT"]

                         ;; http
                         [buddy/buddy-auth "2.1.0"]
                         [com.novemberain/pantomime "2.9.0"]
                         [compojure "1.6.0"]
                         [http-kit "2.2.0"]
                         [metosin/compojure-api "1.1.11"]
                         [ring/ring-core "1.6.2"]
                         [ring/ring-devel "1.6.2"]
                         [ring.middleware.conditional "0.2.0"]
                         [ring.middleware.logger "0.5.0"]
                         [ring/ring-defaults "0.3.1"]
                         [ring/ring-session-timeout "0.2.0"]

                         ;; json
                         [cheshire "5.8.0"]
                         [org.clojure/data.json "0.2.6"]
                         [com.fasterxml.jackson.core/jackson-core "2.9.1"]
                         [com.fasterxml.jackson.core/jackson-databind "2.9.1"]
                         [com.fasterxml.jackson.core/jackson-annotations "2.9.1"]
                         [com.fasterxml.jackson.dataformat/jackson-dataformat-cbor "2.9.1"]
                         [com.fasterxml.jackson.dataformat/jackson-dataformat-smile "2.9.1"]
                         [prismatic/schema "1.1.6"]

                         ;; database
                         [hikari-cp "1.8.1"]
                         [org.flywaydb/flyway-core "4.2.0"]
                         [org.postgresql/postgresql "42.1.4"]
                         [yesql "0.5.3"]

                         ;; testing
                         [speclj "3.3.1"]
                         [speclj-junit "0.0.11"]

                         ;; configuration
                         [environ "1.1.0"]

                         ;; logging
                         [fi.reaktor.log4j/log4j-email-throttle "1.0.0"]
                         [log4j "1.2.17"]
                         [org.clojure/tools.logging "0.4.0"]
                         [org.slf4j/slf4j-log4j12 "1.7.25"]
                         [org.slf4j/slf4j-api "1.7.25"]
                         [commons-logging "1.2"]
                         [org.log4s/log4s_2.11 "1.4.0"]

                         ;; cryptography
                         [org.bouncycastle/bcpkix-jdk15on "1.58"]
                         [org.bouncycastle/bcprov-jdk15on "1.58"]
                         [buddy/buddy-core "1.4.0"]

                         ;; cas
                         [fi.vm.sade/scala-cas_2.11 "0.5.0-20171221.082717-9"]
                         [org.http4s/http4s-blaze-client_2.11 "0.16.5"]
                         [org.http4s/http4s-client_2.11 "0.16.5"]
                         [org.http4s/http4s-dsl_2.11 "0.16.5"]

                         ;; ClojureScript
                         [org.clojure/clojurescript "1.9.946"]
                         [reagent "0.8.0-alpha2"]
                         [cljsjs/react-dom "15.6.2-1"]
                         [cljs-react-material-ui "0.2.48"]
                         [cljs-http "0.1.43"]
                         [com.andrewmcveigh/cljs-time "0.5.2"]

                         ;; CLJS Dev
                         [com.cemerick/piggieback "0.2.2"]
                         [binaryage/devtools "0.9.4"]
                         [figwheel-sidecar "0.5.14"]
                         [org.clojure/tools.nrepl "0.2.13"]
                         [com.google.guava/guava "23.6-jre"
                          :exclusions [com.google.code.findbugs/jsr305]]

                         ;; other
                         [clj-time "0.14.0"]
                         [com.cemerick/url "0.1.1"]
                         [commons-codec "1.10"]
                         [commons-io "2.5"]
                         [de.ubercode.clostache/clostache "1.4.0"]
                         [dk.ative/docjure "1.9.0"]
                         [instaparse "1.4.7"]
                         [org.apache.commons/commons-email "1.5"]
                         [org.clojure/core.async "0.3.443"]
                         [org.clojure/core.memoize "0.5.9"]
                         [org.clojure/tools.reader "1.1.0"]
                         [org.clojure/tools.trace "0.7.9"]
                         [org.scala-lang.modules/scala-xml_2.11 "1.0.6"]
                         [org.scala-lang/scala-library "2.11.11"]
                         [org.clojure/data.xml "0.0.8"]
                         [clj-ssh "0.5.14"]]

  :pedantic? :abort

  :plugins [[lein-ancient "0.6.14"]
            [lein-auto "0.1.3"]
            [lein-environ "1.1.0"]
            [speclj "3.3.2"]]

  :uberjar-exclusions [#"^\."]

  :auto-clean true

  :prep-tasks ["compile"]

  :javac-options ["-target" "1.8" "-source" "1.8" "-encoding" "UTF-8" "-deprecation"]
)
