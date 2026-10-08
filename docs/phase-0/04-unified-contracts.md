# 04 · 统一接口契约提案 v1

状态：**供审查的规格，不是已实现接口。** 后续contracts PR才落地运行时JSON Schema、TS导出、数据库约束与契约测试。保留任务书的SubjectModule边界，补齐身份、历史信任、冲突和事务语义。

## 身份、版本和时间

API路径固定`/api/v1`；JSON对象有`schemaVersion:1`，内容另有不可变`contentVersion`。subjectId注册为`math/english`，未来科目需注册，不接受客户端任意注册。courseId/lessonId/activityId稳定且namespaced；文案和UI皮肤变化不改ID。

旧ID保留在学科payload，单独维护aliases。例如`math:legacy:counting-quantities`、`math:studio:G3-U01-B01`、`math:thinking:G3-U01-TH1`属于不同空间。英语保留card/lexeme/sense及课程成员关系，同一词形可属于多个词库；不能按中文标题、lemma或同名孩子关联实体。

客户端occurredAt只作观测时间，服务器receivedAt/assessedAt单独记录；UTC ISO时间和家庭`Asia/Shanghai`学习日期分开。离线晚到事件可以保存，但当天预算/奖励归属由有版本的服务器策略决定，不能改设备时间刷每日奖励。原始epoch毫秒在导入payload保留。

## TypeScript 合同

下面类型完整自洽，但TS不是运行时安全校验。commands schema拒绝未声明字段；历史imports保留未知字段进入隔离区，而不是直接丢弃。

```ts
export type SubjectId = string;
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Permission = 'learn' | 'parent-review' | 'import-restore' |
  'publish-content' | 'configure-rewards';
export type AssessedBy = 'engine' | 'parent' | 'legacy-client' | 'unassessed';
export type EvidenceQuality = 'independent-correct' | 'supported-correct' |
  'corrected' | 'incorrect' | 'ungraded' | 'legacy-unknown';
export type TrustLevel = 'server-verified' | 'parent-verified' |
  'imported-client' | 'legacy-summary';

export interface LearnerContext {
  learnerId: string; actorId: string; sessionId: string;
  permissions: ReadonlySet<Permission>;
  timeZone: 'Asia/Shanghai'; serverTime: string;
  contentVersion: string; stateRevision: number;
  // 由server创建；不接受浏览器上传这个上下文。
}
export interface LessonManifest {
  schemaVersion: 1; subjectId: SubjectId;
  courseId: string; lessonId: string; contentVersion: string;
  title: string; grades: number[]; skillIds: string[];
  prerequisites: string[]; estimatedMinutes: number;
  activities: {
    activityId: string;
    kind: 'choice' | 'spelling' | 'audio' | 'reading' | 'written' |
      'interactive-model' | 'map' | 'experiment';
    contentRef: string; rubricRef?: string; renderer?: string;
  }[];
}
export interface DueItem {
  dueItemId: string; subjectId: SubjectId; lessonId: string;
  activityId: string; contentVersion: string; dueAt: string;
  estimatedMinutes: number; priority: number; reason: string;
  subjectRef: string; // 指向科目自己的复习身份/调度token
}
export interface PlanProposal {
  schemaVersion: 1; subjectId: SubjectId; stateRevision: number;
  requestedMinutes: number; estimatedMinutes: number;
  items: DueItem[]; deferredIds: string[]; reason: string;
}
export interface LearningEvidence {
  schemaVersion: 1; eventId: string; learnerId: string;
  subjectId: SubjectId; lessonId: string; activityId: string;
  skillIds: string[]; contentVersion: string;
  type: 'attempt-assessed' | 'reading-observed' | 'model-observed' |
    'self-check-recorded' | 'parent-assessed' | 'legacy-summary';
  occurredAt: string | null; receivedAt: string; assessedAt: string | null;
  firstAttempt: boolean | null; // null=来源没有足够证据
  quality: EvidenceQuality; assessedBy: AssessedBy; trustLevel: TrustLevel;
  evidenceRef: string; sourceEventId: string;
  assessmentVersion: string | null; supersedesEventId: string | null;
  provenance: { sourceSystem: string; sourceSha256: string | null;
    sourceRepoSha: string | null; sourceRecordId: string | null };
}
export interface SubjectReport {
  schemaVersion: 1; subjectId: SubjectId; from: string; to: string;
  metrics: Record<string, number | null>;
  evidenceCounts: Record<TrustLevel, number>;
  dimensions: Json; // 不把两科首答率当同一量表
}
export interface SubjectModule {
  id: SubjectId;
  listCourses(ctx: LearnerContext): Promise<LessonManifest[]>;
  getDue(ctx: LearnerContext): Promise<DueItem[]>;
  proposePlan(ctx: LearnerContext, minutes: number): Promise<PlanProposal>;
  assess(ctx: LearnerContext, input: unknown): Promise<LearningEvidence[]>;
  getParentReport(ctx: LearnerContext): Promise<SubjectReport>;
}
export interface LearningCommand {
  schemaVersion: 1; commandId: string; learnerId: string; subjectId: SubjectId;
  expectedRevision: number; contentVersion: string;
  occurredAt: string; serverAttemptId: string;
  action: 'answer' | 'save-draft' | 'request-help' | 'self-check' |
    'submit-open-response' | 'observe-model' | 'observe-reading';
  lessonId: string; activityId: string; input: Json;
}
export interface CommandResult {
  schemaVersion: 1; commandId: string; duplicate: boolean;
  committedRevision: number; currentRevision: number;
  events: LearningEvidence[]; result: Json;
  // result不含旧版全量progress；重试后不会把UI倒退到旧快照。
}
export interface ApiError {
  schemaVersion: 1; requestId: string;
  error: { code: string; message: string; retryable: boolean;
    currentRevision?: number; details?: Json };
}
export interface ImportPreview {
  schemaVersion: 1; previewId: string; learnerId: string;
  sourceSystem: 'math-lab' | 'wordquest'; sourceSha256: string;
  sourceSchemaVersion: number; targetRevision: number;
  mappingVersion: string; expiresAt: string;
  changes: { path: string; treatment: 'exact' | 'renamed' | 'derived' |
    'quarantined' | 'operational-only' | 'deferred-wallet'; reason: string }[];
  blockers: string[]; snapshotRef: string;
}
export interface ImportReceipt {
  schemaVersion: 1; receiptId: string; learnerId: string;
  sourceSystem: 'math-lab' | 'wordquest'; sourceSha256: string;
  mappingVersion: string; committedAt: string; revision: number;
  snapshotRef: string; walletAction: 'none';
}
```

