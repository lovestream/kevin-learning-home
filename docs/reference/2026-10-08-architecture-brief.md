# Kevin Learning Home · Kevin 学习家园
## NAS / Docker / Tailscale 整合架构与 Codex 实施任务书
版本：2026-10-08 · 设计方案（不是已实施代码）

### 原项目审查基准
- `lovestream/math-learning`：`1e8199d`；React 19、TypeScript、Vite、Node >=24、`node:sqlite`。现有数据库 `data/progress.sqlite` 的 `progress` 表主要以单条 JSON payload 保存数学进度、错题、钱包、宠物和互动草稿；已有事务、导入导出、API、宠物家园。后端当前仅绑定和接受 localhost。
- `lovestream/word-request`：`d0b42a8`；静态 HTML/CSS/JS，V2 `localStorage`、拼写/识词事件、Core 2000、Movers、KET/PET、自选生词、可导出的 `.wordquest.json`；金币与 XP 仍在客户端，部分历史奖励账本只保留最近500条。

**总体决议：** 建立新仓库 `lovestream/kevin-learning-home`；使用 *模块化单体应用* 而不是 iframe 混接、微服务或全量重写：一个 React/TypeScript 前端、一个 Node API 服务、一份 SQLite、一个全局奖励和蛋仔家园。保留数学、英语专属学习引擎和复习算法。原仓库先只读保留作基准，完成验收之后再归档。

## 1. 产品边界
- 统一：学生账户、家长权限、全科今日任务、学习事件标准、奖励流水、成长经验、金币、蛋仔家园、全科报告、备份、审计。
- 专属：数学模型实验和错题诊断、英语听辨/拼写与记忆调度、未来语文朗读/写作、物理化学实验、地理地图互动。
- 不做：各科同一判分、各科新题都转换为选择题、以刷任务赢金币为核心、离线惩罚、无限游戏时长。
- 科目未来可新增，但新科不应再创建另一个钱包、账户或家园。
- 角色主题与游戏机制分离；蛋仔主题未来可换成原创机器人/太空家园，而积分和历史道具仍保留。公开角色素材版权和音频授权需另审。

## 2. 建议新仓库结构
```text
kevin-learning-home/
  apps/
    web/                       # React app shell, routes, navigation
    server/                    # Node API / auth / single SQLite writer
  packages/
    contracts/                 # subject, course, evidence, API types
    platform/                  # planner, wallet, reports, audit, auth
    pets/                      # extracted from math's pet-care
    ui/                        # visual tokens / responsive components
    subjects/
      math/                    # keep math course/model/scoring engine
      english/                 # extracted WordQuest engine + React UI
      chinese/                 # reserved; add when real course ready
  content/
    math/
    english/
  infra/
    Dockerfile
    compose.yml
    Caddyfile
  scripts/
    import-math.mjs
    import-wordquest.mjs
    verify-migration.mjs
  tests/
    migrations/
    integration/
    e2e/
  docs/
    ADR/
    product/
    subjects/
    runbook/
  AGENTS.md
```
推荐 npm workspaces 先起步；不要为了架构再引入过多工具。两个旧 repo 与新 repo 在同一个本地工作区，Codex 以新 repo 为唯一写入目标。先记录两个来源 SHA；可选择 `git subtree` 保留历史，或在迁移文档中注明来源 SHA 并复制。**迁移不能导致原项目现有测试减少。**

## 3. 接口合同与新课程接入

课程清单：
```ts
interface LessonManifest {
  schemaVersion: number;
  subjectId: string;   // math, english, chinese...
  courseId: string;    // 稳定的 namespaced ID
  lessonId: string;    // 不因改文案而改变
  contentVersion: string;
  title: string;
  grades: number[];
  skillIds: string[];
  prerequisites: string[];
  estimatedMinutes: number;
  activities: {
    activityId: string;
    kind: 'choice'|'spelling'|'audio'|'reading'|'written'|'interactive-model'|'map'|'experiment';
    contentRef: string;
    rubricRef?: string;
    renderer?: string;
  }[];
}
```
学科服务端模块：
```ts
interface SubjectModule {
  id: string;
  listCourses(ctx: LearnerContext): Promise<LessonManifest[]>;
  getDue(ctx: LearnerContext): Promise<DueItem[]>;
  proposePlan(ctx: LearnerContext, minutes: number): Promise<PlanProposal>;
  assess(ctx: LearnerContext, input: unknown): Promise<LearningEvidence[]>;
  getParentReport(ctx: LearnerContext): Promise<SubjectReport>;
}
```
学科的可信评分必须在服务端或经授权家长确认。客户端不能直接发 `correct: true` 或 `+50 coins` 要求平台结算。开放题的 `assessedBy` 必须区分人工/引擎/尚未评分；未评不能冒充掌握。

标准事件包括：`eventId`, `learnerId`, `subjectId`, `lessonId`, `activityId`, `skillIds`, `contentVersion`, `type`, `occurredAt`, `firstAttempt`, `quality`, `evidenceRef`, `assessedBy`。学科详尽证据保存在自己的命名空间，不强行把数学操作解释和英语首答拼写变成一个字段。

