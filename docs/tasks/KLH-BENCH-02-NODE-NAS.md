# KLH-BENCH-02｜Node.js + SQLite / NAS 自建路线可行性实测

**任务关系**：必须先读同分支 [BENCH-00公平比较协议](KLH-BENCH-00-COMPARISON.md)，并采用与 [BENCH-01 Cloudflare](KLH-BENCH-01-CLOUDFLARE.md) **同一份**学科fixture、接口语义、测试负载和报告口径。  
**路线目标**：量化保留原数学/英语 Node 或前端学习引擎的代码复用价值、NAS部署的真实运维成本、长期数据安全及扩展能力；不以“本地能跑Node”冒充“DS918+实机通过”。  
**现状**：PR #1 曾在现代Linux CI通过Node24+SQLite合成探针；2026-10-08 DS918+实机仅只读验证，Docker daemon无权限，NAS运行 `BLOCKED_PERMISSION`。不要把它说成内核导致Node无法运行。

## 1. 必读与来源

- 新仓库 main 的 `docs/phase-0/01～07`、`04-unified-contracts.md` 和 `06-phased-pr-plan.md`。
- 尚未合并的 PR #1 `codex/pr-1a-nas-runtime-probe`：`scripts/nas_preflight.py`、`scripts/run_sqlite_probe.py`、探针、CI、`docs/phase-1/PR-1A-nas-validation-report.md`、`docs/phase-1/PR-1A-runtime-decision.md`。
- 来源数学 `math-learning@8e9115442b3978eee0d4821750ce04f47954bd26`；来源英语 `word-request@d0b42a8872a7e87433b96770519203630223b6f2`。全部只读。
- 与Cloudflare侧一致，只用 synthetic learner，不读取候选 SQLite 和真实 .wordquest.json，不改旧仓库。

## 2. 应用实测（不能只复用旧的SQLite探针）

在`codex/bench-02-node-nas`分支建隔离`experiments/node/`原型，运行于受支持的现代Linux/Node24环境，提供一个实际可交互的数学题与英语拼写/复习流程，使用公共契约的端点、固定合成fixture，原规则源码引用/hashes可追溯。

- 尽量复用 math 原服务端逻辑/现有事务约束/家长批阅模型，英语提取后端可验证的判分和调度纯函数；不得重写一套过度简化“演示”然后声称旧代码100%复用。
- SQLite源记录/receipt/revision/合成wallet ledger写入使用真实`BEGIN IMMEDIATE`事务、WAL/FULL/FK/timeout并验证约束、并发冲突和幂等；在源代码和测试中保留学科奖金隔离。
- Parent/learner两种角色由服务端验证：阻止跨learner、学生提交伪造correct/coins、未经授权的批阅与恢复；会话/CSRF/cookie/Origin最小安全实现至少受限合成测试，不将“有 Tailscale”视作应用内授权。
- 两个客户端场景：同一时间提交旧revision、100次并发同commandId、同key不同body、断网保留离线command再同步；跟Cloudflare侧必须产生相同的最终数据库、事件数量、revision和409错误类别。
- 启动/关闭/容器删除重建后状态应保留；应用级备份使用SQLite backup/VACUUM INTO，不能仅复制可能存在WAL的主库。空目录/全新容器恢复后检验事件、receipt和媒资引用。
- 完成至少一个真实网页上数学题/英语题的E2E，Mac桌面/iPad视口；服务端source算法parity FAIL即禁止作为兼容性PASS。

## 3. 三种明确区分的执行环境

### 02A Mac / 现代 Linux CI（默认可执行）

Mac若是arm64，只记录本机结果；现代Linux CI需固定Node版本、SQLite版本、kernel、Docker/Compose，运行真实API、浏览器E2E及相同共享fixture。可以新建专用合成目录并删除自己创建的测试资源，不能触碰用户现有NAS、其它Docker容器。

在受支持Linux上测试：
- Node进程异常退出后自动重启/健康探针、应用服务重部署、持久化与权限；
- 本地测试合成DB随日志事件数增加的数据库/索引体积，10万事件的导入耗时、SQLite锁争用及读写延迟；
- 备份一致性、定期备份脚本、异地备份清单（默认仅生成本地模拟清单）、可恢复到新主机的完全无机密运行手册；
- 峰值CPU/内存、磁盘读取/写入、sqlite busy与并发、服务恢复时间；
- 是否真的需要常驻多个后台job；日志轮换/健康检查/安全更新预案；
- 10GB/100GB/1TB/10TB对象素材不需要实际创建，按文件数量、NAS硬盘扩容、备份倍率、家庭上行和电费做成本模型，**不可默认硬盘或电源永不损坏**。

