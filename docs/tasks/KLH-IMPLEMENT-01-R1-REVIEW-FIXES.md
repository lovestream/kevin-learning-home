# KLH-IMPLEMENT-01-R1：第一阶段独立复审与合并前必修整改

> 2026-10-21，ChatGPT 独立检查 PR #5 \`codex/implement-01-foundation@038074ba33e736833ac5243521d642c5b8d64620\`。  
> **结论：工程底座的范围、代码与CI已基本达到第一阶段要求，但暂不批准合并。下列阻塞项修复并重测后再复审。**  
> 来源：\`lovestream/kevin-learning-home\`、[PR #5](https://github.com/lovestream/kevin-learning-home/pull/5)、任务 \`chatgpt/klh-implement-01-foundation/docs/tasks/KLH-IMPLEMENT-01-FOUNDATION.md\`。  
> 下一阶段任务：同分支的 [KLH-IMPLEMENT-02-AUTH-SHELL.md](KLH-IMPLEMENT-02-AUTH-SHELL.md)，**只是预备设计，R1通过且PR#5获得用户批准合并前不能开始代码实现**。

## 1. 已确认通过、不得回退

- PR #5 从 \`main@46687ba\` 独立开发；未合并 #1/#2/#3/#4 的实验代码或Cloudflare运行时依赖。
- \`apps/web\` React/Vite“数学待迁入/英语待迁入”空壳，生产学习/家长/API写入保持403关闭，不伪装已有课程和学习记录。
- Node/SQLite \`001-foundation.sql\`、11表、严格命令schema、幂等receipt、revision-CAS、不可变事件、WAL/FULL/foreign_keys、失败回滚、独立媒体manifest、离线检查点与空目录恢复。
- 最新提交 \`038074ba\` 对应 [GitHub Actions run 39517636432](https://github.com/lovestream/kevin-learning-home/actions/runs/39517636432) 成功；报告记录21项Node/3视口；现代Linux的容器删建及11表hash恢复通过，**不是NAS新平台实测**。
- \`math-learning\` / \`word-request\` 原站未被本PR修改；用户明确要求旧站继续**独立运行**，日后只通过冻结源复制到新repo并独立改造，不能反向同步。
- 2026-10-14历史NAS隔离实验已经经另一次用户许可定向清理，证据在 \`docs/implementation/evidence/nas-cleanup.json\`；不要二次清理、触摸其他Docker服务。
- 备份本阶段只覆盖合成小样本（1命令+38B媒体等），不承诺已验证多年数据、几TB视频、生产加密或在线备份。

## 2. 必须修复 R1-01：writer锁在非正常退出后的可靠恢复

**证据：** \`packages/platform/store.ts\` 以 \`openSync(.writer.lock, O_CREAT|O_EXCL)\` 排他创建；仅在 \`Store.close()\` 中 \`unlinkSync\`。\`apps/server/main.ts\` 只对SIGTERM/SIGINT清理，**SIGKILL、OOM、宿主断电**会留下文件；下一次容器restart/create时 \`Store\` 抛 \`WRITER_LOCKED_OR_UNWRITABLE\`。目前\`tests/foundation/restart.test.ts\`仅覆盖正常SIGTERM，不覆盖异常死机。

本轮目标：实现一个经过实际测试的**OS级互斥/可安全恢复的单writer所有权机制**；不能通过“看到.lock就rm”或者仅以旧PID不存在判断来不加验证地解锁，因为PID可复用、不同PID命名空间/容器可交错，误删活跃锁有潜在数据损坏风险。

要求：
1. 先明确设计比较：文件系统本机锁（如 \`flock\` / 合适的原生文件锁）+ 所有权生命周期，或其他可验证的单writer安全机制。确认 DS918+ / 容器实际具备所选机制的运行时/依赖能力；若暂时只能使用fail-closed人工恢复，明确这是**生产阻塞项**，不能标为异常退出自动恢复。
2. 真子进程写1条合成证据后 **SIGKILL**，由独立新进程重新打开同一DB并验证事件、receipt、revision、WAL完整；在Linux容器模拟容器 \`docker kill\` → 同卷重建并验证成功。
3. 双独立真实进程/容器同一data卷争抢，恰一进程取得写所有权；活跃拥有者不能被另一进程误驱逐。异常退出时不能把已提交事实丢失、制造重复授奖或损坏库。
4. 兼容CLI离线backup/restore独占边界，备份时不能和运行中的app同时写；若旧.lock版本迁移需要人工判定必须提供可验证操作手册和测试。
5. Docker \`restart: unless-stopped\` 与健康检查的实际恢复链路须解释并测试：Docker healthcheck标 unhealthy 不等于自动重启；关键应用进程必须正确exit以让重启策略工作；避免死循环。不得自动\`chmod777\`、改现有Docker socket、无限制\`rm\`。

验收：\`SIGTERM\`、\`SIGKILL\`、双实例、SQLite busy、容器kill/recreate、后台备份互斥矩阵全部明确PASS/FAIL/NOT_RUN，失败要保存合成证据和命令退出码。

## 3. 必须修复 R1-02：readiness不得20秒跑全库quick_check

**证据：** \`apps/server/http.ts\` 每次 GET \`/health/ready\` 都调用 \`store.verify()\`；\`packages/platform/store.ts\` 的 \`verify()\` 执行 \`PRAGMA quick_check\` + \`foreign_key_check\`；\`infra/docker/Dockerfile\` HEALTHCHECK 每20秒查询此端点。多年事件累积后会把深度数据库检查变成周期性全库工作。

要求：
1. 将 \`isReady()\`（常数级或有明确上界的轻量检查：基本SELECT 1、必要schema/runtime初始化状态、只读volume状态）与 \`verifyIntegrity()\`（quick_check/integrity_check/foreign_key_check与schema深度核验）分开；启动/迁移/管理员维护/离线备份或专项定期校验时执行后者。
2. \`/health/live\` 不查询大库，\`/health/ready\` 在10万或100万条合成事件下不做全表扫描，不经HTTP对外暴露深度检查接口。应增加检测调用次数/SQL监控或性能门限测试，避免只改名仍调用deep-check。
3. 重要逻辑故障仍返回非200 readiness，连接断开/数据库锁/无法打开确有检测；监控开销低，但不是永远返回200。
4. 每次部署/备份的完整检查仍保留且可复现。不要通过删掉完整性测试来换速度。

## 4. 复审过程中另需核查的风险（有缺陷就修，没缺陷须说明证据）

- **SQLite migration**：现有 \`schema_migrations\` + \`user_version\` 固定1，仅支持新空库。后续认证/learner真正上线前必须通过增量 v2 迁移；不能改写001文件使原库checksum漂移，不能删库“重建”。
- **真实身份没有实现**：\`learners.synthetic=1\`是刻意限制，不可将合成身份或\`NODE_ENV=test\`入口放开来推进第二阶段；保留生产所有学习/家长写接口关闭，直到Phase2安全PR验收。
- **备份边界**：离线冻结已验证，但真实长期服务、文件目录外部写入与密钥保管没有完成，不得把小样本归档标为生产可恢复。
- **独立原站的证据**：Git HEAD/worktree未变可验证，不代表旧网站HTTPS/DOM实际访问验收，避免超额宣称。
- **NAS新部署**：本轮仅Mac及现代Linux CI，没有新NAS运行许可；若要NAS Docker运行/修改权限/配置，必须先申请用户另行授权。DS918+ Linux4.4低于Node24官方支持基线。

## 5. 提交要求及停止线

只在 \`codex/implement-01-foundation\` 即 PR #5 上提交小范围整改，不新开学科整合PR、不变更已被其他流程使用的旧仓库。可增加 \`docs/implementation/IMPLEMENT-01-review-R1.md\`，列R1-01/02定位、修法与回归；更新 \`IMPLEMENT-01-execution-report.md\`、\`docs/handoff/IMPLEMENT-01.md\`。保留先前历史CI结果，增加新的正确版本SHA/CI运行链接；别修改过往记录以冒充已测结果。

最终必须：
- Node完整回归、Chromium三视口、现代Linux非root容器kill/restart/恢复、Compose V1校验及新异常路径测试全部绿；
- 最新HEAD的CI有可查运行记录，未测试的NAS仍标NOT_RUN；
- 没有涉及旧站真实数据、生产NAS、服务器权限和Cloudflare；
- **PR #5继续Draft且不得自动合并**，Codex完成后STOP，等用户通知ChatGPT复审；
- 第二阶段规格文件已发布，可提前阅读/提出问题，**不能在修复PR#5与用户批准之前开始IMPLEMENT-02代码。**
