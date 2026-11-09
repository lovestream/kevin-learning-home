# 英语来源审计与接入映射

2026-11-09，Issue19 准备阶段。唯一来源 `lovestream/word-request@d0b42a8872a7e87433b96770519203630223b6f2`；不是无 Git 的旧副本，不读取工作区未跟踪的私人 AI 词包。

[逐文件清单](source-inventory.json)读取该提交的 Git blob：1881 文件，96,788,051 字节，记录 Git blob/SHA256/大小/发布核对状态；**未复制媒体或部署英语页面**。运行 `python3 scripts/english/audit-source.py /path/to/word-request docs/english/source-inventory.json` 可复核。脚本仅允许已跟踪的公开来源范围，排除学习备份与词包；4 项自动检查覆盖固定版本、工作区修改隔离、私人文件排除、授权/哈希缺失。

## 内容口径

- 核心词卡 1280，4 册、64 单元、128 个 A/B 学习组；标题中的“2000”不是当前可用卡数。
- Movers：247 单词与80短语；KET/PET 来源分别1811/3225条，原站词库不变量测试确认同拼写合并后分别1802/3222张学习卡，不能混用口径。
- 已跟踪本地录音0；原站 `assets/app.js:3098` 的 `speak`、`3124` 的顺序发音使用系统 speechSynthesis。不得把它标成原书真人录音或保证每台浏览器离线有英文声音；无可用语音时明确反馈，不影响阅读练习。

## 实际代码能力与迁移约定

以下行号对应固定来源提交，表示存在实现，不等于已经在新站验收。

| 原功能 | 来源 | 新站目标与限制 |
| --- | --- | --- |
| 教材学习/学习组 | app.js renderCoreHome 3577、renderCoreCoursePicker 4274；data/core2000.json | `/subjects/english`→词库→册→单元→A/B，保留 bankId/wordId/unitId/contentVersion |
| 词卡/英文定义/例句 | renderLearn 3757、renderBooks 4112 | 公开词卡白名单，图文忠实对应；不带私人 progress 或答案依据 |
| 系统发音 | speak 3098、speakSequence 3132 | 保留孩子主动播放和停止，不自动播放；检查实际浏览器语音能力 |
| 完形/全拼写 | renderPractice 3907、createAttemptEvent 4646 | 保留目标拼写与语义替换区分；首答、提示、重试分别记录，不能猜对最后一次就称独立 |
| 教材练习 | renderCoreExercise 4014、recordCoreExerciseSubmission 4940 | 题图/答案/单位与组ID一致，判分在受控科目服务，不提前泄漏答案 |
| 冲刺/当天计划 | buildDailyPlan 1955、renderSprintHome 3620 | 首批只做明确标记的 RAM 体验；不假称跨设备/隔天保存 |
| 词汇收藏/我的词 | renderNotebook 4245、saveWordToNotebook 5118 | 公开临时收藏可以做；个人收藏和自建内容走统一私有状态，不复制旧 localStorage |
| 私人 AI 词包 | renderAiWordPackPreview 5297 | 不读取/迁入私人包；未来家长审核后私有导入，无未设置的模型调用 |
| 复习/周检 | renderReview 4281、renderCoreReview 4319、renderWeeklyCheckup 4345 | 原科目规则决定可开始项；统一索引只是日期线索，不冒充新调度算法 |
| 统计/家长报告 | renderParentReport 4410 | 区分旧汇总/逐题证据；V1不能补造首答或独立掌握 |
| V1/V2便携备份 | createPortableRecord 5520、stateFromPortableRecord 5576 | 保留整个原封套/unknown/orphan/历史钱包；新服务拒绝未知版本覆盖当前状态 |
| 本地PK | renderPk 4536、startPk 5636 | 原站是本机玩法，不新增网络交友或排行榜；与真实奖励分离 |

## 授权状态：有文件不等于已批准公开传播

1790 个来源内容文件尚需核对分发/家庭使用范围；ECDICT MIT 许可文本保留不等于全部教材图都受 MIT 覆盖。80 个 Commons 短语图片逐项 SHA256 均匹配原清单，其中61项的作者/许可证/许可证链接/来源链接齐备，19项缺许可证链接。后者须补充可核对依据；不改原图哈希、不猜许可证、不自动联网补图。

`source-inventory.json` 的 publication 字段全部是核对状态，`publicationApproved=false`。不把这份技术清单当作法律授权结论。后续按可核对范围选择引用/家庭私有资源或清楚的图片占位，不静默把待核对媒体放入公开镜像；不会用这个环节改动旧英语站。

## 下一批退出条件

完整模块/稳定ID与深链接合同、公开数据白名单和素材范围确认 → 同壳英语学习与原规则适配 → 浏览器验证首答/提示/拼写/发音失败/回顾 → 同一个 NAS 内容容器实测与回退。私人记录启用独立走 Issue24，积分/宠物走 Issue20，不从匿名词卡点击发真积分。

本轮另以原站固定版本实际重跑词库、应用状态、冲刺计划、便携记录工具四组检查，以及桌面/手机首页、匿名样例词包、按筛选批量选词4个浏览器场景，均通过。使用独立临时端口和匿名浏览器，没有访问私人词包或真实localStorage。这是来源基线，不是新家园英语已上线的证明。日志见统一记录本批证据。
