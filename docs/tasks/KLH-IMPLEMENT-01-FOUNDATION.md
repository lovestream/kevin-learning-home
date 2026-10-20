# KLH-IMPLEMENT-01｜NAS Docker 正式工程底座与原学科独立性保障

> 签发：ChatGPT · 2026-10-20  
> 状态：**已批准开始新仓库中的隔离开发；未授权生产部署、NAS 新写入、修改旧学科项目或真实数据迁移**。  
> 仓库：`lovestream/kevin-learning-home`  
> 任务分支：`chatgpt/klh-implement-01-foundation`；创建时 `main@46687ba370ca7e47764e500641bc371e2c0d4727`。开始前重新获取远端 HEAD/PR 状态并在报告中写清变化。  
> 本轮仅做：历史 PR 审核与选择性复用、可迁移的 Node/SQLite/React Docker 工程骨架、最小合成数据读写、数据库/媒体目录和可恢复备份、CI、文档。**不要在本轮搬入完整数学或英语课程、积分/宠物、真实数据。**

## A. 产品方向：用户本次确定的长期约束

1. 主要运行目标：**NAS Docker + Node.js + SQLite + React 的模块化单体**。现有 DS918+ 是可用但官方内核支持不足的过渡候选；未来换一台 NAS/现代 Linux 主机，目标是“还原备份 + 部署相同应用 + 更新访问入口”，不是重写科目代码。
2. 未来可增加大量科目、课件、图片、音频、视频。将计算、数据库、媒体、内容版本、备份各自隔离：课程引用稳定 `assetId` + `version`，不得在题库里硬编码 NAS 绝对路径。大媒体不进入 SQLite、镜像和前端 JS bundle。
3. **数学与英语的旧网站继续完全独立运行**：`lovestream/math-learning`、`lovestream/word-request` 原仓库、部署、数据、账户、域名/origin、测试流程不被本任务改动。未来经许可整合时从冻结 SHA **一次性复制源代码到新仓库并适配**，允许形成新仓库自己的后续改动；旧仓库不再被反向同步、覆盖、替换或变成运行时依赖。不得用 iframe 拼接冒充可信统一平台。
4. 旧网站现在仍是各自**真实学习记录的权威来源**；新平台在正式迁移前只使用合成数据，不同步/写回旧站，不把两个站的金币或XP相加。不以本轮 scaffold 成功表示数学/英语整合完成。
5. GitHub 只保存代码、课程定义、测试 fixture、媒体清单（不含私密链接）和脱敏审计报告。绝不能上传孩子的真实学习历史、家长 PIN、设备地址、token、七牛 AK/SK、NAS 账户信息。

## B. 先读文档、明确已有工作真实状态

主仓库必读：
- `docs/phase-0/README.md`、`01-baseline-and-verification.md`～`07-data-source-follow-up.md`；
- `docs/phase-0/04-unified-contracts.md`、`06-phased-pr-plan.md`；
- `docs/ADR/0001-modular-monolith-and-migration-boundaries.md`；
- 任务分支 `chatgpt/klh-scalable-architecture-rfc/docs/tasks/KLH-ARCH-02-Scalability-RFC.md`，**仅为未验收设计提案**，别误记为已定的对象存储方案。

