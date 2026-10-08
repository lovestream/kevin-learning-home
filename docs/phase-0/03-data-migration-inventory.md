# 03 · 完整数据迁移清单与保真规则

状态：**源代码级清单完成，真实记录数量和迁移结果未知；本轮没有导入。** 下文“保存/迁入”均是未来实施要求。

## 保存模型与清单覆盖原则

第一层 `source_snapshots` 保存来源文件**原始bytes**，私有存储、只读、带文件SHA-256、来源系统/仓库SHA/导出时间/确认的设备与origin。第二层 `subject_state(learner_id, subject_id, revision, schema_version, payload_json)` 保存学科完整状态；第三层才是可重建的事件、报告、review_index等索引。数学校验后的规范化对象和英语V1→V2对象都必须另留转换报告。

表中 `.*`、`[]` 表示递归保存该对象/数组的**所有键和值**，不仅保存所举例的已知字段。未经识别的键进入 `extensions`/隔离区并在差异报告显示；不能静默删除。数组顺序、重复项、null与缺失字段、原始时间、字符串、内容快照都要保留。索引去重不等于删除原始来源副本。

每条字段路径必须被标为 `exact / renamed / derived / quarantined / operational-only / deferred-wallet`；发布前对输入JSON递归枚举叶子路径，检查每条路径有去向。额外的新字段也不能因未列在当前表格而丢失。

## A. 数学来源与 envelope

| 来源/路径 | 保存位置与校验 | 风险 |
| --- | --- | --- |
| SQLite `progress(id=1,payload)` | 一致性全库备份；原始payload单独只读保存；完整对象进math subject_state | 不在线单独复制主sqlite；不先启动createStore触发升级 |
| `format, version, exportedAt, catalogVersion, checksum, progress` | 原envelope进入快照/receipt；格式为`kevin-math-lab`，version=1 | checksum是旧Node对`JSON.stringify(progress)`的SHA-256；与原始文件bytes SHA-256不是同一个值 |
| `schemaVersion` | 原值1保留；新增平台schemaVersion独立 | 不假装旧progress已经是新SQL schema |
| 全部未识别扩展字段 | raw与extensions、字段差异报告 | 调用现有validator后仍须对比，不凭“验证通过”声称逐字段保真 |

本地默认数据库缺失，实际运行路径可能由`--data-dir`指定。真实路径、导出时刻和一致性备份尚未确认。

## B. 数学顶层与子对象

| 路径（所有后代递归保存） | 已知必须对照的字段/内容 | 目标/迁移验收 |
| --- | --- | --- |
| `profile.*` | name,grade,selectedGrade,textbook | math原始profile；建立learner前由家长确认关联，不能只靠同名Kevin合并 |
| `settings.*` | sound,dailyMinutes,reviewDays | 科目设置原样；全科预算另设，不覆盖旧30/45/60偏好 |
| `attempts[]` | id,lessonId,questionId,prompt,answer,expected,correct,usedHint,mode,at,misconception,explanation | 保留旧题文本和答案快照；索引必须标旧hint声明可信度，不能推断全部独立掌握 |
| `lessons.<id>.*` | solved,completedAt,lastQuestionId,retells[].{id,text,at} | legacy课程完成与复述；稳定ID映射，不按标题匹配 |
| `reviews.<id>.*` | dueAt,stage,lastReviewedAt,successDates,mistakes,scheduleVersion,createdAt,history[].{day,at,independent,dueAt},firstLearnedAt,firstLearnedDay | 到期日期、锚点、成功日序列逐项核对；缺首次学完日期就保持缺失 |
| `wallet.*` | coins,earned,spent,ledger[].{id,amount,label,at} | **仅旧math钱包快照/兼容状态**；逐笔验证earned/spent及余额，本轮不生成中央币 |
| `pets.*` | owned,active,xp,feedCount,accessory,care | 宠物来源全量；pets.xp不转学习XP |
| `inventory.<itemId>` | 食物数、装饰拥有关系等 | 平台inventory候选；不能重复赠送初次升级礼包 |
| `studio.version` | 1 | studio版本独立于平台schema |
| `studio.reading.<lessonId>.*` | revision,blockId,widgets,savedAt | 阅读游标与所有模型widgetState，保留验证schema/模型版本 |
| `studio.sessions.<sessionId>.*` | 见C表 | 保留整会话及题内容快照，禁止重建为当前最新题 |
| `studio.notes[]` | id,lessonId,text,status等 | ungraded发现手册，不作为已判对证据 |
| `studio.events[]` | id,signature,result及所有后代 | **操作回执**；不把每次draft/help都当答题事件或奖励来源 |
| `studio.entitlements.*` | 原有奖励/拥有去重键 | 保留去重防再发奖 |
| `studio.daily.<day>.*` | tasks,completion | 旧每日30星点上限和完成奖励状态，平台新policy另版本 |
| `studio.review.<lessonId>.*` | 与reviews同类，含scheduleVersion/history/锚点 | studio复习独立保存，不与legacy同名lesson粗暴去重 |
| `studio.lastLessonId` | 最近课程入口 | 学科继续学习位置 |
| `studio.thinking.<taskId>.*` | 见D表 | 思维卡与家长批阅，是较新分支新增迁移范围 |