### 02B DS918+ 只读实机预检（继续允许）

核验DS918+已有事实是否变化：DSM、kernel、CPU/RAM、ext4卷、Docker Client/Server权限、Compose V1、Tailscale和现有访问范围。复用已审查的只读预检脚本；不得公开私有IP/路径/用户名/容器命令或任何真实数据。

如现有非root用户仍无法连接Docker daemon，明确`BLOCKED_PERMISSION`并停在只读检查。**不通过sudo、改docker.sock权限、加docker/root特权组、chmod777、改容器服务或DSM安装新版工具来绕过。**

### 02C NAS 业务原型实机实测（**须新的明确授权**）

用户过去只批准 PR-1A 的隔离合成Docker测试；这个批准**不自动覆盖BENCH-02更完整的API/网页容器、端口、临时服务或数据卷**。先单独向用户给出最小变更/风险清单并取得明确许可，包括：
- 拟使用的专用测试父目录、保证不碰既有数据；
- 需要新建的一次性容器、端口绑定方式（默认127.0.0.1，不访问公网）、测试时长及资源配额；
- 对现有Docker权限的依赖。若无法在当前权限下执行，由用户决定是否重新授权安全运维方式；
- 预计清理的**仅本次**测试容器/目录，保留匿名数据的策略。

如权限未解决或没有新授权，NAS业务原型项一律标`BLOCKED_PERMISSION/BLOCKED_APPROVAL`，不将CI结果补到NAS列。

若用户许可且实际运行，记录`PASS_NAS`/明确失败归因；Linux kernel4.4比Node24官方glibc支持基线4.18低，成功运行也需要保留`RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL`的生产风险，不擅自升级DSM/内核。若在NAS仅Docker权限受阻，则不要宣称NAS不可长期使用，可同时估算“新Linux小主机+NAS备份”的C路线。

## 4. 媒体存储与长期恢复

- 创建与Cloudflare侧相同的`MediaAsset`元数据与manifest，课程引用assetId+version；磁盘路径/存储服务商只在适配层，不能在题库硬编码NAS路径。
- 允许合成公开图片/音频、私有模拟上传对象；用户隐私媒资不得公开访问。测试hash/大小/版本/权限/缓存/断链和资源切换后的引用不变。
- NAS主在线DB若存在必须为本地SQLite数据文件，**禁止在 SMB/NFS 网络挂载上直接运行WAL**。备份导入/导出与离线NAS对象库需原子、保留manifest及SHA验证。
- 云端异地备份可设计但未经许可不上传/创建账户资源。证明可以将数据库、课程manifest和私有媒体备份拷贝到一台**新的空环境**并按固定文件hash恢复。
- NAS故障/停电无法真正模拟时做故障注入与恢复流程桌面演练；不碰真实UPS电源、不开关真实主机、不拔硬盘。

## 5. 对比结果与验收

逐项执行 BENCH-00 P01–P16；按固定S/M规模+L成本模型与Cloudflare报告公平比较。额外记录：
- 复用数学/英语原代码的可量化范围（文件/核心函数/测试）、迁移改造风险；
- NAS日常维护项：备份、补丁、监控、容器更新、权限、磁盘故障、UPS、硬件换代与RTO/RPO，包含你个人时间成本；
- Mac/CI与NAS真机列绝不混写。所有失败和无证据项按原始退出码分类；
- 现有NAS直接部署与“现代Linux小主机+NAS存档”应给出两种运维/费用判断，不是合并一列说“NAS都能运行”。

## 6. 提交交接与停止

提交独立PR，交付：
1. `docs/benchmarks/BENCH-02-node-nas-report.md`：统一P01-P16矩阵、日志证据、原引擎parity、吞吐/时延/资源、已知阻塞/运行环境、精确SHA与CI；
2. `docs/benchmarks/BENCH-02-operations-and-recovery.md`：容器重启、数据与媒体备份、模拟灾难恢复、换NAS迁移、故障预案、RPO/RTO提案；
3. `docs/benchmarks/BENCH-02-hardware-cost-model.md`：旧NAS、现代Linux小主机、硬盘/UPS/维护与长期总成本，所有假设可更改；
4. `docs/handoff/BENCH-02.md`：分支PR链接、来源SHA、测试/CI、NAS权限状态、用户授权和无法完成的真机项目。

不要覆盖 PR #1 的`docs/handoff/current.md`，保持既有报告原样。PR提交后**暂停，不合并、不修改旧数学/英语、不导入真实用户数据、不继续PR-1B**；由ChatGPT读取两个BENCH报告后再给出部署选择建议。