现有未合并、相互有依赖的 PR：
- [PR #1](https://github.com/lovestream/kevin-learning-home/pull/1)：Node24/SQLite/NAS 探针，分支 `codex/pr-1a-nas-runtime-probe`，HEAD `98d22980c2b0d984fde7f7d507ca98173001beb4`；
- [PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)：共享契约、合成 fixture、原学科抽取及源哈希锁，分支 `codex/bench-shared-contract`，HEAD `398074ea72cea1b41cfc837f43d49009f159f8aa`；
- [PR #4](https://github.com/lovestream/kevin-learning-home/pull/4)：Node/SQLite 实验原型、Linux CI 与 DS918+ 2026-10-14 真机证据，分支 `codex/bench-02-node-nas`，HEAD `ca56951e0f4e3df841a129bee560abbeaa29acf2`，其 PR base 是 #2 的分支；
- [PR #3](https://github.com/lovestream/kevin-learning-home/pull/3)：Cloudflare/D1 实验，保留为研究资料，本轮**不并入正式 app/runtime**。

**提交前先更新远端 refs，并检查 PR #2/#4 base 关系。** 不能因为多个PR均CI绿就逐个点Merge；那会把实验代码、演示账号/假身份、未完成平台适配一起送入生产源码。

需产出文件级复用矩阵：
- `REUSE`：可迁入的原学科保真源锁、共同 fixture、通用契约、已验证 SQLite 命令 receipt/CAS/逻辑导出工具等；
- `REWRITE/ADAPT`：仅用于实验的 harness、临时启动器、SQLite/schema迁移整合、mock媒体/角色实现；
- `RESEARCH_ONLY`：Cloudflare分支、原型性能证据、NAS早期探针；
- `DROP_FROM_RUNTIME`：hardcoded synthetic password、调试绕过、临时账户、测试数据和远端敏感假设；
- `UNDECIDED`：必须列为审核问题，不得默认吞并。

数学候选冻结版 `math-learning@8e9115442b3978eee0d4821750ce04f47954bd26`；英语 `word-request@d0b42a8872a7e87433b96770519203630223b6f2`。上述来源版本只供**将来** migration PR 使用，本轮不复制完整课程，也不改原仓库。保留 #2 源码哈希锁/样本的必要测试资产时要附来源说明。

## C. 实现范围——一份能独立运行的最小骨架，而非完整平台

### C1. 工程结构

Codex 在 `main` 最新经核验 SHA 上创建开发分支 `codex/implement-01-foundation`，提交单一小 PR。建议按如下边界组织，可根据现有约束做合理调整并说明差异：

```text
apps/web/                   # React/Vite：学习家园空壳与未来学科入口（不迁移学科UI）
apps/server/                # Node API：健康、配置、合成状态/最小commands
packages/contracts/        # TS + 运行时schema/版本化错误契约
packages/platform/         # SQLite writer、migration、repository、事件/receipt
packages/media/            # 媒体manifest、内容哈希、local-storage适配接口
packages/subjects/         # subject registry接口/可禁用占位符；非旧课复制
infra/docker/              # 镜像/Compose 1.28.5兼容配置、env示例
scripts/                   # CI、合成seed、backup、restore、migrate、健康检查
tests/foundation/          # 单元、集成、容器和空库恢复
docs/implementation/       # 执行报告、运维/目录/迁移方案
docs/handoff/              # 当前交接
```

允许从共享 `experiments/shared` **精选**可复用文件并清晰保留其真实测试出处，但不要把整个 experiment 目录重命名为 `production`；不运行时读取旧仓库、GitHub、七牛或Cloudflare。

单入口统一origin设计，**暂不启用任何公开访问**。前端可以展示“数学待迁入”“英语待迁入”，但不能假装已保存实际进度。API `/health/live`、`/health/ready` 及安全的合成seed测试路径即可；若尚未完成真实身份验证，不应创建公开可访问的学习写入/家长管理端点。生产真实用户接口保持 feature flag disabled/拒绝访问，不能以固定测试密码凑数。

### C2. SQLite数据库与命令契约

- 主库放在本机已确认的本地文件系统专属 bind volume，不放 SMB/NFS（WAL 约束）；`WAL`、`synchronous=FULL`、`foreign_keys=ON`、`busy_timeout` 启动后回读，单writer、事务全回滚。
- 独立 schema migration 版本表；重复启动不重复执行；旧schema、未来schema、不兼容字段清晰报错，禁止静默清空/重建。
- 最小表：合成learner、科目/状态（revision）、不可变 learning_events、command_receipts、课程/媒体manifest版本及必要的审计/迁移元数据。未来wallet只做禁用接口/待审批schema设计，**不启用真实金币结算**。
- 使用 `docs/phase-0/04-unified-contracts.md` 的 `/api/v1`、`schemaVersion`、`contentVersion`、`commandId`、`expectedRevision`、`Idempotency-Key`、不同请求hash返回409、同请求重试不重复写、revision竞写冲突等语义。任何承接来的测试辅助身份只能在显式 `test` 环境启用、不能被编译成生产默认匿名写入入口。
- 两个设备不同session竞争写入仅接受一个；注入SQL末尾错误时 event/receipt/state共同回滚；后台重启后相同key返回原收据。禁止任何客户端自行指定 `correct`、`coins`、`trustLevel` 来改变权威状态。
- 从一开始禁止不断膨胀的单行无限JSON：最小版只需给出有界在线projection与不可变事件的可迁移schema方向，不以大重构为本轮目标。

### C3. NAS/现代Linux通用部署结构

- 一个模块化单体应用，可用一个 `app` 容器承载Node API和前端静态构建；未来的私网HTTPS反代可以单独部署，不为家庭项目引入微服务/K8s。
- Docker/Compose 配置必须能被当前NAS `docker-compose 1.28.5` 解析；另外可支持现代 `docker compose`。Node镜像明确 linux/amd64、固定版本与可核验digest；应用非root、只读rootfs、单独的 `/data` / `/media` 挂载及权限检查，健康检查、日志轮换、重启策略。
- NAS `Linux 4.4.180+` **低于 Node24 官方glibc x64支持基线4.18**。10月14日原型 `PASS_NAS` 只是当前版本可执行，不能写成获得官方支持；Docker旧内核下 CPU quota/PIDs 限制可能不生效，报告标明实际生效控制。不得因兼容问题自动升级 DSM、内核、Docker或Node大版本。
- 宿主只预留或提供**可配置**的路径变量，不写死 `/volume1` 或 `/volume2`：真实目录、UID/GID由后续单独授权与read-only preflight确定。保留部署到其他现代Linux/新NAS的同一份Compose/镜像/恢复流程。
- 默认仅本机/回环监听（或纯Docker内部桥接）；**不设置 Tailscale Serve/Funnel、不开放局域网或公网、不绑定正式域名、不生成可登录的生产默认父母账号**。应用本身的 parent grants、Origin、CSRF、secure cookie 交给后续独立安全PR，不能拿 Tailscale 身份代替家长权限。
- **本任务不授权 Codex 在 NAS 上新建生产目录、运行持久容器、变更Docker权限或使用sudo。** 可以在Mac/CI上测试，在 NAS 上只读检查。任何新的 NAS Docker 写入/部署操作，要先提出明确资源/目录/端口清单，请用户另行批准。

### C4. 媒体与内容：允许几十TB，但先用小样本

- 仅创建 `MediaAsset`/manifest接口和本地目录适配器：`assetId`、`version`、SHA256、MIME、size、private/public、来源/授权级别、logical storage key、contentRefs；实现安全路径校验（拒绝 `../`、软链接逃逸、绝对路径注入）、权限边界和小型合成文件的读取/校验。
- 图片/音频/视频不存 SQLite BLOB，也不打包进入每次升级的 app 镜像；静态应用bundle只保存少量UI固定资产。媒体体积扩大应主要增加独立 `media` volume，不增长业务容器镜像。
- 以后迁移到新NAS，只需复制媒体目录、验证manifest SHA并恢复DB的资源引用；为将来七牛/R2/S3提供薄存储接口，但**不要本轮实现云服务/上传密钥/在NAS装MinIO**。
- 正式课程内容采用 `subjectId/contentVersion` 与媒体manifest匹配；缺少媒体时报明确错误，不向孩子泄露用户私有资源。

### C5. 一致性备份、空机器恢复

- 将 `data`、`media`、`content`、`backup` 分为不同生命周期；备份工具支持合成数据下 SQLite backup / VACUUM INTO（不可简单复制活动WAL主库）、schema版本、媒体manifest/hash、恢复清单。
- **先定义一致性快照边界**：为备份冻结写入/建立一致checkpoint；数据库与media版本引用构成一套可恢复checkpoint。备份一半失败时应保持旧备份有效、不能标记success。
- 空目录恢复：新建空DB/媒体目录→导入schema/内容/媒体→逐表counts/hash、revision/event/receipt校验→健康检查；恢复错误不得覆盖原库；失败留原备份/原服务不受影响。
- 额外提供“换NAS/换Linux主机”的runbook，明确镜像/tag/digest、应用配置、bind mounts、UID/GID、HTTPS入口的可替换部分，制定未来NAS外独立备份计划；不要开启真正定时任务、上传七牛/R2或动现有真实资料。
- 现有 2026-10-14 NAS 实验测试容器和镜像**最后清理未经核实**：先只读核验是否仍残留；若发现资源，记录准确 owned-marker/容器ID/标签并向用户请求专门清理授权。禁止 `docker system prune`、删除无marker目录或改现有服务。

## D. 测试矩阵与验收——这轮必须做到、不能冒充的事项

| ID | 本轮验收项 | 必备证据 |
|---|---|---|
| F01 | 依赖/PR文件级审计：#1/#2/#4选择性复用，#3保留研究 | 文件矩阵、依赖图、原source SHA、哪些未合并 |
| F02 | `npm ci`/固定锁文件、React+Node最小启动 | 本地脚本与CI可复现 |
| F03 | Node SQLite migration幂等、WAL/FULL/FK、空库迁移与未来schema拒绝 | 自动化集成测试 |
| F04 | command receipt重复100次只一事件；同key换payload拒409 | 完整真实HTTP集成测试 |
| F05 | 两session旧revision竞争恰一成功；SQL异常全回滚 | 独立集成测试/数据库表hash |
| F06 | 进程重启后合成状态/receipt保留 | restart测试 |
| F07 | 非root容器删除重建后专用volume持久、read-only应用镜像 | 现代Linux CI（绝不冒充NAS） |
| F08 | 合成DB+媒体的完整一致性备份、空目录恢复、hash一致，损坏检测 | 无生产数据的恢复演练 |
| F09 | MediaAsset稳定ID/版本/hash、public/private、安全路径、provider可替换契约 | 自动化单元/集成测试 |
| F10 | 旧 math/word 两仓库 HEAD/文件与旧网站都未修改；未复制整站 | 源对照、声明与只读审计 |
| F11 | 生产路径无测试身份/固定密码/开放管理入口；未开NAS公网/Serve/Funnel | 静态审计、负例测试 |
| F12 | Compose V1配置校验、amd64镜像、健康检查、日志和错误权限行为 | 配置/CI与兼容说明 |
| F13 | 仍能在现代Linux/下一台NAS按相同镜像和数据包恢复（若仅现代Linux测试须标限定） | 可复现 runbook/CI |
| F14 | 当前PR HEAD CI全绿、最新SHA和测试数量对得上 | Actions URL、SHA与报告 |
| F15 | NAS实验残留只读盘点，未擅自清理或复用旧资源 | BLOCKED/NOT_RUN/无残留的真实证据 |

必须在报告中将各项目标为 `PASS_LOCAL`、`PASS_CI`、`PASS_NAS`、`FAIL`、`BLOCKED` 或 `NOT_RUN`。本任务不要求 NAS 写入，未执行NAS写入验收不能用 CI PASS 填充。至少增加最小浏览器smoke，确保导航到“数学/英语待集成”不会产生假记录。

## E. 提交产物、阶段关卡与 Stop

请在独立开发分支 `codex/implement-01-foundation` 创建 **一个 draft PR 指向当前 main**（不得把 #4 的 base 当成main、不得无审计跨PR merge）。如果需要借用PR #2代码，请按文件/固定SHA有选择地复制并附清单，不要仓促合并 #1/#2/#4。先自行解决与已经存在的同名路径/工作区冲突；不要 force push任何他人分支。

交付至新repo：
1. `docs/implementation/IMPLEMENT-01-adoption-matrix.md`：#1/#2/#4文件级处理意见/依赖，以及旧学科不受影响证明；含是否建议未来关闭/保留实验PR，但不自动关闭。
2. `docs/implementation/IMPLEMENT-01-architecture.md`：最终目录、模块边界、SQLite schema、media/内容版本、未来新NAS迁移、已知unsupported kernel及剩余ADR待决项。
3. `docs/implementation/IMPLEMENT-01-deployment-runbook.md`：Mac/CI运行与NAS部署**待授权步骤**、Compose V1兼容、目录与权限、私网入口待实施的关卡。
4. `docs/implementation/IMPLEMENT-01-backup-restore.md`：合成演练备份清单、hash与从空环境恢复、错误/回滚。
5. `docs/implementation/IMPLEMENT-01-execution-report.md`：具体变更文件、测试命令与通过数、环境、准确HEAD与CI链接、F01–F15矩阵、仍有的风险和 next PR建议。
6. `docs/handoff/IMPLEMENT-01.md`：任务文件来源、本次branch+HEAD、PR/CI/报告链接、未验证项、用户需要批准的动作；本轮不要覆盖 #1 的`docs/handoff/current.md`历史。
7. README增一段“正式 app 尚未整合学科、旧math/word独立运行、测试原型不生产可用”的准确说明。

本轮明确**禁止**：合并或关闭旧PR、动两个旧仓库、复制全部数学/英语课程、改真实旧记录、启用统一金币/蛋仔、设置真实家长账户、NAS正式部署、自动云备份、永久Docker提权或公网访问。  
完成draft PR、推送所有报告与最新CI后**STOP**，用户回复“Codex完成了”由ChatGPT再审；通过后优先独立完成生产认证/授权与正式shell，再分阶段复制适配数学、英语。未来数学与英语即使复制进新仓库，也必须保留各自原网站能继续单独运行这一能力。
