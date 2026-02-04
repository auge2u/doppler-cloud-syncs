# Bash completion for dcs (Doppler Cloud Sync)
# Install: Source this file in your .bashrc or place in /etc/bash_completion.d/
#   source /path/to/dcs.bash
#   # Or: cp dcs.bash /etc/bash_completion.d/dcs

_dcs_completions() {
  local cur prev words cword
  _init_completion || return

  local commands="init sync status run diff provision neon hooks webhook help"
  local platforms="firebase cloudflare neon gcp"
  local environments="dev stg prd"

  # Handle completion based on position
  case $cword in
    1)
      # First argument: command
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      ;;
    *)
      # Subsequent arguments: depends on command
      local cmd="${words[1]}"

      case "$cmd" in
        init)
          case "$prev" in
            -p|--project)
              # Project name - no completion
              ;;
            *)
              COMPREPLY=($(compgen -W "-p --project -y --yes" -- "$cur"))
              ;;
          esac
          ;;

        sync|diff)
          case "$prev" in
            -c|--config)
              COMPREPLY=($(compgen -W "$environments" -- "$cur"))
              ;;
            *)
              if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$platforms -c --config --dry-run -q --quiet" -- "$cur"))
              else
                COMPREPLY=($(compgen -W "-c --config --dry-run -q --quiet" -- "$cur"))
              fi
              ;;
          esac
          ;;

        status)
          case "$prev" in
            -c|--config)
              COMPREPLY=($(compgen -W "$environments" -- "$cur"))
              ;;
            *)
              COMPREPLY=($(compgen -W "-c --config" -- "$cur"))
              ;;
          esac
          ;;

        run)
          case "$prev" in
            -c|--config)
              COMPREPLY=($(compgen -W "$environments" -- "$cur"))
              ;;
            *)
              if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "-c --config" -- "$cur"))
              else
                # Complete commands for 'run'
                COMPREPLY=($(compgen -c -- "$cur"))
              fi
              ;;
          esac
          ;;

        provision)
          if [[ $cword -eq 2 ]]; then
            COMPREPLY=($(compgen -W "$platforms" -- "$cur"))
          else
            local prov_platform="${words[2]}"
            case "$prov_platform" in
              neon)
                case "$prev" in
                  --name|--org|--region)
                    # No completion for these values
                    ;;
                  *)
                    COMPREPLY=($(compgen -W "--name --org --region" -- "$cur"))
                    ;;
                esac
                ;;
            esac
          fi
          ;;

        neon)
          if [[ $cword -eq 2 ]]; then
            COMPREPLY=($(compgen -W "branch migrate" -- "$cur"))
          else
            local neon_cmd="${words[2]}"
            case "$neon_cmd" in
              branch)
                if [[ $cword -eq 3 ]]; then
                  COMPREPLY=($(compgen -W "create delete list reset" -- "$cur"))
                fi
                ;;
              migrate)
                if [[ $cword -eq 3 ]]; then
                  COMPREPLY=($(compgen -W "up down status" -- "$cur"))
                fi
                ;;
            esac
          fi
          ;;

        hooks)
          if [[ $cword -eq 2 ]]; then
            COMPREPLY=($(compgen -W "install uninstall status" -- "$cur"))
          else
            local hooks_cmd="${words[2]}"
            case "$hooks_cmd" in
              install)
                case "$prev" in
                  --hook)
                    COMPREPLY=($(compgen -W "post-checkout post-merge all" -- "$cur"))
                    ;;
                  *)
                    COMPREPLY=($(compgen -W "-f --force --hook" -- "$cur"))
                    ;;
                esac
                ;;
              uninstall)
                case "$prev" in
                  --hook)
                    COMPREPLY=($(compgen -W "post-checkout post-merge all" -- "$cur"))
                    ;;
                  *)
                    COMPREPLY=($(compgen -W "--hook" -- "$cur"))
                    ;;
                esac
                ;;
            esac
          fi
          ;;

        webhook)
          if [[ $cword -eq 2 ]]; then
            COMPREPLY=($(compgen -W "serve handler info" -- "$cur"))
          else
            local webhook_cmd="${words[2]}"
            case "$webhook_cmd" in
              serve)
                case "$prev" in
                  -p|--port|-s|--secret|--platforms)
                    # No completion for these values
                    ;;
                  *)
                    COMPREPLY=($(compgen -W "-p --port -s --secret --platforms" -- "$cur"))
                    ;;
                esac
                ;;
              handler)
                case "$prev" in
                  --platform)
                    COMPREPLY=($(compgen -W "express cloudflare firebase" -- "$cur"))
                    ;;
                  *)
                    COMPREPLY=($(compgen -W "--platform" -- "$cur"))
                    ;;
                esac
                ;;
            esac
          fi
          ;;

        help)
          COMPREPLY=($(compgen -W "$commands" -- "$cur"))
          ;;
      esac
      ;;
  esac
}

complete -F _dcs_completions dcs