Manifest的contentRef/rubricRef必须指向允许的版本化内容，不能让客户端指定服务器文件路径或任意URL；renderer从注册白名单选择。响应不在提示、ARIA、data属性或预答反馈中泄露正确答案。学科assess仅产出证据与学科状态变更，不能自行调用另一个学科或写中央奖励。

## HTTP端点与权限

表格所有敏感路径即使URL隐藏也必须服务端授权；learnerId由会话授予范围检查，不能据请求体自行选择别人的记录。

| 方法与路径 | 请求/返回要点 | 权限 |
| --- | --- | --- |
| GET `/health/live` | 进程存活；不泄露学习记录 | 基础健康检查 |
| GET `/health/ready` | SQLite可用、schema和内容已装；可只对内网开放 | 运维 |
| POST `/api/v1/auth/login` | 受限的app登录/设备配对，建立learner会话；具体凭证方案待auth PR定稿 | 未登录；限频 |
| GET `/api/v1/auth/session` | actor、learner grants、parent权限、csrf token | 当前会话 |
| POST `/api/v1/auth/logout` | CSRF保护；失效session | 当前会话 |
| POST `/api/v1/auth/parent-unlock` | 验证父母PIN/凭证，短期elevation | 会话，限频 |
| POST `/api/v1/auth/parent-lock` | 撤销elevation | 当前会话 |
| GET `/api/v1/learners` | 只返回被授权learner | 当前会话 |
| GET `/api/v1/subjects` | registry及内容就绪状态 | learn |
| GET `/api/v1/subjects/:subjectId/courses` | LessonManifest列表，按版本读取 | learn |
| GET `/api/v1/learners/:learnerId/subjects/:subjectId/state` | 公共学科state、revision、ETag；隐藏私有答案/批阅材料 | learn且匹配learner |
| GET `/api/v1/learners/:learnerId/subjects/:subjectId/due` | DueItem[]，保留subjectRef | learn |
| POST `/api/v1/learners/:learnerId/subjects/:subjectId/attempts` | 分配服务器attempt/session/内容版本与提示历史边界；也是幂等写入 | learn |
| POST `/api/v1/learners/:learnerId/subjects/:subjectId/commands` | LearningCommand→CommandResult | learn，必须Idempotency-Key |
| GET `/api/v1/learners/:learnerId/today` | 全科已冻结计划、时间预算、可延后项；GET不偷偷写奖励 | learn |
| POST `/api/v1/learners/:learnerId/today/plan` | 提议/重计划，expectedPlannerRevision和幂等key；已开始任务受保护 | learn |
| GET `/api/v1/parent/learners/:learnerId/report` | 跨科聚合+分科证据与信任分母 | parent-review且匹配learner |
| POST `/api/v1/parent/assessments` | 原evidenceRef、verdict、comment、revision、commandId→追加判分event | parent-review |
| POST `/api/v1/parent/imports/preview` | 私有上传原文件→ImportPreview，校验hash/schema/未知字段 | import-restore |
| POST `/api/v1/parent/imports/commit` | previewId、sourceSha256、expectedRevision、commandId→ImportReceipt | import-restore，预览无blocker |
| GET `/api/v1/parent/imports/:receiptId` | 只读回执与字段差异 | import-restore |
| POST `/api/v1/parent/backups` | 一致性backupId/hash清单；异步job可跟踪 | import-restore |
| GET `/api/v1/parent/backups/:backupId/export` | 学习数据/媒体私有下载，禁公共缓存 | import-restore |
| POST `/api/v1/parent/restores/preview`、`/commit` | 先校验再停写恢复，拒旧schema不兼容；建立新恢复审计 | import-restore及维护状态 |
| GET `/api/v1/learners/:learnerId/wallet`、`/pets` | Phase4后才启用中央wallet；之前返回disabled/来源摘要 | learn |
| POST `/api/v1/learners/:learnerId/pets/commands` | 购买/喂养/互动：itemId与数量/commandId，不接受价格或成长增量 | learn；Phase4后server结算 |
| POST `/api/v1/parent/reward-policies`、`/content/publications` | 版本化策略/发布；按对应阶段启用 | configure-rewards / publish-content |

