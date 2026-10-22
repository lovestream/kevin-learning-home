# IMPLEMENT-02A 执行与验收报告

> 2026-10-22 R1更新：原53项与下列首次交付CI证据保持原样；当前整改、55项完整回归和新CI见[02A R1报告](IMPLEMENT-02A-review-R1.md)。已修正锁定parent的learnerIds暴露并为main push配置完整CI；main实际合并后运行尚未执行，本轮不合并。

> R1实现HEAD `4bb58d4868480d7cc18b76486e8eb9f01b3a4be8` 的[PR CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39706006427)与[push CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39706002116)均SUCCESS，55项及完整Linux镜像验证已归档[R1证据](evidence/02a-r1/README.md)。最后归档HEAD/checks在PR6正文；下列53项结果继续仅代表初次交付。

2026-10-22。本轮已获用户明确授权，从最新 main `87ec45e95809d00b7104242702fb28ffbb6f7881` 建立 `codex/implement-02a-auth`；PR #5 已在 00:11:11Z 合并。没有修改原 foundation 开发分支或 main。只提交独立 Draft PR，等待 ChatGPT 审查，不合并、不进入02B。

## 任务来源与实际交付

激活单来自 `chatgpt/klh-implement-02a-start@ea92a968a79a1ba3197fc21e542f86702e0d3dd1`，Git blob `7794eb8ee76f75dac941b0e14c3901dcaf5842fa`；母任务保持 main 原文，blob `99bc416a011bc53e43bf346fd328a5faf8c6ce5a`。归档 R1 与 NAS 独立审查原文（分别 blob `b7e3d384484e5cf15f1d6543ae4b042241d1200d`、`ec2ddde691fe6a04ebf9954feed0911c6078f2de`），不把历史待批准说明改写成现在的限制，也不把02A批准视为批准所有后续ADR。

实现增量 SQLite v2、actor/learner/grant、离线合成bootstrap、慢哈希、持久安全会话、家长二次认证、CSRF/Host/Origin、限频、撤销与安全备份恢复。没有课程迁移、统一钱包、登录UI、真实账户、真实数据或NAS生产配置。

设计和审查入口：[威胁模型](IMPLEMENT-02A-auth-threat-model.md)、[迁移报告](IMPLEMENT-02A-migration-report.md)、[后端契约与运行设计](IMPLEMENT-02A-api-and-operations.md)、[证据索引](evidence/02a/README.md)、[交接](../handoff/IMPLEMENT-02A.md)。

## 验收矩阵

PASS_LOCAL 表示本机实际执行，PASS_CI 表示现代 Linux Actions 实际执行，NOT_RUN 不是通过。本地及首轮GitHub CI均通过53项Node测试（旧30+新23）、typecheck/build、3个Chromium视口；Linux正式镜像与Compose也通过。最终 CI/精确 HEAD 在下方证据段及 Draft PR 的 immutable run 链接核对，不能用基线 SHA 冒充02A测试提交。

| ID | 当前结果 | 实际证据 |
| --- | --- | --- |
| A01 | PASS_LOCAL / PASS_CI | 冻结main旧runtime创建真实磁盘v1，旧10数据表count/hash一致，metadata旧row1相同，仅row2增量；001字节不变，重复迁移/未知版本负例 |
| A02 | PASS_LOCAL / PASS_CI | 事务中抛错、子进程SIGKILL，旧runtime恢复v1；升级前checkpoint到新空目录回退；旧runtime拒绝v2 |
| A03 | PASS_LOCAL / PASS_CI | 真实PTY bootstrap与取消不回显，非TTY拒绝；HTTP首访register/bootstrap/learner创建均不授权parent |
| A04 | PASS_LOCAL / PASS_CI | 真实HTTP登录、哈希持久、轮换、闲置/绝对到期、跨设备注销；真实子进程SIGKILL后有效会话保持、注销不复活 |
| A05 | PASS_LOCAL / PASS_CI | child自身scope、跨learner403、parent解锁和grant撤销、伪造role/Tailscale头、敏感未实现API403 |
| A06 | PASS_LOCAL / PASS_CI | parent再次验证、5分钟到期/主动锁定、child403、凭据重置/epoch轮换、旧cookie失效 |
| A07 | PASS_LOCAL / PASS_CI | 真实TLS信任临时证书验证Secure/HttpOnly/Strict/host-only；Origin/Host/CSRF/重复cookie/固定cookie/正式main拒HTTP容器降级 |
| A08 | PASS_LOCAL / PASS_CI | 同错误已知/未知/损坏凭据、持久限频跨重启、KDF最多2、私有目录、无明文身份秘密归档 |
| A09 | PASS_LOCAL / PASS_CI | v2身份/凭据版本/grants保真；学习事件/receipt/media保真；恢复旧session及elevation全部撤销 |
| A10 | PASS_LOCAL / PASS_CI | 旧30断言保留，新23项；100k事件ready仍6条SQL、live0SQL；Docker kill/restart与auth启用恢复已在Linux CI通过 |
| A11 | PASS_LOCAL / PASS_CI | workflow包含4个新auth测试文件和auth镜像验证，checkout精确head及完整历史，JUnit应53项；精确实现HEAD及首轮结果已归档，最终归档HEAD由PR6正文/checks定位 |
| A12 | PASS_LOCAL（代码/动作范围） | 旧仓库只读Git元数据前后核对，不读真实数据；未连接NAS、未运行其Docker/SSH、未创建真实账号 |

