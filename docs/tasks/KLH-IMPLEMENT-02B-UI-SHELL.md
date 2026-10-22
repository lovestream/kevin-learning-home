# KLH-IMPLEMENT-02B｜统一学习家园网页、登录体验与可扩展学科入口

> **正式签发：2026-10-22。任务状态：已获用户授权开始 02B 开发，但只限合成账户/数据；须提交独立 Draft PR，完成后停止等待 ChatGPT 复审。**
>
> 仓库：`lovestream/kevin-learning-home`。**唯一开发基线**：已合并 `main@f2c42c2475d0ae85c1688b13e437bc4332d12315`；[PR #6](https://github.com/lovestream/kevin-learning-home/pull/6) 已 merged。合并后真正 `push→main` 的 [GitHub Actions #39765830063](https://github.com/lovestream/kevin-learning-home/actions/runs/39765830063) 为 **completed/success**（同一 merge SHA；`node scripts/verify.ts`、Compose 1.28.5、Linux Docker 与证据上传均 success）。
>
> 2026-10-21 的总规划 [KLH-IMPLEMENT-02-AUTH-SHELL.md](KLH-IMPLEMENT-02-AUTH-SHELL.md) 是历史规格，02A 的开发门槛现已达成；本任务单明确**02B现在可以实现**。不得据此自动开启数学/英语完整复制、统一钱包、宠物或NAS生产。
>
> **用户长期刚性要求**：旧 `lovestream/math-learning`（数学）和 `lovestream/word-request`（英语）要始终能单独运行。今后整合时允许从冻结源版本**复制、独立适配**到新平台，不得因为 Kevin Learning Home 而修改、回写或替代两个旧站。本轮更不要复制课程/真实数据、使用 iframe 拼接或偷偷调用旧站的内部API。

## A. 本轮产品目标与非目标

本轮建设的是可以在 Mac、iPad、手机上使用的**学习家园外壳**：用户能打开首页、使用02A真实会话登录、看到本人角色下允许看的导航、进入学科占位页面、理解下一步功能将怎样接入。它不是假数据演示，也不是数学/英语集成成功的宣告。

**必须实现的用户流程**：
1. 未登录：打开品牌首页/登录页面；受保护区域明确要求登录，不能静默读取学习者信息。
2. 孩子以独立合成 `learner` 身份登录：进入自己的“今日学习/科目/复习/成长家园”入口，只有自己权限范围；数学/英语显示**待迁入**，没有真实课程/练习/复习/积分或虚构进度；不出现可用的家长管理功能。
3. 家长以合成 `parent` 身份登录：默认**锁定**，不显示孩子ID/名称/grant清单、私有报告或学习记录；明确提示需要二次解锁。二次输入密码后调用后端 `parent-unlock`；在有效的短时授权内，才可查看得到授权的孩子列表、切换当前可管理学习者及“家长报告暂无数据”页面；手动锁定/超时应即时隐藏。
4. 退出、重启/刷新、会话到期、密码重置/授权撤销、断网/恢复：界面要与服务端真实状态一致，不显示“已经保存、已经完成或已有余额”等未经核实的承诺。

**严格不做**：完整数学70课与思维教具、Word Quest Core 2000/真实词表与复习排程、历史记录导入、跨科积分与钱包、蛋仔成长逻辑、实际学习批阅、真实资源上传、物理iPad/NAS/Tailscale Serve/Funnel/公网部署、真实账号初始化/更改密码与生产HTTPS配置。以上留给后续分期任务。

## B. 开始前核查和工程边界

- 重新获取 `main` HEAD、PR #6 merged状态与最后`push→main` Actions #39765830063；如 main 已发生额外改动先比较，不根据过时SHA擅自覆盖代码。
- 必读：`apps/web/src/main.tsx`、`style.css`、`packages/subjects/index.ts`、`apps/server/http.ts`、`apps/server/auth-http.ts`、`packages/auth/service.ts`、`packages/contracts/auth.ts`、`docs/implementation/IMPLEMENT-02A-api-and-operations.md`、`docs/phase-0/04-unified-contracts.md`、`docs/ADR/0001-modular-monolith-and-migration-boundaries.md`、本文件。
- 在最新 `main` 创建单一开发分支 **`codex/implement-02b-shell`** 和指向`main`的 **Draft PR**；不要写入main或复用02A已合并分支，不能合并历史PR #1～#4。
- 复用已通过的 React/Vite + Node + SQLite 单体，不引入微服务/新的云认证/第三方托管服务、K8s、真实支付、Cloudflare 存储。增量schema v3原则上**不需要**：本轮只是UI与只读科目插槽；如有迫切需要，单独报告设计和回退证据，绝不可修改 001/002 既有schema或静默升级。
- 新服务的学习写操作依旧关闭；02A 后端身份接口`/api/v1/auth/login|session|logout|parent-unlock|parent-lock|rotate`和 `GET /api/v1/learners` 等权限语义不能被UI更改或弱化。前端隐藏页面≠服务端授权。
- 不变更已验收的scrypt、flock/异常恢复、WAL/FULL/FK、备份恢复和有界readiness；任何为UI确实必需的后端只读接口变更，必须使用02A真实session验证权限并增加负例测试，不放假角色header或测试身份到正式镜像。
- 保留`auth`默认禁用、生产要求明确HTTPS origin、host-only Secure/HttpOnly/SameSite=Strict cookie、Origin/CSRF规则。仅在独立合成测试服务中以显式本地开发loopback模式测试，不开启生产insecure HTTP或映射公网。
- `main` README仍提及02A Draft PR的历史状态；本PR可以在README增加一段准确02B说明并标注历史材料时点，但不能篡改曾经真实的批准/测试记录。

## C. 前端交互与信息架构

### C1. 页面、状态和视觉

至少具备这些清晰分区，允许用同一SPA路由实现：
- **未登录欢迎页/登录页**：简洁中文、支持键盘、响应式；登录名/密码输入、显示密码可控、正在登录按钮禁用、防重复提交、友好但不泄露帐号是否存在的401/422/429/503错误；避免UI出现有效默认账号提示；忘记密码只提示未来受控离线管理员流程，不做HTTP口令重置。
- **学习家园主界面**：顶部账号/角色/退出状态、今日学习与科目入口；目前没有课程时“暂无学习任务/尚未接入课程”，不能填虚构数值、星级、考试成绩、积分余额或连续学习天数。
- **今日计划**：只做空态与规划接口边界说明，当前不得产生“系统已自动安排复习、学习积分到账”的误导性内容；`GET`不得暗中写入任务或奖励。
- **学科中心**：数学/英语真实registry内容为`enabled:false,status:awaiting-migration`，用稳定`subjectId`和`contentVersion`设计未来插槽；可明确预留语文/科学等未来模块能力，但**不得渲染成已安装学科课程**。
- **复习入口**：没有已注册课程就展示空态/原因说明，不自行实现数学或英语复习算法。
- **家长中心/报告**：parent未解锁时不显示learner ID、姓名、授权关系、报告；解锁有效且存在grant后可选择learner，报告内容显示“尚未接入”而非伪报表。孩子对该路由（包括直接粘贴URL、浏览器后退、刷新）不能查看parent内容。
- **家园/成长主题**：只做风格和未来占位，不启用奖励或蛋仔养成账本；主题样式不应携带假的宠物拥有/成长进度数据。

设计风格沿用学习家园已有安静清晰的中文视觉基调，但要有更完整的一致性组件（导航、卡片、空态、反馈、加载、错误）。优先兼顾三年级学生能独立理解的中文文案与家长管理端信息密度，勿堆砌动画或自行抓取版权课件。布局在 390px 手机、768px iPad竖屏、1280px/1440px桌面下没有横向溢出、按钮触控目标与输入不重叠，适度可访问性（语义标签、标题顺序、表单label、焦点可见、键盘与屏幕阅读器）。

### C2. 会话与安全

- 使用02A的**真实后端**提供身份/session信息，不能在前端以 localStorage、硬编码`isAdmin`、QueryString、假cookie、Devtools状态来模拟权威授权。Cookie只由浏览器凭同源请求发送，**CSRF token仅保存于内存**，从 `GET /api/v1/auth/session` / login / 解锁 / 轮换返回的DTO中获取，不能落本地持久化或加入URL/日志。
- 应用首次加载与页面刷新要恢复已存在且有效的服务端session；401显示退出/重新登录、403显示无权/需要解锁、429显示限频、503显示服务暂时不可用；网络断开不能把已提交状态误显示为成功。错误不用展示后端栈、密码或私有认证细节。
- `parent`在锁定态只显示“家长锁定中/需要解锁”，**必须遵守02A的`learnerIds=[]`契约**；解锁后角色与grant仍须以服务端数据为准；解锁5分钟到期需及时刷新状态/隐藏敏感数据，切换learner前应重新验证有效授权；**不要在计时器中盲目延长parent unlock**。
- 失去网络时可能持有上次已解锁的数据：应清除或遮蔽敏感parent内容，提示待重新确认权限；离线不能把旧授权资料当实时可访问。logout/parent-lock/rotate需带准确Origin和当前CSRF，成功后替换session及CSRF；401/403之后及时清空前端缓存。
- 绝不能自行扩大 CORS、读取/信任 X-Role/X-Tailscale-User/X-Forwarded-For、通过`http://`在生产降级，也不能将密码回显到前端错误/console/Sentry。
- route fallback/刷新深链接需更新Node静态资源allowlist，路径要显式匹配/安全处理：不影响`/health/*`、`/api/v1/*`、`/assets/*`边界，也不得构造任意文件路径或扩大目录穿越攻击面。
- 不引入外部字体/分析SDK/广告/跟踪像素；保持默认CSP所允许的同源脚本/样式，若需CSP修改必须给出威胁评估与真实浏览器CSP测试。

### C3. 可扩展学科模块契约

- `packages/subjects` 保留简单的 subject registry，将`SubjectModule`的`getDue`、`getParentReport`、`listCourses`等未来接口定义为版本化**无运行时实现/可禁用适配器**。模块缺失/disabled时各自隔离，不应让全站登录、家园、未来其他学科出错。
- Math/English占位沿用 `math`/`english` 稳定ID，不引用真实旧repo打包路径、硬编码NAS真实IP、不调用原网站私有API、不用iframe合并；不要复制70节课程与Word Quest词库，也不要把用户真实答案导入新的SQLite。
- `contentVersion`与 `assetId` / media manifest是未来资源抽象，现阶段只给安全的UI占位/结构契约，不上载云媒体、不在React bundle中塞大图片/视频、不实现跨科奖励账本。
- 日后引入语文、科学、地理、物理、化学等新科目，只在subject注册和独立module增加实现；避免在中央auth、wallet或全站`switch(subjectId)`里硬编码所有课程规则。
- 某一科不可用/缺manifest/未部署时，正确显示具体空态并允许其他页面正常工作；默认数据为空，不合成一份“看起来像真的学习成绩”。

## D. 可执行验收矩阵（每项实际测试和证据）

| ID | 场景 | 最低验收标准 |
| --- | --- | --- |
| B01 | 最新基线与源隔离 | PR #6在main已merged、main CI真实SUCCESS、开发分支从其合并SHA创建；不更改旧数学英语 |
| B02 | 登录与真实session | React→Node真实`login/session/logout`走cookie，刷新仍取服务端session，退出后旧cookie与后退均无法访问 |
| B03 | child权限 | 只能看自身的可用入口与空态，直接打开家长URL及伪造role/header不能读家长私有信息 |
| B04 | parent锁定态 | login/session不暴露learnerId/label，显示仅解锁提示；parent列表/报告不可提前可见 |
| B05 | parent授权链 | 二次解锁→列授权learner→切换→revoke立即失效；lock/rotate/过期/重启回收权限，不展示缓存 |
| B06 | CSRF和传输配置 | 所有状态POST带Origin+当前session CSRF，loopback合成与正式HTTPS配置不能互相降级 |
| B07 | 错误与断网 | 401/403/429/503、离线/恢复/取消中、超时状态不误报已保存/已登录，密码不回显 |
| B08 | 家园首页和空计划 | 首页、今日计划、复习、报告/成长占位清晰；没有假学习记录、金币或连续天数，GET不写 |
| B09 | 学科注册表隔离 | math/english未启用时各自安全降级，未来SubjectModule接口类型可扩展，不改平台身份/账本 |
| B10 | 路由与静态安全 | `/login`、家长中心、学科deep link刷新可用；无目录穿越、API覆盖、CSP安全回退 |
| B11 | 窄屏/键盘/无障碍 | Chromium至少390px、768px、1280px/1440px，真实点击/Tab/Enter/焦点/aria错误反馈，无遮挡溢出 |
| B12 | 原02A与底座回归 | 原55 Node用例全部保留+新增02B安全/界面E2E；flock/SIGKILL/idle/CSRF/迁移/备份/readiness不退化 |
| B13 | Linux Docker及Compose | 正式非root readonly镜像、auth-enabled重启/恢复/媒体卷、Compose V1解析CI通过；无真实NAS |
| B14 | 真实SHA与CI | 最终Draft PR HEAD对应的push/PR CI全绿，JS/Node/Playwright与容器测试确实执行，不用只跑静态截图冒充 |
| B15 | 隔离与清理 | 合成测试身份、数据、证书临时文件受控清理；无真实账号/旧站写入；无NAS生产部署 |

**浏览器测试必须真实验证React+已实现的身份后端**，不是只在页面`mock`掉全部认证API或直接设置`isParent=true`来获得绿灯。允许用随机合成bootstrap账户的测试夹具，禁止将该夹具打入正式镜像、GitHub凭据、生产配置或发布网页。必要的组件隔离测试是补充，不可替代端到端安全验证。

请将`PASS_CI/PASS_LOCAL/NOT_RUN/FAIL/BLOCKED`与实际运行环境分开记录；Mac本地/现代Linux CI成功**不是NAS02B验收**。实体Safari/真实iPad、HTTPS代理与DS918+ 02A/02B合成部署另设后续授权关卡。

## E. 提交、审查与下一阶段停止线

在`codex/implement-02b-shell`创建**一个指向main的Draft PR**；当功能过多时可按提交逻辑拆分，但不可未经许可自行合并多个PR或直接推进新科目。

必须归档：
1. `docs/implementation/IMPLEMENT-02B-ui-architecture.md`：页面信息架构/角色状态机、SubjectModule边界、UI缓存/离线策略与家园空态设计。
2. `docs/implementation/IMPLEMENT-02B-security-review.md`：会话/CSRF、家长超时/撤销、授权缓存/直接URL、CSP/路由攻击面、没有真实凭据的证明。
3. `docs/implementation/IMPLEMENT-02B-execution-report.md`：B01–B15逐项结果、真实操作/屏幕规格、测试数量、基线HEAD、当前HEAD与最终Actions URL、失败历史和未验证项。
4. `docs/handoff/IMPLEMENT-02B.md` + 更新`docs/handoff/current.md`：设计差异、未迁入学科和真实数据、独立旧站边界、NAS/HTTPS后续需额外批准动作。
5. README只修改当前状态说明；历史`docs/tasks`和过去CI证据不可篡改。将本任务单完整来源与commit/SHA记录到交接。
6. 原55项Node、已有基础浏览器回归、auth-enabled容器恢复测试、真实新React E2E、GitHub Actions必须全绿。保存最新完整证据，失败项不可隐藏或通过删除回归测试求绿。

完成Draft PR、检查最终HEAD真实CI成功后**STOP**；下个动作由 ChatGPT 独立检查代码、页面可用性与报告。**本轮不允许Codex自动合并02B、不启动学科迁移、不在NAS常驻部署、不导入Kevin真实记录、不创建真实孩子/家长身份、不开公网或Tailscale Funnel。**

下一阶段建议另行讨论：数学与英语**分别**冻结来源复制适配，或者先进行NAS隔离的02B合成端到端真实设备验收。两条路线都必须保持原站独立工作，不以现在的空家园取代旧站。