## C. 数学 studio session 证据

| 路径 | 保留要求 |
| --- | --- |
| `id,lessonId,contentVersion,editorialRevision,setName,assessment,taskIds,tasks[],revision,index` | 保留题组`core/review/transfer/...`、`withdrawn-v1`评估身份、题顺序和整题快照；contentVersion与editorialRevision分别保留 |
| `answers.*,help.*,results.*` | 所有回答、提示级别、verdict、paid、assisted、at、首答/最终答案、selfCorrection、诊断与解答；不得以最终answers覆盖首次回答 |
| `selfChecks.<taskId>.*` | firstAnswer,firstAt,helpLevel,modelStateVersion,evidence,evidenceCompletedAt,selfCorrection等，以及三项checks/reflection/操作顺序与中间量 |
| `parentReviews.<taskId>[]` | verdict,comment,at,source,evidence.first/result/help；保留批阅历史，不覆盖原首答 |
| `createdAt,savedAt,submittedAt,completedAt,reviewDue,hadIncorrect`及其他字段 | 所有存在值都保存；独立迁移/延迟保持要由既有证据链判断，不由completedAt单字段判断 |

`results`是题目评分结果，`studio.events`是幂等保存回执，两者不是同一种平台learning_events。未评分说明题维持pendingReview；自查与模型操作不是正确性证据替代品。

## D. 数学 thinking 与宠物深层状态

| 路径 | 必须保护 |
| --- | --- |
| `studio.thinking.<taskId>.*` | taskId,contentVersion,recordSchemaVersion,attemptId,revision,savedAt,phase,status,mode等 |
| thinking 首答/提交 | firstAnswer,firstAt,firstAssisted,firstScaffold,checks,reflection,finalAnswer,submittedAt,submittedScaffold；只追加后续证据 |
| thinking 辅助/教具 | help[],postReviewStudy[],tool,toolHistory[],scaffold含usedManipulative/usedAnswerValidation/withVisualScaffold/validationAttempts/matchedAttempts/legacyEstimate |
| thinking 复习 | reviews[],review.*,reviewStage,attempts[],variantIndex,seenVariantIds及所有历史与延迟日期；当前contentVersion `thinking.2026-10-08.1` |
| `pets.care.*` | version,friends,scene,decorations,daily,claims,receipts,memories |
| `pets.care.friends.<petId>.*` | growth,bond,meals,joinedAt,gifts等；与owned双向一致 |
| `pets.care.daily.*` | day,touches,plays；不能跨日重放互动作成长 |
| `pets.care.claims[],receipts[]` | 任务领取去重键；消费/互动收据id,action,result及全后代 |
| `pets.care.memories[]` | pet,kind,text,at,lessonId等；换主题保持归属，数学回忆未来可加英语来源 |

现存限制应写入保留说明：宠物memories最多160、receipts最多20000；thinking toolHistory最多30、历史attempts最多64；部分review history校验最多10000。迁移只能保留**来源现存**历史，不能承诺复原此前已裁剪记录。

