# 当前执行：Issue23 数学整站补齐与统一界面（尚未发布新版 NAS）

在现有 `codex/math-full-03-capabilities` / Draft PR #22（base PR #21）连续执行。用户要求所有数学功能、内部自测、同一 NAS 总验收完成后才集中独立审查；不按子模块暂停，不另建 PR/worktree，不合并 PR18/21/22。

## 已实装的本轮范围

- 固定活跃旧数学 PR1 `8292de85b40d6b2b5fba0f8b2dca359f5b2f821d`，对照冻结 `a7c05...` 的19个运行文件变化；定向获取84份教学源码/任务/测试材料，以及10包30宗已验证匿名示例。没有读取私密上传箱或学习数据库。来源按 blob SHA1、SHA256 校验，见 `evidence/math-onepass/*-source.json` 与 `source-import.json`。
- 保留70课六步/849题；补回70份原完整教案、18选择+52解释自查、段落跳转/例题/比较/方法/打印/本页笔记。11组撤教具测验沿用原五题 ID。
- 54旧高年级课分别配置有量纲、图形语义、参数操作、公式及反查的模型；原432题不变。已逐课打开768宽模型截图，发现并修复角图、剪拼、立方体、分数标签、单位、对比度等问题；五尺寸270页面及独立数学测试通过，不把这些等同于用户审美认可。
- 17已审思维卡复用原教具与首答/自查/提示/支架机制；28方法=原6完整指南+22明确标注“本次教学适配”的条件/解释/例子/反例/课堂链接。
- 侦探63案例=14原示例+30包内+3过程反例+16题族对照，8题族×256参数，18组对照；L1–L4与原四步骤分开，首答/反查/反馈/辅助证据门控实际可操作。已走通63宗分阶段表单及18组真实迁移；排序操作和响应丢失后幂等重试已修复验证。
- `packages/math-training` 复用原规则；SQLite/WAL/flock持久库只在 `NODE_ENV=test`、OS临时专用owner目录、显式私有认证注入下运行。真实HTTP会话/CSRF/实时授权/家长二次解锁/学习者隔离、SIGKILL恢复、定向备份恢复有测试。正式 `main.ts` 不注入，NAS镜像不包含认证/SQLite仓库/native addon。
- 匿名NAS仅内存：不写Cookie/localStorage/IndexedDB/真实学习记录；笔记与错题手记可在站内导航保留，刷新清空。私有“今天/继续/错题/到期”用原选择器及1/3/7/21复习，侦探1/3/7/14复测、时钟/辅助/家长审核皆为隔离合成测试，不声称匿名跨日保存。
- 统一设计系统、首页六路径、课本目录、课堂/练习/阅读/侦探/方法/复习和移动原生dialog已实装。LAN HTTP不依赖randomUUID/subtle，不要求HTTPS或Tailscale证书。

## 验证状态与接续

新增167项Node测试已经通过一次完整运行；已修正HTTP测试事件ID随机前缀导致的测试数据不合法问题，正在最终复跑。原60 Node /18 UI /12数学Node /9数学浏览器完整本地验证通过。新HTTP实际业务管道1298原题、非安全HTTP、五尺寸自查、54×5模型、70+54完整教案/28方法/11撤教具自查均已有通过记录，错题深链订正已通过，当前冻结最终运行输入。原849×3/84浏览器流程与原255能力流程也有通过记录，849最终输入对应证据已归档；255能力最终HEAD证明由本次CI重新生成；完整GitHub push/PR CI（包括Docker/Compose）仍待本次提交运行。

继续：完成剩余最终回归和截图自评，更新逐行为矩阵/54课质量证据；提交同分支并等双CI全部成功后，才用现有 `infra/math-preview/release.py` 和私密owner ledger受控更新NAS38444，运行新版本全量HTTP/浏览器/五尺寸截图和实际回退/恢复，保护11个既有容器不变。最后完成 `MATH-FINAL-ACCEPTANCE.md`、PROJECT_STATUS、交接/PR正文、最终HEAD双CI，集中交付一次审计。