示例：`commands` action=answer 的input仅含经学科schema允许的原始回答/操作证据，禁止`correct:true`、`quality`、`assessedBy`、`coins`、`paid`、`xpDelta`及未声明字段。客户端请求帮助由服务器记录，首答身份由serverAttemptId与已提交历史判断。保存草稿/阅读/模型探索是事实记录，不自动判掌握。

## revision、幂等与原子性

新commandId使用UUID；`Idempotency-Key`必须与body.commandId一致。`command_receipts`的唯一键为`(learner_id, command_id)`，保存subject、action、规范化请求hash、提交revision和原业务result。不把csrf token和传输requestId算作业务hash，其他请求字段与occurredAt在重试中保持稳定。

写入顺序：验证会话、权限、CSRF与schema → `BEGIN IMMEDIATE` → 查command receipt → 校验subject revision与content/attempt版本 → 学科判分/状态变更 → 追加不可变evidence → 对已启用奖励policy结算 → 写收据/审计 → 更新revision → `COMMIT`。失败全回滚。所有DB操作在同一受控writer事务中，不能在已提交学科后异步补钱包。

- 同key/相同hash：返回duplicate=true，保留原业务result与committedRevision，另返回currentRevision；不重新判分/结算，不回放旧progress覆盖UI。
- 同key/不同hash：409 `IDEMPOTENCY_CONFLICT`，包括跨subject/learner路径不匹配，不能用新答案覆盖旧事实。
- 不同key/旧expectedRevision：409 `STALE_REVISION`并给currentRevision；客户端重新读取，保留本地草稿，显式重放/解决冲突，不自动last-write-wins。
- 学科同一attempt重复但换commandId：服务器attempt身份与答题阶段约束仍阻止把第二答冒充首答；reward还需逻辑来源去重，不仅请求ID去重。
- 不同学科同时提交：分别核对科目revision；中央钱包和pet有各自revision/约束，仍在一个SQLite事务内写入。

断网队列本地保留commandId、完整原请求和创建时revision，串行重试同一科目；显示“尚未同步”。不将离线客户端结果当可消费余额。发生409停在冲突状态，不清队列、不覆盖服务器。