## E. 英语 envelope、版本与全部顶层字段

localStorage键仍叫`kevin-wordquest:state:v1`、`kevin-wordquest:backup:v1`，其payload可能是schema V2；`kevin-wordquest:device-id:v1`是独立设备标识。不能按key后缀判断schema，也不能只备份仓库认为拿到了孩子记录。

可接受未来输入：portable envelope `format=kevin-word-quest-portable-record`, `formatVersion=2`, `exportedAt,summary,state`；以及原始V1/V2 state。保留完整文件bytes与summary，不把summary当逐词证据。英语portable没有与数学同样的checksum，服务器额外计算文件SHA-256；时间戳多为epoch毫秒，转换为ISO时需保留原值。

| V1/V2路径（所有后代递归保存） | 数据含义/目标 |
| --- | --- |
| `schemaVersion,migratedFromSchema,historyQuality` | 原始1/2、迁移来源、legacy-summary/mixed/event-log；只做保守升级 |
| `savedAt,updatedAt,revision,writerId,lastImport.*` | 来源版本/写者；lastImport的sourceSha256/importedAt/sourceSavedAt；平台revision另分配并保留sourceRevision |
| `profile.*` | 原姓名/avatar保留；旧mergeState返回固定profile，不可据此丢失来源自定义字段 |
| `settings.*` | bank,dailyGoal,coreBatch,practiceMode,sprintDays.{core2000,movers,ket,pet},autoSound,sound,typoAssist,showEnglish |
| `stats.*` | xp,coins,streak,bestStreak,combo,bestCombo,learned,reviewed,correct,attempts,lastGoalDate；金币/XP本阶段只是历史来源，不重算奖励 |
| `progress.<cardId>.*` | 各词卡状态；见F表；包括所有科目词库和custom |
| `lexemeProgress.<lexemeId>.*` | 按**确切表面词形**共享调度，不是lemma词根调度 |
| `orphanProgress.<oldId>.*` | 缺词卡进度及reason原样保留，恢复内容后再关联 |
| `unresolvedData.*` | savedWords、recognitionEvents、recognitionPlans及未知分支全量保留 |
| `coreExercises.<exerciseId>.*` | 原书练习结果与首次作答证据；见F表 |
| `badges.<badgeId>.*` | unlockedAt及所有来源属性；不再奖励已解锁徽章 |
| `scoreLedger[]` | id,xp,coins,at及未知字段；历史窗口，**不是可重放完整账本** |
| `attemptEvents[]` | spelling/cloze事件；见F表，保留eventId/deviceId/sessionId/sequence |
| `recognitionEvents[]` | 每周识词事件；cardId,selectedCardId,senseId,occurredAt,weekKey,correct,firstAttempt,sessionId,deviceId,sequence,appVersion |
| `recognitionPlans.<weekKey>.*` | weekKey,cardIds,startedAt；weekly checks不是另一个独立顶层weeklyChecks字段 |
| `attemptSequence` | 原设备序号；新设备ID独立，不能重用导致事件碰撞 |
| `customWords.<customId>.*` | 自选词与已导入AI词包卡片；见F表 |
| `savedWords.<cardId>.*` | My Words收藏/训练train,addedAt,sources[].{sourceTag,context,addedAt}；所有多重阅读来源都保留 |
| `today.*` | 当日冻结计划、未完成队列、草稿与sprint；见F表 |
| `history[]` | date,bank,learned,reviewed,xp等现存汇总 |
| `dailyCompletion.<date>.*` | completedAt,rewardEventId；阻止重发daily奖励 |
| `courseCompletion.<setId>.*` | completedAt,date,exerciseId等；课程完成和原书练习映射 |

没有独立的顶层`wordPacks`表。已导入词包体现为customWords/savedWords及内嵌图；尚未导入的`.wordpack.json`是独立私有内容来源，须以后由家长明确选择，不自动扫描上传。

## F. 英语深层状态与证据

