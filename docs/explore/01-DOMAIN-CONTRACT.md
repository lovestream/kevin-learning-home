# EXP-00 · 领域合同 v1

可执行来源：`packages/explore/domain.ts`（严格Zod；未知键拒绝）、`examples.ts`、`coach.ts`。测试：`tests/explore/domain.test.ts`。本合同是预览与未来私有适配器之间的边界，不声称已经实现 #24/#28 生产持久化。

## 对象与事件

`projectViewSchema`提供`stage`与不可变首猜投影：stage由最后一条已保存内容事件派生（question/first-hypothesis/plan/observe/revise/claim/creation/reflect），与暂停/归档生命周期分开，状态或家长反馈不改变认知阶段。避免存两份相互矛盾的阶段游标；UI未提交的标签选择仅属临时草稿。`questionFactSchema/questionCreatedFact`为创建receipt产生严格校验的question_created事实（sourceRevision=0），不将私人题文放进日志事件。

项目：schemaVersion=1、activityModule=explore、projectId、learnerId、questionId、question、origin、status、revision、createdAt/updatedAt、subjectRefs[]、events[]。origin 为 child/parent-suggestion/lesson/ai-suggestion；状态 pending/active/paused/uncertain/finished/archived 可自由切换。归档不是删除，暂停/失败没有扣分或过期机制。

SubjectRef：subjectId/contentId/contentVersion/optionalTaskId/relationship。一对多；版本不随课程更新漂移，缺失链接保留来源，不自动跳别课。英语 CORE 示例仅是合同样例，**不是已上线真词条**。数学实际 `G3-U01-B01@2026-10-07.2`，UI从当前目录读取实际版本，拒绝任意from路径。

追加事件 envelope：recordVersion=1、activityModule=explore、eventId、projectId、learnerId、expectedRevision、actor(child/parent)、recordedAt、detail。每种detail均为独立严格schema，不接受`payload:unknown`。

| kind（对外加 `exploration.` 前缀） | 必需事实/约束                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| question_created                   | 对应createProject成功的项目创建事实；正式记录适配器从创建receipt派生，不从按钮点击派生      |
| hypothesis_submitted               | text、assistance；每项目仅一次，保留最初表述及帮助来源                                      |
| plan_written                       | text、assistance；允许失败后追加新计划                                                      |
| evidence_added                     | text/source/citation/inference/artifactIds/assistance；非亲身观察必须有出处，事实与解释分开 |
| hypothesis_revised                 | text、evidenceEventIds、assistance；必须先有首猜，证据引用必须已经存在                      |
| claim_written                      | text、certainty(supported/uncertain/disproved)、unresolved、assistance；不自动判正确        |
| artifact_created                   | text、category、artifactIds、fictional、assistance；区分想象作品与现实证据                  |
| reflection_written                 | text、assistance；无正确/聪明分数                                                           |
| status_changed                     | 新status；不强制完成所有步骤                                                                |
| weekly_selected                    | selected；仅个人自主选择，不下发任务或锁其他题                                              |
| parent_feedback                    | text；仅家长actor，不能替换孩子事件                                                         |
| help_requested                     | level；必须已有首猜；ask-back/idea/study-source/review-help                                 |

聚合应用返回新对象，不修改输入；每次新事件 revision+1。相同eventId+完整规范化内容返回原revision；同ID异内容报IDEMPOTENCY_CONFLICT；过期expectedRevision报REVISION_CONFLICT（正式HTTP映射409）；project/learner不匹配拒绝。单项目最多500事件，必须明确错误，不能悄然截断。记录时间由未来私有服务器产生，事件顺序不能倒退。

**这些纯函数不是身份验证。** 私有请求的learnerId、actor由已验证家庭/设备/家长会话注入；不能因为JSON写着learner-a就授权。预览固定demo-learner，没有可被误认为个人身份的会话。

## 正式适配器接口（未开放，依赖#24）

`PrivateExplorePort` 必须共享统一 records 数据库及会话边界：

- `createQuestion(context, requestId, {question,origin,subjectRefs})` → question/project receipt。
- `listQuestions(context, cursor, filter)` / `getProject(context, projectId)` → 本家庭学习者范围。
- `appendEvent(context, projectId, expectedRevision, eventId, detail)` → 同事务project/receipt/events，新revision；不接受客户端actor/learnerId。
- `parentReview(parentContext, projectId)` / `parentFeedback(parentContext, ...)` → **用户设置的一个家长密码会话**，不能继承儿童设备权限。
- `deleteProject(context, expectedRevision)` → 隔离/恢复策略与备份保留一致，不混淆归档与删除。
- `exportFamily(parentContext)` / `restoreFamily(parentContext, manifest)` → hash/版本/媒体完整恢复；原始sourceSnapshot不覆盖。

所有私有端点要求可信访问、同源/CSRF、审计最少化、默认拒绝、读取也校验权限；ID枚举不泄漏。#28需新增集成HTTP、双学习者、跨设备、并发、重启、故障恢复测试。当前纯聚合scope测试不能算这些服务验收通过。

## 媒体、外部AI和奖励边界

mediaReferenceSchema 只是未来私有对象引用：artifactId/projectId/learnerId、drawing/image/audio、SHA256、bytes≤10MiB、允许MIME、assistance。不接受路径、SVG或任意URL。当前聚合对任何非空artifactIds直接报PRIVATE_MEDIA_ADAPTER_REQUIRED；不是安全扫描器/EXIF剥离器，也没有上传/音视频采集。真正的文件签名/解码/压缩炸弹/元数据/私有ACL在#29实现。

`ExplorationCoach.respond` 是纯离线接口，不读取原文指令或联网；请求外部适配器必定抛错。它只返回question/evidenceRequest/alternativeView/safetyBoundary，不持有提交项目的方法。AI参与记录不能被算作孩子独立答案；真实模型供应商/版本/费用/配额/同意/撤回未设置。

`recognitionCandidate` 仅对自己提出+独立首猜+亲自观察+独立反思产生候选（不要求成功结论）；key=`learnerId:projectId:milestone:policyVersion`，`coinsIssued=0`，需要家长审核与#20账本。不是可发币判定，不防伪造证据；换设备、改日期、重复提交不能生成新里程碑。100个只有问题的样例候选为0。正式每日/每周上限、反刷、余额/撤销/事务由#20实现后单独验收，不能声称本函数已完成账本。

## 五种可执行合成样例

`examples()`包含：月亮问题（只有问题，无首猜）、观察纸盒（数学引用）、纸桥失败后暂停、影子首猜被反证后仍不确定、英语故事（仅合同引用，已归档）。它们均不是Kevin实际记录，所有事件可通过严格类型/运行校验，无AI/图/结论也可成立。首猜/证据/修订/想象作品分别有可读来源标签。
