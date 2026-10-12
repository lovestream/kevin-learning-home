# KLH-PR-1A｜NAS Node 24 / SQLite 隔离兼容验证任务书

> 签发：ChatGPT，2026-10-08。**仅授权在新项目仓库编写 PR-1A 相关代码、测试和文档；NAS 上创建容器、拉镜像或写入数据卷，须先取得用户明确同意。**
> 来源基准：`lovestream/kevin-learning-home@46687ba370ca7e47764e500641bc371e2c0d4727`；开始时先检查当前 HEAD、现有分支和本地未提交修改，避免重复开发。
> 本文件来自 `chatgpt/klh-pr-1a-task` 分支，只是任务指令，**不表示 PR-1A 已完成**。

## 一、先阅读 Phase 0 的全部结论

- `docs/phase-0/README.md`
- `docs/phase-0/01-baseline-and-verification.md` 至 `07-data-source-follow-up.md`
- `docs/ADR/0001-modular-monolith-and-migration-boundaries.md`
- `docs/reference/2026-10-08-architecture-brief.md`

特别注意：数学将来整合以 `math-learning@8e91154` 为优先基准（不是旧 main）；英语以 `word-request@d0b42a8` 为本轮冻结基准；真实 Word Quest 记录未来从用户的 V2 备份导入，当前不读取。数学有一份仍未确认为正式主记录的旧 SQLite 候选库，Phase 0 已在 Git 外私下备份；不要访问、升级、删除或错误标为正式主库。

## 二、明确本轮目标

只验证：Synology DS918+ / DSM 7.1.1 / Linux 4.4.180+ / x86_64 / Docker 20.10.3 / docker-compose V1.28.5，能否在隔离环境承载 Node.js 24、node:sqlite、WAL、事务、持久化和备份恢复。该 NAS 内核低于 Node 24 glibc linux-x64 官方支持基线 4.18：**实测通过也不等于官方支持**。

不进行数学或英语课程迁移，不构建全科 React 页面，不接入真实学习数据，不建立或合并统一金币，不部署生产服务，不启用 Tailscale Serve 或 Funnel。

## 三、允许和禁止

**允许：**在 `kevin-learning-home` 新分支开发隔离检查脚本、Docker 探针、合成测试、CI 和报告；在已获授权的计算环境做只读 NAS 检查；在 Mac/CI 使用完全合成数据运行。

**需要用户事先明确许可：**在 NAS 拉取镜像、创建专用测试目录、创建探针容器/卷或任何有写入副作用的操作。没有权限或未获许可时标记 `BLOCKED`，提供最小手动步骤，不擅自提权。

**禁止：**修改旧 math/word 仓库、启动/升级旧学习服务；修改 DSM、Docker、Tailscale 现有配置；操作现有容器/共享文件、使用 `docker system prune`、`--privileged`、挂载 docker.sock、`chmod 777`；映射 LAN/公网端口；提交 NAS 私有 IP/tailnet 域名、密钥、真实记录或私有 manifest。

## 四、代码交付

1. `scripts/nas-preflight.sh`：默认只读；提供 `--help`、`--json`；检测 CPU/内核、DSM、Docker Client/Server、socket 权限、Compose V1/V2、Tailscale 状态、文件系统和端口；精确区分 `PASS`/`FAIL`/`BLOCKED`/`NOT_RUN` 与权限错误。输出脱敏并标明检查时间、脚本版本和仓库提交 SHA。
2. `infra/probes/node-sqlite/`：最小 Dockerfile、`probe.mjs`、Compose V1 兼容文件、运行说明。镜像锁定具体 Node 24 版本和可核对的 image digest，目标 `linux/amd64`；**仅使用合成 learner 和合成事件**。
3. SQLite 测试：成功导入 `DatabaseSync`；设置并回读 WAL、FULL、foreign keys、busy_timeout；插入、提交、回滚、同 eventId 幂等、同ID不同负载冲突、断开重连、`integrity_check=ok`；使用 SQLite 一致性备份，从空目录恢复；容器删除重建后专用卷数据仍在。
4. 非 root 运行；数据卷只允许专属测试目录；不通过提权或 777 掩盖错误。合理资源/时间上限，探针不应长期驻留或监听对外端口。
5. 增加探针合成测试与 GitHub CI。GitHub runner 的通过状态和 NAS 真机实测结果必须严格区分；不可将 Mac 测试冒充 NAS 测试。
6. 评估替代执行路线：A NAS旧内核+glibc Node24，B musl/Alpine（实验性），C 现代Linux计算节点+NAS备份。未实测的路线不能写 PASS，未经用户批准不自行确定不受支持的生产方案。

