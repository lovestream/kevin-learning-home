# KLH-IMPLEMENT-02A-ACTIVATION｜第二阶段已获授权：账户、家长权限、SQLite v2

> **执行授权：2026-10-22，用户明确要求“合并进入第二阶段”。** ChatGPT 已通过 GitHub 将审查通过的 [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5) 正式合并：`main@87ec45e95809d00b7104242702fb28ffbb6f7881`，GitHub 返回 `merged=true`，随后重新获取 main 与 PR 状态核实。  
> **这份激活单替代原阶段任务书中“尚未授权开发”的旧时间点说明，其他技术与安全要求全部继续有效。**
> **本轮只授权 02A 代码开发与合成数据测试；不授权自动合并02A、启动02B、真实NAS部署、修改旧数学/英语网站或真实数据导入。**

## 0. 开工前必须读

1. **已合并在 main 的母任务**：[docs/tasks/KLH-IMPLEMENT-02-AUTH-SHELL.md](KLH-IMPLEMENT-02-AUTH-SHELL.md)，尤其PR-02A全部要求、测试矩阵、02B延期约束。
2. [R1独立复审](../reviews/KLH-IMPLEMENT-01-R1-ACCEPTANCE.md)及本轮NAS审查：[独立复审归档](https://github.com/lovestream/kevin-learning-home/blob/chatgpt/klh-implement-01-review-phase2/docs/reviews/KLH-IMPLEMENT-01-NAS-GATE-ACCEPTANCE.md)，[PR #5 真机执行报告](../implementation/IMPLEMENT-01-NAS-GATE-report.md)。
3. `docs/ADR/0001-modular-monolith-and-migration-boundaries.md`（仍为 Proposed；此次批准的是实施02A，不表示用户批准所有后续 ADR）。
4. `packages/platform/{store.ts,writer-lock.ts,001-foundation.sql,checkpoint.ts}`、`packages/contracts/index.ts`、`apps/server/http.ts`、`.github/workflows/foundation.yml` 和已有 `tests/foundation/`。
5. 开始前确认当前 `main` 的 SHA、PR #5 merged、CI基线及已有任务分支；**任何影响已验收底座的额外变更必须说明并单独测试**。

## 1. 开发分支、PR与任务边界

- 从已合并的 `main@87ec45e9`（如果main已变化，先记录并检查差异）创建新的 **`codex/implement-02a-auth`** 开发分支；**不直接在main开发**，创建一个指向main的 **Draft PR**。不得复用或变更已经合并的 `codex/implement-01-foundation`。
- 可优先按文件复制本任务书至新开发分支 `docs/tasks/KLH-IMPLEMENT-02A-ACTIVATION.md` 归档。主任务 `KLH-IMPLEMENT-02-AUTH-SHELL.md` 的历史日期保持原始版本；本单明确更新许可与合并的事实。
- 本轮建设“**后端正式安全能力 + 合成账号的测试链路**”：schema1→2、家长/学习者身份模型、登录会话、家长二次解锁、撤销与限频、CSRF/Origin、安全bootstrapCLI、家长-孩子授权、备份恢复。暂不做学科完整交互、登录UI/漂亮首页、真实父母/孩子账号、统一积分/蛋仔家园。
- **严禁修改** `lovestream/math-learning` 和 `lovestream/word-request` 的原仓库、运行容器、真实记录、配置、域名与账号。未来独立复制整合，旧项目仍可单独跑。
- **严禁** 新建/修改NAS长期容器、开放Tailscale Serve/Funnel或公网、改Docker daemon/管理员权限、导入Kevin真实记录、接入七牛/R2。代码开发与GitHub Actions合成环境可以执行，不必再因已有Codex sudo能力而尝试NAS生产部署。
- 本轮先完成02A Draft PR并**STOP等ChatGPT复审**，不得擅自进入02B、合并02A或签发真实上线凭证。

## 2. 首要实现清单

### A. Schema v2：真实增量迁移，禁止破坏v1

- 冻结 `001-foundation.sql` 及其旧 checksum、旧11表结构与11表数据；新增 `002-*.sql`，实现有版本迁移序列（及checksum）且数据库 `PRAGMA user_version`、`schema_migrations`与现有schema形状校验同步升级。不得重写001或直接清空老数据库。
- 认真处理 `learners.synthetic CHECK(synthetic=1)`：现在只有合成身份，设计v2如何允许未来经授权创建真实孩子，但本轮默认程序仍不应自动导入真实人。若需重建此表，执行 SQLite 安全表重建流程，保护外键、数据、事件不可变触发器、媒体/课程引用与每一张既有表；在迁移前后对合成v1旧快照做逐表count/hash、事件、receipt、revision与media hash核验。
- 对一个`v1真实存在的合成数据库`执行真实升级，重复执行不重复迁移，异常/中断/损坏时失败可诊断、备份可恢复；未来未知schema拒绝，而不是重置库。
- 注意旧checkpoint恢复机制仅接受SCHEMA_VERSION=1、旧image不能写v2DB：升级前使用经验证的v1一致性checkpoint；v2备份恢复需要版本升级/隔离恢复策略。不能宣称升级后可直接用旧镜像打开v2库；回退必须恢复升级前checkpoint到空环境并保留升级后新增事件。

### B. 服务端身份、授权与会话

- 清楚区分`actor`、`learner`、`parent`和`learner_grant`：身份由服务器从已验证会话派生，不能信任客户端提交的role/learnerId、URL隐藏、`X-Role`、`X-Tailscale-User`等header。
- 至少实现`actors`、`learner_grants`、`auth_sessions`、登录失败限频、提升权限/撤销等有明确来源和迁移的表；必要时采用独立关系表，不把整套身份状态塞进一个无界JSON字段。
- 强随机 session/token，服务端只保留安全哈希/摘要、限制有效期、闲置期、轮换、撤销和跨设备退出；重启后授权状态可重建。需选择并记录令牌哈希/密钥管理方式，避免 cookie 或明文PIN/密码进入日志、URL、GitHub、媒体清单、数据库备份说明的明文示例。
- 家长bootstrap只通过受控本机交互式CLI/显式批准的离线过程初始化；绝不能有“首个访问者成为管理员”的 HTTP onboarding 后门。哈希口令使用随机salt与可靠慢哈希（Node scrypt 或经审计库），具备明确参数与版本；不会通过测试环境变量向生产注入固定口令。
- 家长解锁`parent-unlock`设置有限有效期，必须二次验证；退出、超时、密钥轮换、凭证重置后撤销，孩子角色不能调用管理接口。避免仅凭孩子知道设备/浏览器就自动具备父母权限。
- 生产 `Secure; HttpOnly; SameSite=Strict` cookie、CSRF + Origin/Host 校验、固定可信HTTPS origin，受测的本地 loopback HTTP 开发模式独立隔离，不能在生产默认关闭安全选项。显式处理CSRF双重提交和同步token选择、session fixation、重放、跨learner和代理头伪造。
- 登录错误与限频不能泄露真实用户名是否存在，拒绝暴力破解，允许安全注销和恢复；不允许将原学习API的测试身份注入生产HTTP。
- `/api/v1/auth/login|session|logout|parent-unlock|parent-lock` + `/api/v1/learners` 与Phase0契约对齐。若实际未交付某个端点，必须继续返回403/FEATURE_DISABLED，不能返回假成功。
- 即使家长已登录，本阶段仍不得开放真实批阅、旧英语词库、媒体私密发布或积分/钱包，直到各自独立PR通过。

### C. 可移植运行、备份与故障隔离

- 保持现有 `Store` 的 `flock` 单writer、SIGKILL后恢复、bounded readiness（不能重新引入周期性quick_check）、WAL/FULL/FK、CAS、100并发重复收据的回归全部通过。
- Schema v2 新增认证敏感表后更新checkpoint的表清单/schema/version，做**停写后一致性备份/全新空环境恢复**，保留事务与grant/session撤销的有效性、校验所有媒体/content引用。明确恢复后会话保持还是失效，并以安全默认行为验证；加密密钥如何单独备份是**设计任务**，不创建真实账号和密钥。
- Docker 非root、readonly rootfs、专属卷、Compose V1.28.5解析、受控本地启动不退步。更换新NAS/现代Linux时无需重新实现身份策略；当前旧内核 Node24 官方支持风险仍需记录，不因之前一次NAS测试而消失。
- 不引入微服务、单独用户服务或外部云登录依赖；保持家庭可维护的模块化单体。

## 3. 验收测试矩阵（02A每条提供具体证据）

| ID | 要求 |
| --- | --- |
| A01 | v1小库+已有事件/receipt/媒体→v2保真升级、schema checksum不变、迁移重复执行无副作用、未知版本拒绝；11个旧表逻辑数据对账。 |
| A02 | 迁移中间故障可安全回滚或以升级前一致checkpoint恢复到新空目录；绝不删除原事件或把v2库直接给v1镜像写。 |
| A03 | bootstrapCLI仅本机显式执行；生产HTTP注册不允许未授权成为parent；错误或中断不泄露密码/哈希。 |
| A04 | 正确账号登录、会话持久/过期/撤销/轮换，强随机token哈希存储；重启不恢复已注销会话。 |
| A05 | 真实HTTP层的learner及parent授权，跨learner越权、伪造role/Tailscale头、错误角色访问都被拒绝。 |
| A06 | parent二次解锁、自动到期/主动锁定，孩子端无法自行提升权限。 |
| A07 | CSRF/Origin/Host/Cookie配置的有效场景与负例，loopback开发不导致正式生产降级。 |
| A08 | 持续限频/防爆破，错误账号不泄露身份存在性，无明文credential/token进入日志或测试报告。 |
| A09 | 含身份表的v2一致性备份/空环境恢复、学习事件/media/hash/旧receipt全部保真。 |
| A10 | 旧30项+新增身份安全测试、容器restart/SIGKILL、flock、健康检查、有界SQL全部PASS。 |
| A11 | GitHub PR CI包含`02A`新测试，而不仅运行旧`foundation`测试；精确最终HEAD、失败历史和CI链接可查。 |
| A12 | 旧`math-learning`/`word-request`仓库、NAS现有服务及Kevin真实数据未变；仍无真实上线和真实用户凭据。 |

全部用**合成账户、随机合成凭据、合成数据**。可以模拟未来的合法父母-孩子关系，但不能上传或读取真实家庭个人资料。测试身份/秘密不能进入正式镜像或 README 示例里的有效默认参数。

## 4. 交付与停止线

请新建 Draft PR（建议名称：`KLH-IMPLEMENT-02A: authenticated family roles and SQLite v2 migration`）并提交：
1. `docs/implementation/IMPLEMENT-02A-auth-threat-model.md`：账户、会话、cookie、parent提升权限、CSRF/Origin、攻击面与恢复策略；
2. `docs/implementation/IMPLEMENT-02A-migration-report.md`：旧schema/data逐表对账、故障中止、回退/恢复演练；
3. `docs/implementation/IMPLEMENT-02A-execution-report.md`：A01～A12逐条`PASS_LOCAL/PASS_CI/NOT_RUN/FAIL`，精确HEAD及最终CI；
4. `docs/handoff/IMPLEMENT-02A.md` 与 `docs/handoff/current.md`：真正完成的内容、未验证或等待用户批准的事项，勿将`02B`标完成；
5. 02A后端接口/模块schema/受控bootstrap/安全会话/测试与CI更新，原则上各阶段文件清楚分组且代码可审计。

**必须停止在02A Draft PR与完整CI**。ChatGPT再次独立复审之后，才讨论是否批准合并并开展 `02B` 前端首页、学科入口、家长界面。若遇到真正需要用户决策的安全/产品取舍，在报告给出候选及默认方案，但不要以此为由自动降级安全。

## 合并事实与本次生效说明

本任务是 **2026-10-22 用户明确批准后发行的 02A 激活单**，而 [旧的02总体规划](KLH-IMPLEMENT-02-AUTH-SHELL.md) 文中“尚未授权”的提示仅代表2026-10-21时点。合并后main SHA `87ec45e9` 已经确认；目前不要求再让用户批准“进入第二阶段”，可以立即从main开02A开发PR。