| 路径 | 必须逐字段验证 |
| --- | --- |
| progress / lexemeProgress记录 | status,learnedAt,step,scheduleVersion,scheduleToken,lapses,correct,dueAt,lastSuccessAt,lastReviewedAt,lastGrade,initialModesDone；mastered→mature等旧规范化变化单列差异，不擅自换FSRS |
| attemptEvents[] | eventId,cardId,lexemeId,senseId,occurredAt,mode,source,cueType,firstAttempt,firstAttemptCorrect,usedHint,answerShown,nearMiss,answerCorrect,grade,durationMs,oldDueAt,newDueAt,sessionId,deviceId,sequence,appVersion,contentVersion |
| coreExercises记录 | responses,correctIndices,wrongIndices,attempts,completedAt,rewardedAt,firstAttemptAt,firstAttemptResponses,firstAttemptCorrectIndices,firstAttemptWrongIndices,firstAttemptAnswerKeyHash,submissions[],answerKeyHash,evidenceQuality |
| coreExercises.submissions[] | at,responses,correctIndices,wrongIndices,answerKeyHash；最终全对不补造首轮全部正确 |
| customWords记录 | id,word,pos,lemma,formType,en,example,context,sourceTag,englishOnly,acceptedAnswers,semanticAlternatives,spellingVariants,quizClue,visual.*,breakdown.*,tip,zh,ipa,custom,archived,archivedSavedEntry.*,createdAt,updatedAt |
| customWords.visual | image可能是data:image/webp/png/jpeg;base64或外链；原图、alt、emoji保留；迁媒体文件必须验证bytes hash与可恢复引用 |
| customWords.archivedSavedEntry | train,addedAt,sources[]；归档不丢进度，复原仍可恢复来源 |
| today计划 | date,bank,catalogUnavailableBank,goal,practiceMode,sprint,coreBatchId,coreExerciseId,planVersion,plannedAt,dueAllIds,plannedReviewIds,reviewBacklogIds,reviewCapacity,newLimit,estimatedMinutes,newIds,deferredNewIds,carryoverIds,learnedIds,practicedIds,dueIds,baselineDueIds,reviewDoneIds,studyCursor,tasks[],pausedAt,goalAwarded,completed,sessionXp,sessionCorrect,sessionMistakes |
| today.tasks[] | id,wordId,source,mode,status,attempts,hadLapse,assisted,usedAudio,nearMissUsed,attemptStartedAt,maskSeed,completedAt,hintIndices,draft,errorIndices,sprintPhase,sprintCycle,cleanPass,feedback.* |
| today.sprint.* | sessionId,day,scheduleKey,wordIds,phase,cycle,awaitingStart,mistakeIds,lastScore,roundHistory[].{cycle,score,mistakes} |

同表面词形跨词库共享lexeme调度；lemma关系只做词族链接。例如不同屈折词形不能因为同lemma被合并成一个拼写日程。同义词不能作为目标拼写的acceptedAnswers；semanticAlternatives、spellingVariants语义保留。

英语裁剪事实：scoreLedger500、history120、recognitionPlans60周、原书submissions20、sprint.roundHistory20。attemptEvents/recognitionEvents在所审代码的sanitize中按ID去重排序，没有同样的500条截断。不要把“账本只有500”推广成“所有答题历史只有500”。

## G. 内容、媒体、配置与运行资料

