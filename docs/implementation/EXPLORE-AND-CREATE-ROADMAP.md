# Kevin 学习家园：探索与创造（Explore & Create）完整实现路线

> **2026-11-03 决策与Codex执行合同。** 总任务 [#25](https://github.com/lovestream/kevin-learning-home/issues/25)。本文件是**实施计划**，不是已经实现的NAS页面。当前数学内容仍通过[PR #22](https://github.com/lovestream/kevin-learning-home/pull/22)的NAS匿名预览交付；真实数学记录只完成保全与恢复验证，尚未导入新站。英语、统一积分、蛋仔尚未新站正式上线。旧PR18→21→22仍Draft，不得从旧main覆盖当前数学成果。

## 1. 核心教育目标（为什么存在）
探索与创造是跨学科的**自主认知活动**，不是数学课本目录换名字，也不是多做一组AI问答。目标是培养好奇心/主动提问、独立思考、想象力、创造力，建立“提出问题→形成想法→验证→反思与改进”的持续能力。给Kevin保留自己的原始想法和推翻它的证据，比产出正确答案/漂亮作品更重要。

**行为原则：**
- Kevin自己提问题可直接创建，来源为AI或家长的只能标注建议，不可冒充儿童自主提问。
- 记录第一次真实猜想且不可被AI/家长静默覆盖。先自己想，再按需向AI求助。
- 猜想错误、实验失败、结论不确定和长期未完成，都可以是有意义的学习；不扣积分、不强制完成、不以提问/上传数量衡量好奇心。
- 每周建议从问题库主动选**一个**深入探索，其他问题留存；不是任务配额/每日打卡/自动扣分。
- 想象作品（故事/模型/图画）与关于现实的证据结论清楚区分。线下实验优先安全、低成本、家长可参与，不让儿童单独进行危险实验。

## 2. 一个真实儿童活动的流程
1. **我发现问题**：自发输入/可选绘图或录音，标注来自生活、课本、书、英语单词或别人建议。
2. **我的第一种想法**：先写/录自己的猜想，或“现在还不知道”；第一次想法按版本封存，孩子可随时补充，不先自动弹AI答案。
3. **准备怎么验证**：观察事物、换条件做实验、画图、查可靠资料、问别人、做一个模型或比较两种解释。
4. **我看到了什么**：分别记录“亲眼观察”“资料引用”“家长说明”“AI建议”，可以有照片/绘画/简短音频；事实和自己的解释分开。
5. **我改变了什么看法**：与首猜对比，哪个证据支持/反对，仍有什么没解决；可推翻原结论或继续提出新问题。
6. **我的创造**：可选作品、模型、改写故事、英文讲述、图解和新项目；无需每次都出作品。
7. **以后再看**：保存项目和全过程版本，家长只看证据与孩子的思路发展，不给综合创造力分数。

**示例仅作设计测试，不代表Kevin真实提出过**：
- 科学：月亮为什么看起来有不同形状？先观察/画连续变化、寻找可信解释。
- 数学：从盒子不同方向看，为什么图片变了？从G3-U01关联到自主实验，再回原课堂。
- 英语：同一件事如何用三种英语问法提问？从未来Word Quest词条关联，自己改写一个对话。
- 设计创造：用纸板做一个能区分观察方向的玩具，记录第一版与修改后的结构。
- 失败项目：原猜测不成立，保留原猜测与反例，结论“还不能确定”，照样归档。

## 3. 信息架构与产品界面
独立一级导航：**学习家园 / 数学 / 英语 / 探索与创造 / 成长家园（未来）**，新入口`/explore`属于同一应用壳`DesignShell`，**不建独立网站、登录、数据库或奖励系统**。学科入口与跨学科活动模块是不同领域，探索不需要假装成为一门新课本课程。

| 入口 | 儿童的操作 | 进入项目后 |
| --- | --- | --- |
| `/explore` 探索首页 | 我想弄明白一个问题；最近的问题/发现（私有模式） | 今天可以只记一句问题 |
| `/explore/questions` 我的问题库 | 自发新增、搜索、选一个开始、保留未处理 | 每周建议一个但可自由选任意项 |
| `/explore/projects` 正在探索 | 我最初猜…我准备…我看到…原来…我还不知道… | 版本化的证据/反证/过程及继续按钮 |
| `/explore/creations` 我的创造 | 模型、图片、图画、故事、设计、英语表达 | 作品注明原创/家长协助/AI参与 |
| `/explore/archive` 发现档案 | 搜索历史探索、改变猜想的过程、引出新问题 | 仅本人及获准家长查看私有项目 |

视觉承接数学PR22的已统一色彩、字体、响应式与导航，探索工作台优先显示**一个问题＋当前可做的小步**，把证据与资料放在次级区域，不堆页面/进度卡/勋章。三年级孩子可以一两分钟记录问题，长项目跨周而不被判“逾期”。完整录音/图片不应因为孩子不愿意分享位置/人脸就无法继续。

## 4. 数据与隐私（必须优先遵守）
现有NAS `http://192.168.2.100:38444/` 是隔离的无账号HTTP内容体验：无AuthService/SQLite、零真实挂载、匿名RAM刷新即清空。**不准把Kevin的真实问题/语音/照片/作品/学习记录写进这里或通过它请求外部AI**；只能有脱敏公开示例＋纯本页内存试用（无个人数据出站、无localStorage、无照片/录音上传）。页面明确提示“预览不保存”。

正式探索项目必须依赖[Issue#24安全学习者/存储](https://github.com/lovestream/kevin-learning-home/issues/24)：安全会话/孩子与家长权限、受信传输、版本/幂等/WAL与备份恢复、跨设备授权。不要降低原`packages/auth/config.ts`生产HTTPS要求；家长审核或传递给AI需受控授权。**真实资料导入、私有媒体写入或正式切换**为独立安全审批关口；本轮先建立问题/代码/匿名示例/合成测试，不操作NAS旧38443、8正式服务/真实数学数据库、DSM/Tailscale/证书。

探索领域对象建议：
```ts
type ExploreProject = {
  projectId: string;
  learnerId: string;
  questionId: string;
  origin: "child" | "parent-suggestion" | "lesson" | "ai-suggestion";
  question: string;
  status: "idea" | "active" | "paused" | "uncertain" | "archived";
  subjectRefs: Array<{subjectId:"math"|"english"|string; contentId:string; contentVersion:string}>;
  firstHypothesis?: {text:string; recordedAt:string; assistance:"none"|"parent"|"ai"};
  currentRevision: number;
  artifactIds: string[];
};
type ExploreEvent = {
  eventId:string;
  projectId:string;
  learnerId:string;
  kind:"question"|"hypothesis"|"plan"|"observation"|"source"|"revision"|"creation"|"reflection";
  recordVersion:number;
  assistance:"none"|"parent"|"ai";
  recordedAt:string;
  payload:unknown; // explicit per-kind validated schemas, not arbitrary object in API
};
```
以上为**草案**，最终`EXP-00`会根据Issue24现有subject_state与学习事件合同冻结可校验类型；不能直接把样例的`payload:unknown`照搬成不受检验的生产输入。儿童私有记录不能写GitHub issue或浏览器URL，音图要去位置元信息、防脚本/大文件、私有读写授权并可回滚。语音识别/多媒体AI解析默认关闭。

## 5. AI教练与独立思考
第一版**没有第三方AI也能用**，采用安全的结构化追问：
- “这件事你自己猜是什么原因？”
- “如果换一个条件，你觉得会怎样？”
- “你看到了什么？和原来想的是一样的吗？”
- “你能设计一个例子来反驳自己的猜想吗？”
- “哪些是你看到的事实？哪些只是别人的说法？”
- “还没有弄明白的地方是什么？”

AI可按`ask-back → hint → alternatives → check-sources`等级逐渐给帮助，不自动替儿童提交/覆盖第一版。真实联网模型/密钥、外传资料、收费、保留政策和儿童隐私需家长单独批准，失败有离线追问退化方案。不强行要求每个项目使用AI。对危险现实实验给安全的低风险观察替代或请家长陪同，不能输出违法/危险操作步骤。

## 6. 与数学、英语、记录、奖励的统一关系
- **数学**：70六步课堂、849练习、数学侦探L1-L4、17思维卡、54旧课都可从当前知识点`subjectRefs`跳到探索工作台，创造变式/验证/模型制作；探索反向跳回原课，保留原题`contentVersion`，**探索不是评分正确/独立掌握**，不可影响原首答/反馈门控。
- **英语**：[Issue19](https://github.com/lovestream/kevin-learning-home/issues/19)的Word Quest CORE/Movers/KET/PET词库、听写拼写、故事改写和口语提问，可发起英语创作/观察、并从探索回到原单词；`wordId/bankId/version`链接必须准确。英语本身仍由英语引擎复习评分，探索无权替它修改。
- **统一学习记录**：跨科`learnerId`和事件幂等，不新建第二个记录系统；借助等级与资料来源和时间线留痕。问题可以跨多学科，也可以完全不关联学科。
- **积分与蛋仔**：[Issue20](https://github.com/lovestream/kevin-learning-home/issues/20)正式账本统一处理，不能依赖提问数量/AI回答长度/上传图片次数给币。少量有证据的过程里程碑（自己问、自己猜、拿到观察证据、亲自改变想法）可经授权、上限、幂等后作为候选奖励事件；**失败不罚**。蛋仔可生成私有“我们探索过什么”回忆，但不开放个人作品到匿名页面、也不把数学/英语旧钱包相加重放。
- **未来学科**：探索引用支持今后语文、地理、科学、物理、化学，但不提前开发不存在的正式课程。

## 7. GitHub任务、依赖和Codex的执行顺序

| 层级 | Issue | 交付 | 依赖与并行 |
| --- | --- | --- | --- |
| 总控 | [#25](https://github.com/lovestream/kevin-learning-home/issues/25) | 真实范围、统一进度与验收 | 持续更新 |
| 0 合约 | [#26 EXP-00](https://github.com/lovestream/kevin-learning-home/issues/26) | 页面信息架构、探索事件/权限契约 | **先做**；依赖Issue24合同对齐 |
| 1 页面 | [#27 EXP-01](https://github.com/lovestream/kevin-learning-home/issues/27) | 同NAS一级导航/四入口/安全匿名预览 | 依赖#26；可以先上线公开示例 |
| 2 存储 | [#28 EXP-02](https://github.com/lovestream/kevin-learning-home/issues/28) | 安全私有问题/项目/版本/保全 | 依赖#26及[#24安全底座](https://github.com/lovestream/kevin-learning-home/issues/24) |
| 3 媒体 | [#29 EXP-03](https://github.com/lovestream/kevin-learning-home/issues/29) | 照片/画板/音频与作品版本 | 依赖#28 |
| 4 智能引导 | [#30 EXP-04](https://github.com/lovestream/kevin-learning-home/issues/30) | 追问模板/可选AI教练/儿童安全 | 纯模板在#26后可并行；真实AI依赖#28+单独授权 |
| 5 学科联动 | [#31 EXP-05](https://github.com/lovestream/kevin-learning-home/issues/31) | 数学英语双向深链/学科事件 | 数学可先做；英语真实路由依赖[#19](https://github.com/lovestream/kevin-learning-home/issues/19) |
| 6 自主回顾 | [#32 EXP-06](https://github.com/lovestream/kevin-learning-home/issues/32) | 每周自选1题、家长查看、发现档案 | 依赖#28；附加媒体可后接 |
| 7 奖励桥 | [#33 EXP-07](https://github.com/lovestream/kevin-learning-home/issues/33) | 过程里程碑与统一积分/蛋仔契约 | 合约可先做；真实发奖依赖[#20](https://github.com/lovestream/kevin-learning-home/issues/20)和#24 |
| 8 终验 | [#34 EXP-08](https://github.com/lovestream/kevin-learning-home/issues/34) | 全栈NAS/跨设备/隐私/备份/学习验收 | #26-#32完成，真实奖励另过#33安全门禁 |

### 给Codex的统一操作纪律
1. **本轮工作只是提前写全任务**；Codex启动后按#26 → #27，并等待#24的安全接口合同后推进#28；#29/#30/#31/#32可根据依赖并行实现，#33合成设计，最后#34验收。不要每建一个字段或页面就来请求ChatGPT做中间审计；每完整模块自己自测/修正，再统一提Draft PR供审。
2. 最好先确认PR22功能基线与math/english服务接口；**不要从滞后的main覆盖最新数学**。不要删除/复制多余本地worktree，也不要修改原math-learning/word-request数据库或真实NAS账户配置。
3. 公开仓库只提交合成fixture、版本schema、测试、视觉截图（不含真实孩子个人输入），包含可追溯sourceSHA/commitSHA/NAS运行版本/回退证据。主任务/子任务必须持续更新状态，**仅GitHub创建任务不代表Codex开始执行**。
4. 个人项目、音图、真实历史不能发布在HTTP匿名内容端口。任何数据上传到第三方AI、持久身份开启、NAS证书或Tailscale/DSM变更都必须作为单独授权事项。
5. 整体视觉需要像统一的学习家园，**不是做出一套完全不同的“探索App”**；数学、英语、探索都应让Kevin自己理解“我在哪里、能做什么、下一步是什么”。

## 8. 最终真实验收口径
三视口及实体设备、键盘/touch；从原数学课和英语词卡进入探索再返回；孩子自由提问→首猜封存→独立验证/观察→补证据→认知修正→创作→回看；刷新重启与跨设备私有历史完整；家长建议不覆盖孩子首答；AI离线降级与可选受权外传；未完/失败/不确定不降级；零虚假掌握/积分；身份/媒体隔离/审计日志不泄儿童内容；NAS旧数学/英语服务不受损且能实际回退。

**目前状态：规划任务已写入GitHub，探索模块代码、NAS新入口、真实私有项目与积分尚未部署。**
