# IMPLEMENT-01 执行报告

> 2026-10-21 R1复审整改更新：以下原阶段记录及旧CI保持历史原貌；异常退出锁策略、当前健康检查与新增回归以 [R1整改报告](IMPLEMENT-01-review-R1.md) 为准。PR #5仍Draft，未获合并批准，IMPLEMENT-02未开始。

整理日2026-10-21（Asia/Shanghai）；实际测试时间以JSON中的UTC为准。**工程底座验收完成，等待ChatGPT独立审查；不是生产或学科整合验收。** 独立草稿 [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5)，分支 `codex/implement-01-foundation`，base为main。

## 基线、采用范围与旧项目保护

开始及提交前重新获取远端refs：main均为 `46687ba370ca7e47764e500641bc371e2c0d4727`。任务来自 `chatgpt/klh-implement-01-foundation@0a803e3418190aa1e875c91b2620c845275d9f14` 的 `docs/tasks/KLH-IMPLEMENT-01-FOUNDATION.md`，Git blob `6dae2898853fd11af1f6db21ab0ba5bd3376743c`，原样归档。本PR没有merge/cherry-pick #1/#2/#3/#4，只精确复制3份历史provenance JSON及按语义重做最小writer/命令/恢复。

PR #1 `98d22980c2b0d984fde7f7d507ca98173001beb4`；#2 `398074ea72cea1b41cfc837f43d49009f159f8aa`→main；#4 `ca56951e0f4e3df841a129bee560abbeaa29acf2`与#3 `7caecac7089536926eface6a054ac7dc009f5c81`→#2。四个旧PR保持open draft，没有关闭、合并、改base或force push。[文件采用矩阵](IMPLEMENT-01-adoption-matrix.md)逐项列出111个变更文件及完整SHA256。

旧数学本地HEAD `a7c05aaa8d9c5eabae4f3453807f830da1cbf279`、英语 `d0b42a8872a7e87433b96770519203630223b6f2`，本任务前后HEAD相同、跟踪文件干净。[独立性审计](evidence/source-independence.json)只用Git元数据，不读取真实DB/localStorage/词包/PIN；没改旧部署、账户、origin、测试或进程，也未访问旧站写接口。不将此声明冒充旧网站可用性/真实数据完整性测试。数学未来冻结来源仍为 `8e9115442b3978eee0d4821750ce04f47954bd26`，并不擅自改为最新HEAD。

## 具体实现与文件入口

| 边界 | 实现文件 | 行为与范围 |
| --- | --- | --- |
| React空壳 | apps/web/src/main.tsx、style.css、Vite配置 | 数学/英语待迁入、刷新/返回；无课程/进度/写请求 |
| Node HTTP | apps/server/main.ts、http.ts | 单origin、health/config、固定Host/CSP、默认回环；正式学习/家长/媒体API403禁用 |
| 合同 | packages/contracts/index.ts | TS+Zod严格版本与未知字段拒绝、规范hash/错误契约；仅合成reading cursor动作 |
| 科目注册 | packages/subjects/index.ts | 数学/英语均disabled，wallet仅禁用标识，无币/XP/宠物实现 |
| SQLite | packages/platform/store.ts、001-foundation.sql | 迁移版本/SQL/shape检查、单writer、WAL/FULL/FK/3000回读、receipt/CAS原子事务、有界投影、不可变event |
| 媒体/内容 | packages/media/local.ts | assetId/version、hash/MIME/许可/visibility、路径安全；薄本地接口，不实现云或上传 |
| 恢复 | packages/platform/checkpoint.ts、scripts/maintenance.ts | 离线冻结、VACUUM INTO、分块对象/hash、原子发布、新目标恢复、失败不覆盖 |
| 部署 | infra/docker/Dockerfile、compose.yml、env.example、scripts/healthcheck.ts | 固定amd64 base digest、非root/只读、多volume、V1解析、健康、日志/重启策略 |
| 验证 | tests/foundation、scripts/verify.ts、.github/workflows/foundation.yml | 真HTTP/重启/故障/恢复/浏览器及CI容器；test身份仅独立runner，未入镜像 |

