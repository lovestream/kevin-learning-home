# Kevin 学习家园：数学课本目录 → 全量数学 → 英语 → 统一积分与蛋仔

## 2026-11-03：新增独立「探索与创造」——AI时代核心能力，而不是第三套课本

用户最新教育目标增加**主动发问/好奇心、独立判断、想象力、创造力**。已在[总任务#25](https://github.com/lovestream/kevin-learning-home/issues/25)和[完整实施文件](EXPLORE-AND-CREATE-ROADMAP.md)建立九个按依赖先后执行的子Issue[#26—#34](https://github.com/lovestream/kevin-learning-home/issues/26)。**这是跨学科活动模块**，不是数学课本的另一个名字或英语的另一种评分器；探索项目可以引用数学课程和英语词条，也可以来自生活与自然，不应为了增加积分强制每日打卡。

**与原先顺序的整合**：
1. 正在进行的数学PR18→21→22仍Draft，已有NAS数学功能继续保留；真正的数学学习历史仍待[Issue24](https://github.com/lovestream/kevin-learning-home/issues/24)私有保真迁入。
2. 可以立即执行[#26探索契约](https://github.com/lovestream/kevin-learning-home/issues/26)与[#27安全匿名视觉](https://github.com/lovestream/kevin-learning-home/issues/27)，和[Issue19英语迁入](https://github.com/lovestream/kevin-learning-home/issues/19)、[Issue24安全学习记录](https://github.com/lovestream/kevin-learning-home/issues/24)并行；不会阻断数学/英语。
3. 真实探索项目、首猜修订、照片、绘画、音频的长期保存[#28/29](https://github.com/lovestream/kevin-learning-home/issues/28) **只能依赖Issue24受信私有身份与存储**，禁止接入目前免登录HTTP38444匿名内容进程。AI教练[#30](https://github.com/lovestream/kevin-learning-home/issues/30)先无外部AI也能用的引导式追问；第三方模型和上传私人资料须单独授权。
4. 数学英语双向深链[#31](https://github.com/lovestream/kevin-learning-home/issues/31)、每周自选问题/家长回顾[#32](https://github.com/lovestream/kevin-learning-home/issues/32)有清晰计划，探索不因结果失败受罚。
5. 探索积分/蛋仔[#33](https://github.com/lovestream/kevin-learning-home/issues/33)只在[Issue20统一账本](https://github.com/lovestream/kevin-learning-home/issues/20)安全启用后按有证据里程碑计算，不能按提问数/AI次数发币；最终[#34](https://github.com/lovestream/kevin-learning-home/issues/34)整站验收。保留原旧数据/旧NAS服务和真实安全权限。
6. Codex以总Issue#25和分步Issue#26-34作为**完整任务清单**，按依赖执行并在各阶段自行测试修正，避免反复小步审批；涉及真实个人数据/证书/外部AI等安全切换仍必须另行授权。

**本次只更新GitHub任务和设计路线；未开发/部署新的探索栏目、未操作原数学/英语数据库或NAS。**

更新时间：2026-10-26。**本文件为当前产品路线与验收口径；所有真正实现仍以相应Draft PR、CI、NAS实测与用户验收为准**。

## 用户确定的长期目标
一个**NAS**学习家园，数学、英语、共同的积分和蛋仔养成，不是三套互不相关的网站。保留用户已认可的数学第一课六步教学视觉与原教具交互，后续模块继承一致的学科导航/移动端适配，但英语不必套用数学六步。当前没有正式账号/密码、不保存Kevin真实成绩和积分。正式登录、跨设备同步和真实积分另行开启。

唯一当前NAS体验入口：[http://192.168.2.100:38444/](http://192.168.2.100:38444/)。按[Draft PR18](https://github.com/lovestream/kevin-learning-home/pull/18)证据2026-10-26时提供免登录70课。原38443/旧8服务/真实数据库保持原样；不能把Mac`127.0.0.1:4179`当用户交付。HTTP仅限无真实身份/敏感数据的内网内容体验；将来登录和真实学习资料必须另审受信HTTPS与权限。

## 优先级、范围、完成定义

| 顺序 | 功能 | 当前真实状态 | 已指派的GitHub任务 | 真正交付定义 |
| --- | --- | --- | --- | --- |
| 0 当前 | 数学70课六步+原教具 | NAS R2 70/70教学已运行；但主目录仍平铺70课；PR18仍Draft | [PR18的R3课本目录审查](https://github.com/lovestream/kevin-learning-home/pull/18#issuecomment-6405768281) / [Issue15](https://github.com/lovestream/kevin-learning-home/issues/15) | **直接NAS打开**三年级上下册、17教材单元、知识点和7衔接课，返回单元、搜索、触摸/桌面可用，实测版本/回退通过 |
| 1 | 数学849道练习 | 未迁入；现第六步仅提示待接入 | [Issue16](https://github.com/lovestream/kevin-learning-home/issues/16) | 五组849题、首答/三项自查/终答、335解释题人工确认语义，同一NAS数学课可作答，不保存成绩 |
| 2 | 原数学其余可用能力 | 数学小侦探、17已审思维卡、可运行的高年级等未迁入 | [Issue17](https://github.com/lovestream/kevin-learning-home/issues/17) | 冻结旧站现有菜单/源/实际可运行项对照清单；可公开可用部分**部署到同一个NAS网站**；43暂缓卡/仅蓝图项保持未开放 |
| 3 | 英语 Word Quest | 目前新NAS英语为“待迁入” | [Issue19](https://github.com/lovestream/kevin-learning-home/issues/19) | `/subjects/english`真实词库/册/单元/词卡/发音/拼写/完形/临时回顾；源素材许可证审核，同一NAS可体验 |
| 4 并行设计/最后启用 | 数学英语共用积分/蛋仔 | 新站无统一真实账本及宠物状态 | [Issue20](https://github.com/lovestream/kevin-learning-home/issues/20) | 先审统一学习事件+防刷积分+宠物状态模型；正式账户及持久化得到单独授权**之后**实现，不能让匿名点击刷真实积分 |

这些顺序是开发/验收的优先级，不意味着等待数学高年级完成才可以做英语的只读来源审计。阶段开发可以并行准备、接口必须统一；对用户的NAS体验以实际交付为准。

## 已核实的课本知识目录：不要再将70课一次铺平

来源：`lovestream/math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279:content/course-plan-v2/grade-3.json`、`content/pilot/lessons.json`；当前PR18 `apps/preview/content/catalog.json`。

### 三年级上册：9单元39课
1. 观察物体 — 3课
2. 混合运算 — 12课
3. 毫米、分米和千米 — 5课（原教材计划2课，现成品补充3节扩展）
4. 曹冲称象的故事：质量与替换测量 — 2课
5. 多位数乘一位数 — 5课
6. 数字编码 — 1课
7. 线和角 — 3课
8. 分数的初步认识 — 6课
9. 复习与关联（含搭配问题） — 2课

### 三年级下册：8单元24课
1. 生活中的运动现象 — 2课
2. 除数是一位数的除法 — 6课
3. 长方形和正方形 — 3课
4. 图形的面积 — 3课
5. 数据的收集与整理 — 2课
6. 年、月、日的秘密 — 3课
7. 小数的初步认识 — 3课
8. 复习与关联（含重叠问题） — 2课

### 基础衔接与数学思维：7课（独立于17教材单元）
数量的意义、加法的意义、减法的意义、分数的意义、面积和周长、等量代换、天平与相等关系；保留原`numbers.* / geometry.* / algebra.*`课ID，不虚构为课本单元。

每个教材单元下按**真实知识点`units[].coverage[].topic`→该知识点对应的课**组织，课内分“课本主线B／本章提升E／数学思想O／复习R”，保持`textbookUnit.sequence`原顺序及原版扩展课；教材印刷页只来自真实`printedPages`字段。知识点可搜索且可从课堂返回原单元；任何课仍可自由学习、推荐先修不锁课。由于无正式账户，不假装“已完成/到期/领取积分”。

R3只重做目录导航/关联、文档、测试与NAS部署；**不改70课已经过关的教学美术和模型算法**。原数学站参考组件：`src/UnitLearningMap.tsx`、`src/LearningMapView.tsx`。新目录只能提取教材单元及topic白名单，不得打包包含答案/私有学习数据的原`grade-3.json.lessons[]`。

## 技术架构方向
- **同一个壳**：`/subjects/math`和`/subjects/english`共用品牌、学科菜单、响应式、无账号内容模式与课堂间导航。目录的年级/学期/单元/知识点是明确的数据层，不再靠长列表靠肉眼搜索。
- **不同学科的学习组件**：数学有六步/原教具/题组；英语有分册词卡/听发音/拼写/完形。两科不分别创建独立的登录、进度、积分、宠物服务。
- **数据与奖励从内容体验中解耦**：当下匿名无真实保存，完成只是当次互动；未来在正式身份/可靠HTTPS/服务端学习事件/备份恢复取得授权后，math和english才写同一学习事件和积分账本，宠物只读取同一受控账户。原数学Pet素材版权和实际逻辑先审计，不复制真实数据/私密资源。
- **NAS交付强制**：不能以GitHub提交/CI/localhost/视口模拟宣称“已上线”；每批只在自己的无数据预览容器滚动更新，审查源SHA/imageID/内容hash、真实NAS浏览器、前后旧服务/数据不变、回退验证。最终版本再更新项目状态和交接，保持Draft待独立代码复审。

## 本次记录和现实状态
PR18最新报告的NAS R2是**70课教学交付**，非70课按课本完成导航，也非849题或整个数学网站的完成。用户亲自发现平铺70课的问题，R3已要求Codex改同一PR18并回到NAS真实验收。英语/积分/蛋仔均属后续任务，目前**没有运行在新学习家园**。