**NAS现在仍是历史52e7814。不得把本地通过冒充NAS新版。** 实体手机/iPad始终标NEEDS_USER_ACTION，除非用户实际体验确认。43暂缓卡、168蓝图、旧重复三年级50课、真实账号/数据/积分/蛋仔不迁；旧数学和英语完全只读。唯一工作副本 `/Users/yako/Downloads/codex/kevin-learning-home-math-trial`。

## 以下为上一轮已验收的NAS状态（历史）

# Kevin 学习家园 · 当前交接

## 本批公开数学能力已交付NAS，暂停待独立审查

当前分支 `codex/math-full-03-capabilities`，Draft PR22（base Draft PR21），叠加顺序PR18→PR21→PR22。不要合并、继续英语、正式账号/真实成绩/钱包或蛋仔。最终精确归档HEAD push/PR CI见PR22正文；部署源码CI push40321010963/PR40321046913均成功。

入口 **http://192.168.2.100:38444/**，HTTP、免登录；部署源码 `52e781440b21a406286ac55bbfefdb6e06d119fe`，镜像 `sha256:fff4f09e498239605ba2106733e0aea9fcc56c39616266858e8871d2bbadebda`。容器 `07ac2a63bf2704ee23b091757a4f8cfd57b66c3ad7c69930afc04008a2c39932`，专用目录 `/volume2/homes/admin/klh-math-preview-20261025-c6ae9e7f`。只读根/零挂载/非root1024:100/256MiB/cpuset0，未修改现有权限、daemon、DSM或Tailscale。

70课/849题保留；新增17已审思维卡、54旧课/432题、14模拟侦探、28方法/6指南、自由复习244原题、11逆向深链、原打印入口。实际NAS三视口255新流程、449题+14案例HTTP、原849题/84流程、30/210课堂与目录导航通过；能力版→PR21→能力版回退/恢复通过。11受保护容器与旧合成文件hash不变。所有答案/操作仅页内存；无真实账号/学习写入/积分。

直接回退为PR21源码 `d835f8c7fbd5a341cc30cf44dea5c6dc62f65d12`，容器 `ae61af1c1b40524ac8a872eaf840321d98686e295afff2301325d94f05a6010b`、镜像 `sha256:15de948d7a34fe00286aee8b59b96bae48b81afce95478a56fb45c3fe30568c1`，均保留停止。更早R3/R2及初始合成单课未清理。仅用 `infra/math-preview/release.py` stage/activate/rollback 和既有私密 owner ledger；不要旧controller switch/rollback。不得广泛清理其他容器/镜像或删除ledger。

[完整报告](../implementation/MATH-FULL-03-REPORT.md) · [来源与未迁范围](../implementation/MATH-FULL-REMAINDER-INVENTORY.md) · [交付回执](../implementation/evidence/math-full-remainder/delivery.json) · [发布输入](../implementation/evidence/math-full-remainder/release-inputs.json) · [42张实际NAS截图](../implementation/evidence/math-full-remainder/screenshots.json)。198发布输入/13静态文件与部署源码一致；文档提交不能冒称新镜像。原位值大数展开bug仅新副本修正，旧站不变。

43暂缓卡/168蓝图不开放，54旧课沿用原通用教具、仍待逐课教学验收，22方法暂无完整指南。私密案例/个人错题与复习日程/奖励/正式身份均排除。普通Mac Chrome已实际打开并操作天平、撤销与返回首页；实体手机/iPad仍需用户实际体验，自动化视口不能替代。

沿用唯一工作副本 `/Users/yako/Downloads/codex/kevin-learning-home-math-trial`，Mac原快捷方式目录 `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 指向同一NAS。无新worktree或账号文件。旧数学与英语仓库/原网站/真实学习数据未修改。
