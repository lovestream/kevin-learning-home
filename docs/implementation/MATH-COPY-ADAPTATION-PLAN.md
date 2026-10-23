# 数学模块复制适配方案（待独立审查，未接入）

2026-10-23。用户批准的顺序是02B合并、NAS合成试运行、先数学复制适配规划，再英语。本文是下一次开发的可审查方案，不代表70课已复制、学科已启用或真实记录已经迁移。

## 冻结边界与核验依据

旧数学仓库冻结为 `a7c05aaa8d9c5eabae4f3453807f830da1cbf279`，英语只记录冻结点 `d0b42a8872a7e87433b96770519203630223b6f2`。全部读取使用 `git show <SHA>:<tracked-path>`，没有运行旧仓库的prebuild/pretest（它们会重生成内容），没有打开data目录、备份、真实记录或英语现有未跟踪词包。数学工作区保持干净；英语原有1项未跟踪文件保留。17个候选源码文件的SHA256与课程清单摘要见[冻结证据](evidence/02b-nas-trial/source-freeze.json)。未来只复制明确白名单至新仓库，任何改动不反向同步旧站，不使用旧站目录符号链接或数据卷。

冻结版本中，`content/pilot/lessons.json`有70个唯一lessonId，首例`G3-U01-B01`，4个contentVersion，70项status均为draft。这是现有元数据事实，不能改成“70课正式验收通过”，也不能据此重写或重编号课程。生成源`content/pilot/source.mjs`及其依赖、生成清单和build脚本需一起保持来源关系；`content/catalog.json`由脚本生成且被gitignore，不能当作已跟踪权威源盲目复制。

## 需要适配的准确差异

| 范围 | 冻结数学源码 | 当前学习家园main | 适配决定 |
| --- | --- | --- | --- |
| 身份/访问 | `server/index.mjs`固定127.0.0.1/localhost，单家庭状态；`parent-access.mjs`本地PIN与家长cookie | actor、learner_grants、安全会话、二次解锁；LAN精确HTTPS Origin | 不复制旧HTTP服务或PIN认证；所有路由由KLH认证与授权，学习者从已验证身份取得 |
| 状态存储 | `server/store.mjs` SQLite WAL/FULL；progress表CHECK(id=1)整份JSON，含profile/settings/wallet/pets/studio等，事务mutate | learning.sqlite版本2；按learner/subject的状态、命令回执、事件；唯一flock writer | 复制纯状态转换逻辑；用KLH事务适配器按learnerId+math分区，绝不直接挂旧progress.sqlite |
| 写接口 | `/api/studio/{reading,sessions,draft,help,self-check,attempt,note,thinking}`、`/api/{attempt,retell,purchase,...}` | 正式学习写路由仍封闭；commandSchema限定foundation-demo/synthetic-v1/observe-reading | 单独评审数学命令schema、鉴权和幂等，再逐动作放行；不能仅切换注册enabled=true |
| 判题/证据 | `shared/pilot-math.mjs`、`server/pilot-store.mjs`；publicTask隐藏expected/hint/solution/diagnostic等，含selfCheck、revision、eventId | SubjectModule目前只有listCourses/getDue/getParentReport契约 | 保留原判题与答案隐藏规则；新增适配层，禁止把完整答案随课程下发或信任客户端得分 |
| 课程视图 | ChildClassroom/Practice/TeachingDiagrams等，依赖相对API、全局CSS、public资源和共享模型 | React19.3/Vite8外壳、侧栏、权限失效遮蔽 | 复制后命名空间CSS与API封装；不在iframe运行旧服务，不重做教学顺序；升级依赖逐项回归 |
| 内容/资源 | lessonId、editorialRevision、contentVersion、task.id、assetIds及图形/打印模板 | 内容manifest、asset版本/hash/授权/storageKey；媒体MIME白名单目前没有SVG | 清点依赖闭包后逐项映射；SVG/打印模板先作安全设计再扩展；不复制教材原图或未确认授权素材 |
| 积分/蛋仔 | 同份数学progress.wallet与pets，服务端奖励/扣款含去重逻辑 | 公共wallet禁用；英语仍独立 | 数学兼容余额仅math内部，英语余额不动；首个试点不开放奖励/购买/蛋仔。若学习动作必须奖励，需单独审查math内部事务策略后启用 |
| 家长功能 | 本地PIN、人工复核、侦探inbox同步、导入导出 | 家长授权范围+二次解锁，尚无课程报告 | 报告只读取获授权learner；人工复核后置；不复制inbox后台同步/导入/恢复/运维端点到学习者API |