以后新增语文、地理等：提交 subject manifest + 版本化课程内容 + 需要的交互 renderer + 评分策略 + 复习逻辑 + 报告适配器 + 校验测试；无需改全局金币和游戏业务。

## 4. 中央数据、导入和历史证据

旧数学记录与旧英语记录先保存**原样、只读快照**，不能直接丢弃。导入至少经历：
1. 从现有 Math 备份/SQLite 一致性导出，以及真正使用的浏览器导出 WordQuest V2。
2. 在旧系统原本位置保留只读副本；生成 SHA-256 与时间记录。
3. 新服务器先校验预览，再事务导入；每个来源文件有唯一 `import_receipt`，重复导入不会重复奖励。
4. 完成逐字段差异报告，经确认后正式切换；旧站停止写入。
5. 可以从 NAS 的一份备份，在空目录恢复全部课程、钱包、宠物和英语复习。

第一阶段允许 `subject_state(learner_id, subject_id, revision, payload_json)` 保存学科完整 V2/数学 JSON；不用立刻拆成大量 SQL 表。平台另建：
```text
learners
subject_state
learning_events (unique event_id)
wallet_ledger (unique reward source id)
wallet_accounts
pet_state
review_index (可选)
content_versions
import_receipts (unique source_sha256 + source_system)
schema_migrations
```
逐渐将查询热点规范化，旧历史永远带有真实证据质量标识，**旧版学过/最终全对不能升级成独立首答成功**。

数学原钱包是有完整 earned/spent ledger 且可校验；英语金币、XP 的发放尺度与数学不同，且旧 scoreLedger 只有滚动窗口。禁止重放英语历史答题来补发全部奖励。需要明确产品兑换策略：保留英语累计 XP 成就；英语现存 coin 可做一次迁入的开账金额或一笔家长批准的纪念奖励，且有幂等 ID，不能反复导入增币。统一后不再有两套可同时写入的主钱包。

## 5. 全局奖励与宠物系统
分开记录：`XP`（不可消费的学习成长）、`Coins`（可消费并有完整流水）、`Bond/Growth`（伙伴亲密和成长）。由服务端在同一 SQLite 事务中完成：
```text
validated subject result
 → unique learning evidence
 → reward policy & deduplication
 → wallet ledger + balance
 → pet growth / optional memory
```
`reward_key = learner_id + reward_policy_id + source_event_id` 必须唯一。答案不正确、参考提示后订正和独立掌握不得等价。保证当天学习负荷上限，杜绝重复刷金币。继承 Math Lab 的 `server/pet-care.mjs`, `src/PetsView.tsx`, `content/pets/catalog.json`，拆成全科共有的 PetService、GameTheme、Inventory、Memory；保留旧宠物、食物、道具和装饰，不因改主题丢失历史。学习记忆可提及数学知识点和英语阅读来源，但不默认调用生成式 AI。游戏不因缺课饥饿、掉亲密度或清空成长。

## 6. UI 与每日学习计划

学习者导航：今天 / 学习岛（数学、英语、语文...）/ 复习站 / 错题与收藏 / 蛋仔家园 / 我的成长。

家长中心：跨科周报、分学科证据、课程版本/人工审稿、总时间预算、奖励规则、恢复与备份、管理权限。

Math 原 `Today / Map / Review / Pets / Parent` 拆为平台入口与数学内部课程。Word 原 `Learn / Practice` 仍是英语流程内部步骤，不做平台一级导航。

中央 `DailyPlanner` 只**协调跨科时间**，不替代学科调度。不能把英语20分钟 + 数学30分钟 + 语文20分钟简单相加为日常义务。小学先支持全科30–40分钟的可调预算；学科优先复习、当日新词上限和错题补练由各自模块计算。允许休息、延后，不把 backlog 记作失败。

## 7. NAS 网络和 Docker

单一 HTTPS tailnet origin，目标路由：
```text
/                        Home
/subjects/math/*         Math
/subjects/english/*      Vocabulary/Reading
/pets                    Shared game
/parent                  Protected parent
/api/v1/*                Server API
```
宿主 NAS 上已有的 Tailscale Serve（私网 HTTPS，**不启用 Funnel**）代理本机回环端口 8080。建议服务端仍处于 Docker 内网，只在宿主回环暴露反代。示例 Compose：
```yaml
services:
  app:
    build:
      context: .
      dockerfile: infra/Dockerfile
    restart: unless-stopped
    expose: ["4177"]
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: "4177"
      DATA_DIR: /data
      TZ: Asia/Shanghai
    volumes:
      - ./data:/data
    networks: [internal]
  proxy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - ./infra/Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on: [app]
    networks: [internal]
networks:
  internal: {}
```
Caddyfile：
```caddy
:80 {
  encode zstd gzip
  reverse_proxy app:4177
}
```
**这个部署示例需要 Codex 先修改当前数学后端的 localhost 强限制、增加真正的 app 会话认证、家长授权、CSRF 等；不是直接把当前数学仓库换成 `0.0.0.0` 就完成安全部署。** Tailscale Serve 命令视 NAS 版本和安装形态核验，通常可 `tailscale serve --bg localhost:8080`。所有手机/iPad、家中 Mac 都加入 tailnet 并使用同一 HTTPS URL。

