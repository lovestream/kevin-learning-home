# KLH-IMPLEMENT-02｜第二阶段：正式身份权限与学习家园入口

> 2026-10-21 · **预发布任务书，尚未授权立即开发。**  
> 关联：必须先完成并通过 [第一阶段R1修复](KLH-IMPLEMENT-01-R1-REVIEW-FIXES.md)，由ChatGPT复审\`PR #5\`，用户批准后再按明确的合并顺序将底座送入main，**此后**从main HEAD创建第二阶段开发分支。  
> 本阶段目标：建立可供未来学科模块使用的、真正受服务端控制的家庭身份/家长权限/学习家园导航。**不整合真实数学或英语课程、历史数据，不上NAS生产、不合并金币/宠物。**
> 学习家园依然采用可更换NAS的 \`React + Node.js + SQLite + Docker\` 模块化单体。

## 0. 强制进入条件

- \`codex/implement-01-foundation\` PR #5 的R1-01（SIGKILL后可安全恢复writer独占）和R1-02（readiness不做周期性full scan）经真实CI与ChatGPT独立复审通过；未经家长批准不得合并。
- PR #5 若仍是Draft/open，**第二阶段只能研究与设计，不提交实现**。不要对\`main@46687ba\`空文档基线“假装已具备正式底座”，更不能直接合并 #1～#4 研究PR。
- 开发开始时记录经过家长确认的PR #5 合并commit SHA、main SHA、Node/依赖及测试基线。为第二阶段使用两份小PR、分步合并，防止一次性回归难定位。
- 旧 \`math-learning\` 和 \`word-request\` 必须保留完全独立运行，旧数据、账户、origin、部署、仓库均只读；本轮不复制旧课程源码到运行时。

## 1. 共同设计原则

1. **家庭成员与权限分离**：至少\`learner\`（学习）、\`parent\`（监护和管理）；一个parent可以给具体learner授权，不能通过请求body里的learnerId/role自授权限。今天可以只提供一个合成孩子和一个合成家长；长期数据结构保留未来其他家庭成员的能力，但不要过度做多租户SaaS。
2. **家长登录、提升权限的方式应安全可恢复**：不能以共享无验证PIN、固定用户名/密码、Hardcoded demo token或者仅Tailscale身份当作production auth。支持独立可信的管理员初始化渠道、可撤销会话、设备/家长身份关系与恢复策略。
3. **Tailscale私网只是网络边界**；未来HTTPS Serve仅为候选入口。应用自己处理session、CSRF、Host/Origin和parent grant；浏览器/反代传的X-Role/Tailscale-*头部不能直接授予parent。
4. **所有真实写操作服务端授权**，学习事件一旦写入有审计/receipt/revision，不接受客户端自报成绩/金币/XP/成长。
5. **数据与科目可替换**：认证/家庭关系、科目注册、导航/计划/报告容器独立；不在认证模块嵌入数学/英语词库或账本逻辑。
6. **可恢复性**：任何Schema 1→2升级前执行已验证的一致性checkpoint；失败仍能用原镜像+原DB启动，升级后的DB不可被旧schema直接写入。备份不保存明文认证凭据。
7. **合成开发环境 ≠ 生产可用**：所有远端HTTPS/NAS的实际登录需要后续独立授权并通过实体iPad/Mac试用，未做不得标通过。

## 2. 推荐的PR拆分

### PR-02A：生产级基础认证/授权与无损增量数据库迁移（优先）

**本PR只实现后端安全基础设施与专用合成测试，不做完整UI，也不需要真实家长账户。**

- 必须建立\`schema_migrations\`版本2的**增量迁移**；保留schema1所有11表、历史合成event、receipt、media/content hash、revision以及不可变trigger。若\`learners.synthetic=1\`妨碍合法实际家庭账号，提出保真v2迁移方案，禁止改写\`001-foundation.sql\`使checksum失效；旧schema恢复回归要绿。
- 设计/实现\`actors\`、\`learner_grants\`、\`auth_sessions\`（及必要密钥元数据、家长临时提升凭据、撤销记录、限频计数）。认证身份与learnerID不同，family/learner scope由服务器查库，不信任浏览器路径授权。
- 一个一次性本机受控bootstrap CLI用于将来初次创建家庭家长账户；需人工交互、不可输出凭据到日志/Git/CI，凭据保存使用受验证的密码哈希（如Node原生 scrypt 与随机salt/明确参数），PIN不能明文；避免谁先访问网页就可以创建parent。
- 家长\`parent-unlock\`短时二次认证、有效期/撤销；学生不能用parent账户入口绕过授权；session过期/登出/重启行为明确。禁止内存Map作为跨进程权威会话库。
- HTTPS生产Cookie建议\`Secure;HttpOnly;SameSite=Strict;Path=/\`，生产安全origin固定，不从用户Host推断可信origin；写入校验CSRF token+Origin+权限。开发时http loopback必须和生产安全配置明显区分，不能“关闭安全”才能正常工作。
- 基础限频/爆破保护持久化、登录失败不泄露用户是否存在；密码政策和恢复/撤销异常路径有负例测试；使用恒时比较，禁止日志记录PIN/hash/cookie/session token/答题原文。
- 认证API根据Phase0\`/api/v1/auth/login|session|logout|parent-unlock|parent-lock\`契约设计；学生的\`GET /api/v1/learners\`只返回scope内learner；不存在的父母数据管理API仍明确403/FEATURE_DISABLED直到单独实现。
- 真正的parent批阅、导入、备份恢复**写操作**若未实现，应继续拒绝，不能因为已登录就开放假API。所有敏感路由/跨learner/错误角色和伪造Tailscale/代理头反例必须测。
- 同一个可测试schema上保持旧writer/receipt的幂等、CAS、迁移数据完整性、锁安全、backup/restore、非root容器重建。新增身份数据在checkpoint中也必须保真：密钥恢复、session失效策略、敏感备份离线保护明确，别仅复制学习事件表。
- **提交Draft PR并暂停让ChatGPT复审，不自动进入02B**。

建议交付：\`docs/implementation/IMPLEMENT-02A-auth-threat-model.md\`、\`IMPLEMENT-02A-migration-report.md\`、\`IMPLEMENT-02A-execution-report.md\`、\`docs/handoff/IMPLEMENT-02A.md\`，带准确SHA/CI/回滚。

### PR-02B：学习家园正式空壳、权限导航与学科插槽（需02A合并授权后）

**本PR不搬数学70课或英语Core2000，只构建能承载未来模块的外壳。**

- React家庭端至少：首页/今日计划、学科列表、复习入口、家长报告、家园主题占位。页面只展示真的可计算/真正存在的状态；目前无课程时明确“待迁入/暂无记录”，不显示伪进度、假金币或假学习数据。
- 显示登录/登出、parent-only入口、当前learner切换（有授权才出现）、会话失效提示；基础parent/learner端界面与API鉴权一致，不能仅凭隐藏按钮当作权限控制。
- 以\`SubjectModule\`注册表和feature flag增加学科，不通过改动全局SQLite/钱包才能新增新学科。预留\`CourseManifest\`/\`DueItem\`/\`SubjectReport\`接口与降级UI；学科缺文件只使该科不可用。
- 全科今日学习预算与复习调度先做**安全的空计划/接口契约**，不得伪造真实学科算法、随意引入新复习算法、缺课扣积分或启动统一奖励。
- UI与媒体支持版本化assetId引用及未来媒体体量扩展；大文件未接入前显示安全占位并列独立后续任务，不把媒体打进JS或SQLite。
- 至少覆盖Mac desktop、390px手机、768px iPad viewport以及真实键盘操作/无布局溢出；Safari/真实iPad留后续NAS私有HTTPS验证。
- 端到端覆盖：家长登录/解锁、孩子进入学科、student访问父母页面被403、家长登出session失效、刷新恢复、断网不错误展示已保存学习数据。所有旧学科入口仍独立原站，不偷调旧网站内部API。
- 不开放Tailscale Serve/Funnel、域名/公网端口、不在旧站插导航、不导入真正WordQuest备份，继续只用合成身份与合成数据。
- 独立 Draft PR，评估后再合并；后续才拆数学复制适配、英语复制适配和钱包/蛋仔家园独立阶段。

## 3. 各PR必须重复运行的底座测试

- R1-01：异常死亡/SIGKILL/重启及两个同时writer不能数据损坏。
- R1-02：ready轻量，不重新引入全库health扫描。
- schema1→2升级前后逐表hash/内容版本/receipt对账，重复迁移与不兼容版本拒绝。
- 合成学习command并发、409、全事务回滚、不可变证据、server密钥/角色验证。
- SQLite+媒体+内容+身份敏感元数据一致性备份与从空目录恢复。
- 容器非root、rootfs只读、数据卷持久、错误权限拒绝、Compose V1；只用现代Linux CI不冒充DS918+。
- 编译/类型检查/所有原有基础测试、浏览器3视口、生产模式无硬编码演示登录漏洞。
- 数学、英语原repo始终独立，未修改原origin/db/课程功能。来源SHA与变更审计齐全。

## 4. 授权/安全边界/交接格式

- 不授权用户真实用户名/密码/PIN、真实个人学习记录、旧数学SQLite候选库、真实WordQuest V2备份导入。
- 不授权NAS创建正式容器、改Docker socket/权限、配置Tailscale Serve/Funnel/HTTPS、公开端口、自动任务、云资源或七牛上传。
- 开发/CI可使用独立随机合成身份、测试私钥与临时目录；这些绝不能进入发布镜像和生产配置模板的有效默认值。
- \`math-learning\` 和 \`word-request\` 保持独立运行，未来确认冻结来源后复制到新仓库各自修改；不得在此阶段对旧仓库做写操作。
- 每个PR要有逐项\`PASS_CI/PASS_LOCAL/FAIL/BLOCKED/NOT_RUN\`验收、实际CI run/代码SHA、变更差异、架构/数据/回退/隐私审计、未来需要用户独立批准的操作。
- 下一阶段仍由 ChatGPT 独立审查 GitHub 的真实实现与CI；**未得到用户确认不得自动合并、跨阶段推进或部署到NAS**。

## 5. Codex开始时的优先级

在未收到ChatGPT对 \`R1\` 的“复审通过、允许准备合并”结论之前：**只阅读本文件，答疑或提出设计差异；不实现PR-02A/02B。**

R1与PR#5合并流程获批准之后：先执行 **PR-02A**，创建独立Draft PR并STOP；通过后再考虑 PR-02B。**即使只完成02A，也必须及时给出GitHub报告，不需要一次做完整第二阶段。**