生产入口即使NODE_ENV=test也拒绝启动；没有固定账号、密码、父母PIN、Tailscale身份授权、云凭据、公开管理接口或调试HTTP开关。合成seed需要明确CLI旗标和空库，synthetic.ts不进runtime。课程/媒体只在独立volume，镜像没有旧站源码、原媒体、真实DB或学习记录。

## 环境、完整测试和准确SHA

本地完整执行 `57fa26e7c163499a2cdf97bda789c9ea264e185d`，时间 `2026-10-20T23:46:28.296Z`，worktreeDirty=false；{"node": "v24.15.0", "os": "darwin", "arch": "arm64", "kernel": "27.0.0"}，npm11.12.1，SQLite3.51.3。类型检查、Vite构建、**21项Node测试（0失败/0跳过）和3个Chromium viewport**通过。[本地验证](evidence/local-verification.json)、[21项逐例结果](evidence/local-test-cases.json)、[网页](evidence/local-browser.json)、[恢复](evidence/local-recovery.json)。React19.3.1、Vite8.3.4、Zod4.6.7、TypeScript7.0.2、Playwright1.64.1及官方registry锁固定；[npm审计](evidence/npm-audit.json)当次0漏洞，不承诺未来无漏洞。

复现：`npm ci`、`npx playwright install chromium`、`node scripts/verify.ts`。脚本依次typecheck/build、Node JUnit、浏览器；记录真实HEAD，不把后续报告提交当作过去执行SHA。