| 类别 | 迁移范围 | 验收/边界 |
| --- | --- | --- |
| 数学内容 | content/catalog.json、pilot lessons/thinking/design-index/methods、course-plan-v2、rollout、发布/撤教具/变式来源与builder | 原稳定ID和各版本冻结，planned/草稿/发布状态原样，不重构课程 |
| 数学引擎/UI | server、shared、src中学科工作台、复习、证据、PetsView，相关styles与public媒体 | 科目引擎提取仅改变依赖；保留已有测试及交互语义 |
| 数学宠物内容 | content/pets/catalog.json、宠物画像、食物/装饰素材、levels与礼物表 | 内容ID与库存拥有权分开；换皮不丢历史，授权待审 |
| 英语内容 | data/core2000.json、Movers/Cambridge来源、assets/words.js、core2000-answers.js及其它加载的词库/课程js | 使用builder迁移，保存idAliases、词卡/lexeme/sense、batch/book/exercise关系，名称“2000”不能代替实际条目统计 |
| 英语媒体 | Core阅读/练习图片与音频、Movers词图/短语图、custom内嵌图、SOURCES/归属清单 | 资源引用全遍历；TTS依赖设备声音，iPad实测；缺媒体只暂停相关模块 |
| AI词包模板 | templates提示词/空模板及已导入custom来源 | 不重新联网生成课程，不自动导入本地未跟踪词包 |
| 原代码历史 | 原仓库SHA、来源路径、许可、测试、构建脚本、lockfiles、课程builder | 可SHA归属复制或subtree；本轮仅文档，未来方式需ADR确认 |
| 学习备份 | 数学backups中的现存JSON、英语真正origin的主/备记录及手动恢复点 | 私有离线/加密备份，永不进公开Git；不假设最近一份就是最完整一份 |
| 家长凭证 | 数学parent-access.json及其凭证备份/恢复机制 | operational-only；不进subject_state或公开Git，不读/导出旧凭证；新平台重新建立授权或另行设计受保护迁移 |
| 平台配置 | public origin、NAS卷权限、时区、镜像版本、Serve配置、session secrets与恢复说明 | 非secret模板可进Git；secret只私有备份；旧live session失效，不克隆浏览器登录 |

## H. 迁移事务、对账与回退

1. **采集**：确认真实数学运行目录，在私有位置做一致性全库备份及逻辑envelope；确认WordQuest实际设备/origin，逐个导出，另保留当前主/备记录。记录来源SHA-256和时间；只读保留原件，实际数据不打印日志、不上传Git。
2. **预览**：校验格式/版本/大小/hash、逐字段覆盖与内容ID；产生exact/changed/unknown路径清单、旧账本一致性、未知词/课程/媒体清单。无法解释的差异阻止正式提交。
3. **身份选择**：家长确认learnerId与来源归属；同名不是自动合并依据。多设备英语记录并列保留，先做显式冲突报告，不用“最新时间”覆盖整个另一份记录。
4. **事务提交**：原件登记、subject_state、事件索引、import_receipt一起提交。receipt唯一`(source_system,source_sha256)`；同文件重复同learner返回既有receipt，不加余额；同文件试图绑定另一个learner返回409。字节变化但语义相同的文件另用来源event/legacy实体ID去重；不能仅靠文件hash防重复奖励。
5. **逐字段对照**：比较所有路径及数组；分别对math legacy/studio/thinking、四个英语词库/custom/orphan/unresolved做完整映射检查，时间/日期按Asia/Shanghai验证。派生索引的数量差异要解释，不能删除原始数据求“零差异”。
6. **恢复演练**：备份包括SQLite、原始导入快照、版本化内容、私有媒体和配置；在空目录恢复，通过integrity_check、全字段对比与UI继续学习。hash只能证明文件相同，不能证明语义保真。
7. **真实切换**：仅获批准后停止旧站写入，采集最终快照并重验；新库写后不能直接恢复旧库而不处理新增学习。回退先保留新库、新事件与审计，再按版本化逆迁移或重新导出兼容记录。

钱包Phase4另审：数学原账本只搬历史、不重新奖励；英语XP保留成就来源；英语coins可选不兑、单次开账或经批准纪念奖励，均用固定幂等迁移key。当前没有选择汇率、批准金额或余额，不实施任何一种方案。

## I. 未来匿名 fixture 验收矩阵

V1仅summary；V2事件；混合质量；同词跨库/词形差异；成熟/重学/暂停/缺词库；Core首轮失败最终全对/答案表变更；custom归档恢复/多阅读来源/内嵌图片；未完成sprint/draft；两设备同event相同/不同payload；重复同文件与重新导出文件；损坏hash/未知schema/未知字段；math宠物升级前后/重复礼包；撤教具与家长批阅/变式保持；事务中断回滚/卷删除重建/空目录恢复。正式migration tests必须断言原始快照和字段去向；本轮未创建或运行导入器。

代码依据：02文档源码链接；关键函数为math `freshProgress/validateEnvelope/normalizePets/validatePilot/validateThinking`，English `defaultState/mergeState/sanitizeProgressItem/sanitizeToday/createPortableRecord/lexemeIdForWord`。
