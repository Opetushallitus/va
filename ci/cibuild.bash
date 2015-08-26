#!/bin/bash
set -euo pipefail

pushd `dirname $0` > /dev/null
SCRIPTPATH=`pwd -P`
popd > /dev/null
LEIN=$SCRIPTPATH/../lein

export PATH=$PATH:$(dirname $LEIN)

function show_usage() {
cat << EOF
  Usage: ${0##*/} [clean] [uberjar] [test] [-p <docker postgresql port>] [deploy] [-s <target server name> ] [-d] [-r] [-j <source jar path>]
    -p specifies the host port on which Docker binds Postgresql, it should be same in the app config
    -d disables running Postgresql in Docker container around the build
    -r recreate database when deploying (default: false)
    -j specifies the path to source jar
EOF
  exit 2
}

run_docker_postgresql=true
recreate_database=false
va_hakija_source_path="va-hakija/target/uberjar/oph-valtionavustus-*-standalone.jar"

function clean() {
  echo "Running lein clean and emptying all subdirectories with name 'node_modules'"
  $LEIN with-profile ci modules clean
  find . -depth  -type d -name 'node_modules' -exec rm -rf {} \;
}

function uberjar() {
  time $LEIN with-profile ci modules install
  cd va-hakija
  /usr/bin/git show --pretty=short --abbrev-commit -s HEAD > resources/public/git-HEAD.txt
  time $LEIN with-profile ci do uberjar
  cd ..
}

function start_postgresql_in_docker() {
  echo "=============================="
  echo
  echo "Starting Postgresql in Docker"
  start_postgresql_in_container
  wait_for_postgresql_to_be_available
  give_schema_to_va hakija
}

function run_tests() {
  if [ "$run_docker_postgresql" = true ]; then
    start_postgresql_in_docker
  fi

  time $LEIN with-profile ci modules install
  time $LEIN with-profile ci modules spec -f junit || true

  if [ "$run_docker_postgresql" = true ]; then
    remove_postgresql_container
  fi
}

function drop_database() {
  echo "=============================="
  echo
  echo "...dropping db.."
  $SSH "sudo -u postgres /usr/local/bin/run_sql.bash ${CURRENT_DIR}/va-hakija/resources/sql/drop_schema.sql -v schema_name=hakija"
}

function restart_application() {
  echo "=============================="
  echo
  echo "Stopping application..."
  $SSH "sudo /usr/local/bin/va_app.bash --stop"
  if [ "$recreate_database" = true ]; then
    drop_database
  else
    echo "Not dropping existing database."
  fi
  echo "=============================="
  echo
  APP_COMMAND="sudo /usr/local/bin/va_app.bash --start ${CURRENT_DIR}/va.jar file:${CURRENT_DIR}/resources/log4j-deployed.properties ${CURRENT_DIR}/config/defaults.edn ${CURRENT_DIR}/config/${target_server_name}.edn"
  echo "...starting application with command \"${APP_COMMAND}\" ..."
  $SSH "${APP_COMMAND}"
}

function deploy() {
  if [ -z ${target_server_name+x} ]; then
    echo "deploy: Please provide target server name with -s option."
    exit 4
  fi
  echo "=============================="
  echo
  echo "Transfering to application server ${target_server_name}"
  SSH_KEY=~/.ssh/id_deploy
  SSH_USER=va-deploy
  SSH="ssh -i $SSH_KEY va-deploy@${target_server_name}"
  BASE_DIR=/data/www
  CURRENT_DIR=${BASE_DIR}/current
  echo "=============================="
  echo
  TARGET_DIR=${BASE_DIR}/va-`date +'%Y%m%d%H%M%S'`
  TARGET_JAR_PATH=${TARGET_DIR}/va.jar
  echo "...copying artifacts to ${target_server_name}:${TARGET_DIR} ..."
  $SSH "mkdir -p ${TARGET_DIR}"
  scp -p -i ${SSH_KEY} ${va_hakija_source_path} ${SSH_USER}@"${target_server_name}":${TARGET_JAR_PATH}
  scp -pr -i ${SSH_KEY} va-hakija/config va-hakija/resources ${SSH_USER}@"${target_server_name}":${TARGET_DIR}
  $SSH ln -sfT ${TARGET_DIR} ${CURRENT_DIR}
  restart_application
  echo "=============================="
  echo
  CAT_LOG_COMMAND="$SSH tail -n 100 /logs/valtionavustus/current_run.log /logs/valtionavustus/application.log"
  HEALTH_CHECK_COMMAND="`dirname $0`/health_check.bash ${target_server_name} $CAT_LOG_COMMAND"
  echo "...checking that it really comes up, with $HEALTH_CHECK_COMMAND ..."
  $HEALTH_CHECK_COMMAND
  echo
  echo "=============================="
  echo
  echo "...start done!"
}


if [ "$#" -lt 1 ]; then
    show_usage
fi

commands=()
while [[ $# > 0 ]]; do
  key="$1"

  case $key in
      clean)
      commands+=('clean')
      ;;
      uberjar)
      commands+=('uberjar')
      ;;
      test)
      commands+=('run_tests')
      ;;
      deploy)
      commands+=('deploy')
      ;;
      -s|--target-server-name)
      target_server_name="$2"
      shift # past argument
      ;;
      -p|--postgresql-port-for-host)
      host_postgres_port="$2"
      shift # past argument
      ;;
      -d|--disable-container-postgresql)
      run_docker_postgresql=false
      ;;
      -r|--recreate-database)
      recreate_database=true
      ;;
      -j|--source-jar-path)
      va_hakija_source_path="$2"
      shift # past argument
      ;;
      *)
      # unknown option
      show_usage
      ;;
  esac
  shift # past command or argument value
done

source `dirname $0`/postgresql_container_functions.bash

for (( i = 0; i < ${#commands[@]} ; i++ )); do
    printf "\n**** Running: ${commands[$i]} *****\n\n"
    eval "${commands[$i]}"
done