CI完整成功 [39517183962](https://github.com/lovestream/kevin-learning-home/actions/runs/39517183962)，另一事件 [39517178297](https://github.com/lovestream/kevin-learning-home/actions/runs/39517178297) 同SHA成功。实际HEAD `57fa26e7c163499a2cdf97bda789c9ea264e185d`，{"node": "v24.15.0", "os": "linux", "arch": "x64", "kernel": "7.0.0-1017-azure"}，Docker Server28.0.4。Node21项、浏览器3尺寸、Compose1.28.5 binary校验/config、真实非root只读容器删/重建、全新host目录恢复后同镜像健康和11表hash均通过。[CI索引](evidence/ci-index.json)、[CI逐例结果](evidence/ci-test-cases.json)、[验证](evidence/ci-verification.json)、[容器](evidence/ci-container.json)、[Compose解析](evidence/ci-compose-v1.yml)、[恢复](evidence/ci-recovery.json)。

本次CI app image ID `sha256:8e5f20e0c1b70ce60d23191dba3d79b7c0075ba1996395ed84f62d76560043c9`（临时构建config ID，非registry manifest），测试后已清理；base的amd64 registry manifest digest另见部署手册。没有发布镜像、NAS新容器或远端云资源。这里的Linux kernel `7.0.0-1017-azure` **不是DS918+的4.4**。

最后报告归档提交会改变branch HEAD，但不改上述真实执行SHA。最终提交的精确HEAD与CI由 [PR #5最新检查](https://github.com/lovestream/kevin-learning-home/pull/5/checks) 和Actions artifact交叉核对；归档代码不变也会触发完整CI，最终全部绿色才交接。避免将旧CI截图冒充最后HEAD；PR说明同步最终SHA/CI，无需在文档里伪造包含自身提交hash。

## F01–F15 验收矩阵

| ID | 状态 | 直接证据及限定 |
| --- | --- | --- |
| F01 | PASS_LOCAL | 111个文件hash/类别矩阵、base依赖图；3个provenance精确复制，无整PR merge |
| F02 | PASS_LOCAL / PASS_CI | 官方registry npm ci锁、typecheck/Vite build/React与Node进程smoke |
| F03 | PASS_LOCAL / PASS_CI | 空库/重复migration、WAL/FULL/FK/busy_timeout回读、未来/legacy/增列/SQL checksum拒绝 |
| F04 | PASS_LOCAL / PASS_CI | 真HTTP100并发同命令恰1event/receipt；换body409；后续写后重放原结果+currentRevision |
| F05 | PASS_LOCAL / PASS_CI | 两独立随机test session同revision恰一成功；末尾NOT NULL SQL失败11表hash不变 |
| F06 | PASS_LOCAL / PASS_CI | 真子进程SIGTERM重启后state/原event/receipt保留；不是SIGKILL/掉电 |
| F07 | PASS_CI | 非root/只读rootfs、删容器重建、同专用data volume的11表hash保持；Mac Docker NOT_RUN，NAS底座 NOT_RUN |
| F08 | PASS_LOCAL / PASS_CI | 合成DB+38B媒体+173B课程manifest，冻结边界、VACUUM、新目录恢复；坏DB/媒体/路径/半备份均拒绝 |
| F09 | PASS_LOCAL / PASS_CI | manifest ID/version/hash/引用一致，public/private负例、traversal/软链接拒绝、本地root provider切换 |
| F10 | PASS_LOCAL | 原math/word前后HEAD与跟踪文件未变，无旧服务/数据/域名/账户操作；没有运行旧站全套测试或可用性验收 |
| F11 | PASS_LOCAL / PASS_CI | 生产学习/auth/parent/media全部403，伪造身份无效，native HTTP坏Host/Origin/跨learner拒绝；不等于真实认证已完成 |
| F12 | PASS_CI | Compose1.28.5官方binary SHA/config通过，amd64镜像、健康命令、只读/非root和错误UID拒绝；日志/重启为解析后设计参数 |
| F13 | PASS_CI | 同一镜像在新host目录恢复启动ready、event/receipt/revision及11表hash保持；只在现代Linux合成演练，非换真实NAS |
| F14 | PASS_CI | 实测SHA57fa26e、21 tests/3 viewports一致；归档后的最新HEAD另由PR checks最终验证 |
| F15 | PASS_NAS（仅旧实验收尾） | 最初只读盘点BLOCKED_PERMISSION；用户单独明确授权Docker核查/清理，完整ID/marker核验、exit0/no OOM、仅删owned容器/tag/目录；非新应用NAS部署 |

正式app的PASS_NAS均为NOT_RUN，未执行的真NAS底座/生产数据验收没有用CI填入。历史10月14日原型PASS_NAS不升级成正式平台验收。

## 备份与NAS收尾结果

合成库含11张表；本地独立SQLite快照102400bytes、媒体38bytes、版本内容manifest173bytes。详细逐表SHA/文件SHA在恢复JSON，恢复后revision1、事件/收据各1并保持原result，私密会话或真实数据均不存在。DB/对象哈希分块执行，不复制活动WAL主库。当前checkpoint最大manifest读取2MiB、单次小文件read限8MiB，大媒体交付/Range未实现，十TB/大规模灾备未测试。

旧实验仅在用户本次专门授权后收尾：容器完整ID `b669f0f3fe6b9265bc371b2bb635b5f6e3f0bad8cbfa3f53f081389992c4825b`、tag `klh-bench-node-nas:20261014-7ef8fd3a` 和owned-marker nonce匹配，终端sudo只用于这些Docker操作。回执确认running=false、exitCode=0、oomKilled=false、容器/tag不存在；随后普通用户仅删该marker匹配合成目录。[脱敏回执](evidence/nas-cleanup.json)。没有创建新NAS目录/容器、修改daemon权限、现有服务、DSM或Tailscale。

## 遇到的问题与修复

- Mac临时目录可能带系统/var→/private/var别名；测试先realpath专属临时root，保留runtime对软链接路径的拒绝，没有放松安全断言。
- 首版event INSERT占位符与6列不符，针对性事务测试暴露并修正，未删除回滚/幂等场景。
- 浏览器测试最初把aria-hidden装饰符号计入链接名而超时；改用真实可访问名称，保留点击、刷新、零写/零记录断言。
- 早期CI 39437630282/39437668057在容器构建失败，隐藏.evidence目录最初未被artifact收录，不能假称已取得当时完整日志；修复include-hidden-files和失败tail后，39516909851/39516914441定位`mkdir /media: File exists`，改为mkdir -p，未放开容器权限或删断言。
- 检查发现Node fetch不发送人为Host覆盖，改用原生node:http验证Host、容器回环探针与健康检查；新增坏Host/Origin/跨learner回归，避免“请求未发出却误报通过”。
- npm环境镜像源不提供audit端点；锁文件改为官方registry并再次npm ci校验integrity，官方npm audit为0。未改全局用户配置。

## 风险、后续关卡与停止

1. DS918+ kernel4.4.180+低于Node24 glibc官方>=4.18基线。CPU cpuset曾有效，CFS/PIDs限制缺失；本轮没有新底座NAS验证或部署，未来须新资源/目录/UID/端口/权限批准。
2. 生产认证/parent grants、CSRF/secure cookie/HTTPS/受信代理尚未实现，因此正式敏感API保持关闭；不要将当前占位站给孩子作为学习记录权威入口。
3. writer锁在正常SIGTERM后释放，SIGKILL/断电残留需管理员确认完全停机后处理；不提供自动清理陈旧锁或生产SLA。无真实UPS/坏盘测试。
4. 本地storage只证明当前安全路径与小样本；外部同UID恶意并发目录替换、真实云provider、媒体流式交付、超大manifest、M/L恢复/长时间运行都未验收。备份未加密/签名，不可据合成成功直接保存真实孩子资料。
5. 现代Linux/下一台amd64主机迁移runbook已提供；ARM/Android不能直接复用该amd64镜像，尚未测试。

下一PR建议先独立完成生产身份/授权和正式shell，再按固定SHA一次性复制数学、英语到新仓库适配；原网站持续独立，禁止反向修改。是否部署DS918+或现代Linux需单独审查。**停在本draft PR，等待ChatGPT审查；不合并任何PR、不自动进入下一阶段。**

## R1复审整改增补（2026-10-21）

已按R1任务在原PR #5替换writer所有权机制为稳定inode+内核flock，进程死亡后无需删除标记，旧v1须显式离线迁移；readiness改为最多6条固定SQL，保留启动/backup/restore深查与原001/schema1。原21项测试保留，新增9项真实进程竞争、SIGKILL、CLI互斥/迁移及10万合成事件readiness测试。完整矩阵、设计比较、失败CI、准确SHA与原生依赖边界见 [IMPLEMENT-01-review-R1.md](IMPLEMENT-01-review-R1.md)。

R1本地完整执行670f9591：30项Node、Chromium3视口、typecheck/build通过；[CI 39580937914](https://github.com/lovestream/kevin-learning-home/actions/runs/39580937914) 与 [39580930913](https://github.com/lovestream/kevin-learning-home/actions/runs/39580930913) 在 `68c3e26e42bde1684ddb59fcd6064b16e6ffeedc` 全部成功：Node30项、Chromium3视口、Compose1.28.5及完整非root容器强杀/重启/恢复通过。新的结果单独存于 [evidence/r1](evidence/r1/ci-index.json)，没有覆盖以上历史证据或将旧21项改成30项。最终文档HEAD另有完整CI，由[PR检查](https://github.com/lovestream/kevin-learning-home/pull/5/checks)及PR说明交叉核实。

上文旧限制3“SIGKILL残留锁需人工处理”由R1的v2 flock自动生命周期取代；只有旧v1/未知格式过渡仍需停机人工处置。Docker unhealthy本身不重启；应用死亡自动重启与人工kill后重建分别实测。NAS新底座、Node24/旧内核兼容性、真实断电/OOM和真实长期灾备仍NOT_RUN。原站只核Git元数据不等于站点可用性验收。未重做历史NAS清理，未部署NAS生产服务，未进入02A/02B。

## DS918+ NAS GATE后续验收（2026-10-21）

用户另行明确授权一次性专用镜像、容器和新合成目录。原R1时点的NAS NOT_RUN与CI记录保留；新任务、真实机证据及失败记录见 [NAS GATE报告](IMPLEMENT-01-NAS-GATE-report.md)。最终真机总体 **PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK**：G01正式Node24/SQLite/fs-ext已运行；G02～G05全部PASS_NAS。原30项回归在NAS全通过，实际SIGKILL后RestartCount=1，人工kill后同卷重建及正式镜像backup/restore通过，11表摘要/原收据/媒体content SHA保持。两个run的容器、镜像和目录均0残留，原8容器ID/启动时间/重启计数/状态不变。首次procfs探针失败已保留并仅适配测试定位，未修改系统/正式底座。Linux4.4仍低于Node24官方glibc支持基线；成功不是官方支持或生产部署批准。精确应用SHA8b80dce、控制器hash、版本、真实退出码和报告归档后的CI规则均见NAS报告。

这次未修改原应用、迁移001或原回归逻辑，未读取真实学习记录、反向修改旧项目、部署生产服务、修改NAS权限/daemon/DSM、合并PR或进入第二阶段。成功的短时测试不能替代官方支持基线、7天持续运行、真实灾备与身份安全验收。
