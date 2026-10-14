# BENCH-02 交接（等待ChatGPT复审）

草稿 [PR #4](https://github.com/lovestream/kevin-learning-home/pull/4)，分支 `codex/bench-02-node-nas`；共享基线 [PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)。不合并、不进入PR-1B、正式开发或生产。

[执行报告](../benchmarks/BENCH-02-node-nas-report.md)、[恢复与运维](../benchmarks/BENCH-02-operations-and-recovery.md)、[长期成本](../benchmarks/BENCH-02-hardware-cost-model.md)、[NAS核验](../benchmarks/results/node/nas-verification.json)。Mac完整本地执行SHA `50c5100c2d4680106557d6e9c8482e1aaeeccf25`，时间 `2026-10-14T12:34:11.226Z`。现代Linux完整CI `276526a212d10e5c9693c4dbc2378e025104640d`：[38559771381](https://github.com/lovestream/kevin-learning-home/actions/runs/38559771381)，含非root容器删除重建持久化。最新提交完整CI以PR checks为准，不替换旧执行SHA。

Math `8e9115442b3978eee0d4821750ce04f47954bd26`，English `d0b42a8872a7e87433b96770519203630223b6f2`；原算法/fixture锁不变，4组source parity。共同UI修复后双方完整本地回归通过。未修改旧仓库、读取真实记录或合并历史钱包；PR #1和 `docs/handoff/current.md` 保持原样。

NAS用户正式授权：一个非root合成容器、专用新目录、单逻辑CPU/512MiB、约1GB/30分钟、回环端口和临时SSH转发；sudo只用于本次Docker准备/检查/运行/删除，不更改权限或既有服务。只读先行，官方amd64归档校验后离线加载。后端SHA `c96e38ec0c30f282a16d91bb09c598d74314e6a7`，网页首次测试前仅更新共用UI修复，见前端来源JSON。真正DS918+独立SSH/Docker核验，业务/浏览器/恢复/1200样本负载 PASS_NAS；P15仍仅设计演练。内核4.4.180+低于Node24官方支持基线，PIDs限制未生效，标 RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL。

保留错误：Docker Hub EOF、CFS/NanoCPUs不支持、PIDs丢弃、结束后sudo过期。收尾需用户终端重新认证检查/删除本次资源；不能自行提权。NAS容器删除重建、真实断电/盘故障、物理Safari、M全量灾难恢复均NOT_RUN。现有Docker权限、DSM、Tailscale及服务不修改。

Cloudflare没有创建远端资源或订阅；现代Linux计算＋NAS备份仅候选模型。交ChatGPT选择后续验证，不自行进入下一阶段。

修复后完整CI PASS_CI：[38565357976](https://github.com/lovestream/kevin-learning-home/actions/runs/38565357976)，执行SHA `f5e7e97fdff4a340eeee60219d1e49396d554b5e`，ci/container-ci JSON已归档。
