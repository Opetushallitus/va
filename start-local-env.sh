#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/scripts/common-functions.sh"

function stop() {
  docker compose down --remove-orphans || true
}
trap stop EXIT

RESTORE_FILE=""
RUN_DATABASE_ARGS=""

function init {
  require_command tmux
  require_docker

  while getopts "r:" opt
  do
    case $opt in
      (r) RUN_DATABASE_ARGS="-r"; RESTORE_FILE="$OPTARG" ;;
      (*) printf "Illegal option '-%s'\n" "$opt" && exit 1 ;;
    esac
  done

}

function rename_panes_to_match_the_script_they_run {
  tmux select-pane -t 0 -T run_database
  tmux select-pane -t 1 -T run_frontend
  tmux select-pane -t 2 -T run_hakija_server
  tmux select-pane -t 3 -T run_fakesmtp
  tmux select-pane -t 4 -T run_virkailija_server
  tmux select-pane -t 5 -T run_maksatuspalvelu
}

init

docker compose pull
docker compose create

session="valtionavustus"

tmux kill-session -t $session || true
tmux start-server
tmux new-session -d -s $session -c "$repo"

tmux splitw -h
tmux splitw -h

readonly up_cmd="docker compose up --no-log-prefix --build"

tmux select-pane -t 0
tmux send-keys "$up_cmd db" C-m

tmux splitw -v
tmux send-keys "$repo/scripts/run_frontend.sh" C-m

tmux select-pane -t 2
tmux send-keys "$up_cmd hakija" C-m

tmux splitw -v
tmux send-keys "$up_cmd fakesmtp" C-m

tmux select-pane -t 4
tmux send-keys "$up_cmd virkailija" C-m

tmux splitw
tmux send-keys "$up_cmd maksatuspalvelu" C-m

if [ ! -z $RESTORE_FILE ]; then
  tmux new-window
  tmux send-keys "$repo/scripts/restore_dump.sh $RESTORE_FILE" C-m
fi

rename_panes_to_match_the_script_they_run

tmux select-pane -t 0
tmux attach-session -t $session