## 首个试点的合同草案（尚未实施）

- 固定subjectId=`math`，保留原lessonId/taskId；contentVersion保留源值并由manifest绑定精确源码/资源hash。editorialRevision与状态revision分开。不要将不同内容版本的判题对象混用。
- 读接口拟为`GET /api/v1/subjects/math/courses`及课程公开视图；复用SubjectModule契约。服务端基于当前会话校验学习者，家长必须解锁且有grant；不接受任意query learnerId绕过范围。
- 写入拟沿用commandId、expectedRevision、contentVersion、serverAttemptId、action、input。主体learnerId即使在DTO出现也必须服务端匹配已验证身份；任何会话/attempt只属于同一个learner+subject+内容版本。开始session、读课保存、草稿、首答、自查、最终提交分别有严格schema，不开放任意JSON补丁。
- 每个命令在同一SQLite事务中做授权复核、revision条件检查、原纯函数执行、subject_state更新、receipt和learning_event落盘；同commandId+相同规范化payload返回原结果，不二次奖励；换payload拒绝。旧eventId映射规则必须有fixture，不能直接把旧进程的内存去重当成跨重启保证。
- revision冲突返回409并提示重新读取；内容不匹配、答案形状非法、未授权跨孩子、重复提交、旧attempt重放均明确拒绝。客户端不能提供正确答案、钱包金额、任意learner状态。GET读取不得隐式奖励或推进进度。
- 第一片建议选现有`G3-U01-B01`做阅读/控件保存；只在合成账户上验证一个现成课的完整依赖和阅读证据。先不全量70课，不重新设计教学，不导入真实记录。是否进入练习、奖励和正式家庭使用由后续任务书分别确认。

## 按依赖拆分的独立PR建议

| PR | 交付 | 验收/停止线 |
| --- | --- | --- |
| MATH-00来源清单 | 白名单、依赖闭包、版本/hash、许可证/私有资源说明，来源README；排除data/.env/备份/密钥/inbox与旧HTTP启动器 | 旧仓库hash/status不变，新仓库无真实数据；review后才复制 |
| MATH-01只读课程片 | 一个冻结课程、所需纯视图与模型，SubjectModule读适配、资源manifest；写入口仍封闭 | 与旧课同内容同ID；家长/孩子范围、答案不泄露、三视口/键盘、CSP；无奖励与学习写入 |
| MATH-02阅读持久化 | SQLite增量迁移（如有必要）、受控阅读命令、serverAttempt/revision/receipt，复制转换逻辑的等价fixture | 并发标签409、网络重试幂等、不同孩子隔离、SIGKILL后恢复、备份恢复；原60/18/Docker不丢 |
| MATH-03练习闭环 | 复用createSession/saveSession/selfCheckTask/submitTask，帮助/答案访问与人工复核边界；奖励若启用必须数学域内单独设计 | 冻结数学判题/首答/帮助/复习fixture逐项等价，提交/重放/奖励原子性；英语钱包与宠物不动 |
| MATH-04分批扩大覆盖 | 单元依赖闭包逐批接入，保留draft/review元数据，逐批清单与内容diff | 不因“复制”宣布课程验收；NAS合成/实体设备、内容独立审查后扩大 |
| ENGLISH-00后续规划 | 独立冻结与复制适配提案 | 不抢先复制词库/真实词包；不并钱包/蛋仔，不改word-request |

每个PR均先Draft+完整CI+来源和执行报告，交给ChatGPT独立审查，不默认连续合并。全部接口路径/存储演进在相应PR中先形成任务书；上表不是已经存在的API。

## 正式使用前仍需单独验收

真实家长初始化、恢复码/密钥保管、持续HTTPS方案（LAN/Tailscale即可，无需公网）、加密异地备份与新卷恢复演练、Node24在DSM旧内核上的长期维护路线、实体Safari/Android/iPad、故障回滚和私有内容许可。当前试用证书和合成密码不可延用为生产配置。原数学/英语网站整个过程中仍可独立运行；迁移真实历史记录是未来单独授权的操作。