不在公网映射 8080/4177，也不开放 `/api/import`/家长功能给普通学生权限。数据库放 NAS 本地文件系统，SQLite WAL 不放 SMB/NFS 网络目录；备份用 SQLite 一致性快照而不是在线单独复制 `.sqlite` 文件，且另备一份到 NAS 之外。上线前在 NAS 上确认 CPU 架构、Node 24 镜像支持、文件持久化、UPS/断电处理、NAS 实际 Tailscale Serve/CLI 能力。

## 8. Codex 实施顺序

**Phase 0 基线与保护**
- 冻结仓库 SHA、跑两套测试和构建、确认 NAS 环境、备份旧 SQLite 和 Word V2。
- 产出数据审计表、ADR、准确迁移清单，不伪造已迁入。

**Phase 1 先验证 NAS**
- 在内网单独跑数学 Node 服务、英语静态服务作为过渡，健康检查、备份、Tailscale 私网可访问。
- 明确此时英语的 localStorage 仍不会跨设备同步。

**Phase 2 平台骨架**
- 新 monorepo、React 统一 Shell、基本会话/家长权限、学科 registry、SQLite 迁移器。
- 先导入数学模块和已有蛋仔游戏，不改变其教学/账本结果。

**Phase 3 英语迁移**
- 从 WordQuest `app.js` 逐步提取数据模型、纯判分与调度函数，写服务端持久化 Adapter，再迁 React 页面。
- Import V2 并对比各类进度（Core 2000、PET/KET、阅读自选词、成熟词、复习队列、weekly checks、AI wordpacks）。
- API 支持 revision 冲突、幂等提交。切换后旧网站停止真实数据写入。

**Phase 4 全局积分和家园**
- 确定经家长确认的历史积分兑换规则，执行一次幂等迁移；数学和英语事件都进入同一个 wallet。
- 宠物共同学习回忆与道具消费服务端结算。

**Phase 5 新科可扩充模板**
- 用3节真正可用的语文阅读/科学观察课程验证扩展机制：只注册模块、添加内容，不修改 wallet 或 app shell。
- 开始实现内容草稿→人工审稿→发布→回滚→内容版本迁移工作流。

**Phase 6 NAS 正式切换与实机**
- Mac 和 iPad 同时测试共享进度、竞争写入、断网重试、版本迁移、完整恢复。
- 保留手动备份导出；开始30–60天真实学习观察再调整难度与每日时间。

## 9. 验收矩阵（全部通过后才能宣布整合完成）
1. 数学原有课程、草稿、复习、首答、金币、宠物、背包逐字段核对不丢。
2. 英语V1/V2词条进度、词库课程、记忆安排、My Words 来源、每周识词、事件历史不丢。
3. 同一学科两个设备提交重复 event ID，只保留一份证据、一份奖励。
4. 数学和英语都从统一金币余额结算，不存在第二套生产币池。
5. 服务器拒绝客户端直接写金币余额/伪造正确成绩。
6. NAS 重启、容器删除重建后进度仍在；能在新空目录完整恢复。
7. iPad 在外面 Tailscale 打开后立即读取 Mac 最新进度。
8. 修改原答案/内容版本不会反向改写首次作答与历史质量标签。
9. 缺少一个学科媒体或词库时，只暂停该模块，不删除其他学科历史。
10. 奖励和宠物独立于 UI 皮肤，换角色主题不影响余额、成长与拥有关系。
11. 子女权限不能调用家长导入、恢复、课程发布、配置奖励 API。
12. 最小 390px 移动屏幕无横向溢出，动态弹窗可操作。
13. 数学、英语现有测试在迁移后仍执行；平台新增 E2E + migration + wallet-idempotency tests。
14. GitHub main CI 全绿，回滚能还原旧版本和数据；Codex 汇报未迁移范围。

## 10. Codex 工作规范
- 第一轮**先给出迁移差异报告与 ADR，不直接大重构**。
- 后续按阶段小 PR；禁止一次性重写数学、英语、钱包。
- 保留原仓库只读基准；新仓库作为整合唯一事实源。
- 严禁真实孩子记录或秘钥上传 Git；全部用脱敏 fixture 自动验证。
- 所有接口有版本、schema 校验、幂等和权限设计。
- 代码改造完成要给出数据库迁移结果和一致性对比报告，而不只说“构建通过”。
- 不擅自添加 FSRS、联网 PK、AI 自动生成课程、大规模微服务。
- 父母批准后才进行第一次不可逆的中心钱包切换。

## 资料
- https://github.com/lovestream/math-learning
- https://github.com/lovestream/word-request
- https://tailscale.com/docs/features/tailscale-serve
- https://tailscale.com/docs/reference/tailscale-cli/serve
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- https://docs.docker.com/compose/how-tos/use-secrets/
