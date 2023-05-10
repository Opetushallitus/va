#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

# shellcheck source=../scripts/common-functions.sh
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../scripts/common-functions.sh"

function main {
    require_command docker
    require_docker_compose
    
    cd "$repo"

    start_gh_actions_group "Run lein tests"
    docker compose up -d db 
    docker run -it --network container:va-postgres "$(docker build -q .)" with-profile test spec -f d
    docker compose down
    end_gh_actions_group
}
main "$@"