NAS02A、正式HTTPS入口、实体iPad/Mac身份UI、真实账户与生产部署均 NOT_RUN，且本轮未授权。现代Linux通过不能消除 DS918+ Linux4.4 的 Node24 官方支持风险。

## 回归与失败历史

原30项继续保留。只适配 readiness 未知版本值（2已是合法版本，改99并恢复2）与符号链接锁测试夹具私有目录700；没有删测试或放宽核心锁/完整性/收据断言。公共变更采用与必要性见运行设计。

本地开发阶段实际失败及修复：初次smoke发现session INSERT列数不符，修正为11列；第一批15个新用例有3个夹具错误（连接复用导致重启后ECONNRESET、undefined Origin请求头构造），改为agent:false及省略缺失头后复测通过。增加首访用例发现未实现learner写入返回405，改为403/FEATURE_DISABLED。全量回归发现新增私有目录检查先于原符号链接锁断言，修正夹具创建mode700后原断言通过。清理import时一次typecheck缺SCHEMA_VERSION，恢复必要import。一次shell日志包装使用zsh保留变量status中止了输出读取，改用task_exit；未影响数据/权限。进一步审计修复了超过一分钟后的会话轮换/撤销与idle-touch嵌套事务问题，新增回归；另修正Compose默认空AUTH_ORIGIN使healthcheck URL无效的问题，镜像测试显式覆盖空值。最终全量和CI状态独立记录，不把开发中失败隐藏为首轮全通过。

所有测试凭据由测试进程随机生成、只存在临时目录/内存；不提交数据库、session bearer/CSRF、密码hash单行、测试证书私钥、PTY原始捕获。公开证据只含断言、计数、合成整表摘要、工具版本、精确代码SHA和CI链接。

## CI 与归档状态

已创建 [Draft PR #6](https://github.com/lovestream/kevin-learning-home/pull/6)。首轮精确实现提交 `8e7a9bdfb64bb40a31dd08b62366fe5c01eb17a5` 的 [PR CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39702101580) 与 [push CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39702076108) 均为 success；53项Node/3视口、Compose1.28.5、non-root readonly正式镜像、flock竞争、Node进程SIGKILL后Docker自动重启（RestartCount=1）、volume重建/恢复，以及启用auth的会话持久/注销/恢复撤销均通过。100k事件ready仍6条SQL、live0条SQL，实测环境Node24.15.0/linux-x64/kernel6.17.0-1022-azure。原始artifact已下载并核对 `executedHeadSha` 与 `worktreeDirty=false`；长期安全摘要在[ci/run.json](evidence/02a/ci/run.json)、[全部用例](evidence/02a/ci/test-cases.json)、[auth镜像证据](evidence/02a/ci/auth-container.json)、[原容器证据](evidence/02a/ci/container.json)。本轮CI没有失败；Actions给出旧action metadata声明Node20但强制Node24执行的非阻塞提示，应用实际运行版本为24.15.0，未借此变更底座依赖。提交过程分为实现提交及证据归档提交；文档无法包含自己的提交SHA，**最终归档提交本身的精确HEAD与最后一轮checks链接以[Draft PR #6正文](https://github.com/lovestream/kevin-learning-home/pull/6)为准**，Actions内生成的 verification.json.executedHeadSha 必须与其一致且 worktreeDirty=false。归档的首轮结果必须明确其实际执行SHA；最后一轮运行验证整个归档提交，不能只检查父提交绿灯。

基线PR5 CI为历史背景，不计02A通过。workflow 名为 IMPLEMENT-02A auth and foundation；继续跑静态NAS探针语法检查（无NAS连接）、Compose1.28.5校验和验证、生产镜像构建/隔离/杀进程自动重启/备份恢复，新增auth启用的生产镜像重启/注销/恢复撤销验证。PR保持Draft供独立审查。

## 停止线

只完成02A后端与合成证据。未合并、未开始02B、未配置生产TLS/凭证、未部署NAS、未迁入任何真实学习记录、未反向修改数学/英语。下一动作是ChatGPT独立复审；收到新的明确指令前不继续开发阶段。