## 五、必须记录的 15 项验收

| ID | 验收内容 |
|---|---|
| NAS-01 | Docker daemon 真正访问结果与错误类别 |
| NAS-02 | Compose V1 或兼容命令可解析 |
| NAS-03 | NAS 实机 Node24 linux/amd64 启动、具体镜像版本/摘要 |
| NAS-04 | node:sqlite 加载与 SQLite 版本 |
| NAS-05 | WAL/FULL/foreign_keys/busy_timeout 设置及回读 |
| NAS-06 | 事务、回滚、幂等、ID 载荷冲突 |
| NAS-07 | 进程重启后数据一致 |
| NAS-08 | 容器重建后专用卷数据持久 |
| NAS-09 | SQLite 一致性备份、空目录恢复与完整性校验 |
| NAS-10 | 不公开端口、不修改现有服务 |
| NAS-11 | 非 root 运行和宿主目录正确权限 |
| NAS-12 | 仓库、CI 与公开文档没有私人信息 |
| NAS-13 | Linux4.4低于 Node24 官方支持基线的风险保留 |
| NAS-14 | CI 和 NAS 实机证据分开、附确切 SHA |
| NAS-15 | 清理只涉及本 PR 明确创建的探针资源，不误删既有资产 |

每项必须填 `PASS`、`FAIL`、`BLOCKED` 或 `NOT_RUN`，写明证明、命令退出状态及不足。不能将未执行项目标为通过。

## 六、固定 GitHub 交接文档

创建并提交：

- `docs/phase-1/PR-1A-execution-report.md`：任务范围、所有改动文件、精确 SHA、实际环境、逐项命令与退出状态、15项验收、已知缺口、对 NAS 造成的具体影响、回滚清理、下一步待确认事项。
- `docs/phase-1/PR-1A-runtime-decision.md`：三种路线证据比较，明确 `RECOMMEND / CONDITIONAL / REJECT / PENDING_USER_DECISION`。不能据单次成功便称旧内核获得官方支持。
- `docs/handoff/current.md`：最新任务编号、来源任务路径、分支、HEAD SHA、PR URL、CI URL、报告路径、状态、已验证/未验证及阻塞事项、下一候选 PR（**未授权**）。
- `docs/handoff/README.md`：以后遵守“ChatGPT写GitHub Markdown任务文件 → 用户让Codex读取 → Codex按PR实施与提交执行报告 → ChatGPT直接审查GitHub → 通过再发布下一任务”，不能自己跨阶段推进。

## 七、提交方式与停机线

1. 任务位于 GitHub 分支 `chatgpt/klh-pr-1a-task` 的 `docs/tasks/KLH-PR-1A.md`。Codex 应先取得此任务文件；开发使用自己新建的 `codex/pr-1a-nas-runtime-probe` 分支，依据当前经核对的主分支与任务，不覆盖 ChatGPT 文档分支，不擅自修改旧 main。
2. 建立 PR 供审查（若缺写权限，至少推送开发分支）。每次 PR 明确链接本任务。
3. **PR-1A 完成后暂停，不合并、不进入 PR-1B**，直到用户把 GitHub 地址发回 ChatGPT 并由 ChatGPT 独立审查代码、报告、CI 和 NAS 结果。

最终回复提供：GitHub PR/分支 URL、确切 HEAD SHA、CI URL、`docs/handoff/current.md`、完整报告路径、NAS 实测状态及仍需要用户授权的事项。