## 学习事实与历史证据

服务器验证的封闭题可`assessedBy=engine/trustLevel=server-verified`；父母批阅为parent/parent-verified；开放题未评分为unassessed/ungraded。导入英语旧客户端答题为legacy-client/imported-client；V1仅汇总为legacy-summary/legacy-unknown，firstAttempt=null。

数学旧服务生成的题目verdict仍保留原记录与来源，而不是一律升级新平台server-verified；其usedHint/独立性声明需要来源证据链。内容版本缺失保持“来源未知”，不能补当前版本伪造历史。

家长批阅/内容订正追加新event或assessment版本，supersedesEventId关联原事实，原首答、提示、答案快照不变。quality独立性不只看最终正确：参考提示、近似拼写辅助、看答案后订正、教具验证均保留在科目evidenceRef里。全科报告保留各科指标和真实分母，不把识词选择题正确率当独立拼写保持率。

## 数据约束与奖励隔离

建议表：learners、subject_state、learning_events、source_snapshots、import_receipts、command_receipts、content_versions、schema_migrations、auth_sessions、audit_log；review_index为可重建索引。Phase4之后才启用wallet_accounts、wallet_ledger、pet_state/inventory权威平台结算。不存在本轮已建库结论。

唯一约束：learning_events.event_id；import_receipts(source_system,source_sha256)；command_receipts(learner_id,command_id)；content_versions(subject_id,content_id,version)。import快照可保留重复来源，但事件索引使用稳定source身份，不以重导出的新文件hash制造新历史。

奖励需要两层去重：`(learner_id,reward_policy_id,source_event_id)`，以及policy定义的逻辑授奖范围（同题/同复习轮/同日期上限）。policy升级不自动重算旧event。开账与历史兑换通过专门迁移key和家长批准版本，不能通过learning_events重放。数学旧coins、英语旧coins/XP、伙伴growth分别保存；此提案不指定汇率。

金额使用非负安全整数账户与有符号整数ledger，禁止浮点币、客户端传价格、超余额支出。余额=期初+全部流水；授奖、购买、库存、pet成长、receipt原子提交。并发两次购买不能超卖/透支。

## 网络安全与错误语义

app使用随机不透明服务器会话cookie，生产`Secure; HttpOnly; SameSite=Strict; Path=/`；父母elevation短期独立，重启/恢复可撤销。所有写方法校验固定配置的HTTPS public origin、CSRF token与JSON schema；禁止依靠请求Host动态拼可信Origin。

受信代理仅包括明确的Caddy/Serve路径；不任意信任X-Forwarded-*、Tailscale-User-*或公开传入identity。tailnet成员资格不自动成为parent权限。PIN首次设置使用单次安全引导流程，不能让任意未授权学生先设置家长PIN。配置/恢复/发布请求有审计但不记录答案正文、PIN、cookie、令牌或私有数据。

| HTTP | code示例 | 客户端处理 |
| --- | --- | --- |
| 400/422 | INVALID_JSON / SCHEMA_INVALID / UNKNOWN_FIELD | 修正输入，不盲重试 |
| 401/403 | SESSION_REQUIRED / PARENT_ACCESS_REQUIRED / LEARNER_FORBIDDEN / CSRF_FAILED | 登录/解锁或拒绝，不自动降权限 |
| 404/409 | CONTENT_NOT_INSTALLED / CONTENT_VERSION_CONFLICT | 暂停对应模块，保留历史与草稿 |
| 409 | STALE_REVISION / IDEMPOTENCY_CONFLICT / IMPORT_TARGET_CONFLICT | 重读/显式解决；禁止重复加币 |
| 413 | PAYLOAD_TOO_LARGE | 文件大小预检；不截断导入内容 |
| 429 | RATE_LIMITED | Retry-After和退避 |
| 503 | STORAGE_BUSY / STORAGE_UNAVAILABLE | 未提交事务回滚，允许同key退避重试 |

命令和导入有不同body上限；实际阈值在匿名最大样本与真实私有预览后冻结，不直接沿用数学8MB请求/6MBstudio限制，更不能以截断历史达标。数据库使用foreign_keys、WAL、FULL、busy_timeout并保证单writer。大导入预解析/流式上传放在事务外，事务内不等待网络或人工评分。
