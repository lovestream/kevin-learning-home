#!/bin/zsh
cd -- "${0:A:h}" || exit 1
task_node="$(command -v node)"
[[ -x "$task_node" ]] || task_node=/usr/local/bin/node
[[ -x "$task_node" ]] || task_node=/opt/homebrew/bin/node
"$task_node" scripts/local/service.mjs stop
task_exit=$?
if (( task_exit != 0 )); then
  read '?停止失败。按回车关闭，错误信息见上方。'
fi
exit "$task_exit"
