# MATH-FULL-03 · 其余成熟数学能力接入

## 状态

分支 `codex/math-full-03-capabilities`，从 PR21 最终归档 `a7968501d29aa38dafb36bf7c983ed67a96cb5cc` 建立，继续同一个工作副本，不创建新 worktree。PR21 的源码 `d835f8c` 已在 NAS 交付 849 题，最终归档 push 40314421970 / PR 40314426390 均成功。

**已交付同一 NAS：[打开学习家园](http://192.168.2.100:38444/)，HTTP、免登录。** 独立 [Draft PR #22](https://github.com/lovestream/kevin-learning-home/pull/22)，base PR21。部署源码 `52e781440b21a406286ac55bbfefdb6e06d119fe`，镜像 `sha256:fff4f09e498239605ba2106733e0aea9fcc56c39616266858e8871d2bbadebda`；源码完整 [push CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40321010963) / [PR CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40321046913) 均成功。后续仅文档/证据提交不会冒充部署源码，最终归档 HEAD 双 CI 精确链接见 PR 正文。

实际 NAS 三视口 255 完整能力流程（402334 ms）、全部 449 题及 14 案例 HTTP、原 849 题/84 流程、30/210 课堂及教材导航全部通过。能力版→PR21→能力版真实 HTTP 回退/恢复通过，PR21 容器和镜像停止保留。11 个受保护容器与旧合成数据/证书文件 hash 不变；无真实学习写入。198 发布输入和 13 静态 seal 文件与测试构建一致。

[交付回执](evidence/math-full-remainder/delivery.json) · [逐能力矩阵](evidence/math-full-remainder/capabilities.json) · [范围总账](evidence/math-full-remainder/scope-register.json) · [实际 NAS 浏览器](evidence/math-full-remainder/browser-nas.json) · [HTTP](evidence/math-full-remainder/library-http.json) · [回退](evidence/math-full-remainder/rollback.json) · [发布输入](evidence/math-full-remainder/release-inputs.json)。42 张截图已由实际 NAS 页面重新生成，截图清单标明来源；另有普通 Mac Chrome 实际点击首页→思维卡→天平等量操作→撤销→首页及两张原生截图通过，没有绕过警告或修改设置；实体手机/iPad仍待用户体验。

本地最终三视口255流程/85条目、原849/84、30/210、导航和完整60/18/12/9基线通过；新增8 Node、原练习6 Node、预览21 Node、11部署保护测试通过。源兼容 golden 为432确定题、17解释人审。CI还完成Compose1.28.5和容器恢复回归，未跳过既有门禁。

## 实现

[完整来源与范围清单](MATH-FULL-REMAINDER-INVENTORY.md) 已逐项区分实际运行内容、暂缓/蓝图和真实数据功能。同一数学导航接入 17 已审思维卡、14 匿名模拟侦探、四至六年级各 18 旧版课/432 题、28 方法条目（6 完整指南）、自由复习 244 题及 11 逆向原题深链，原折纸打印入口保留。书本目录仍先显示三册入口，不再平铺 70 课。

基题 17 卡的文字解释只人工核对，3 个原思维教具保持探索、撤销/重置；其它卡有原条件图。14 案例保留判断、首错行、原乱序理由、数值/选择/排序改正与反查，独立首答→三项自查→终答→参考过程；没有案例库写入或勋章。54 旧课保留六类主题、原教学文本、8 题/课与 7 类实际通用教具，明确旧版试学，不冒充新审定教材课。

54 课/17 卡复用原临时练习组件与原纯数学评分器，保留原 70/849 独立 bank 与全部 ID/版本。只增显式 apiPrefix/可见组/初始组参数和原题深链定位；不引入新登录、任务完成记录、钱包或宠物。原来源 factory 在新临时目录构造内容，未执行旧 I/O 脚本；目标来源 hash 和每个映射见 [source.json](evidence/math-full-remainder/source.json)。

唯一数学模型修正：旧位值模型在 306040 等大数下只看百/十/个位，出现错误展开式并夹值 999。新副本用明确分支适配到亿位，保留计数单位、完整展开与十位增减；0/6/99/346/306040/4070500/999999999、边界和三种原思维模型都有独立不变量测试。旧仓库不变。

## 接口和运行隔离

- GET `/preview-api/v1/library/catalog`：严格白名单，71 内容条目、14 公开模拟题条件、28 方法及 11 原题索引；没有题库答案、案例结论、首错行、参考理由键或来源私密信息。
- GET `/preview-api/v1/library/lessons/:id`：71 个内容对应的安全练习 DTO，原 432 旧课题及 17 人审解释适配；没有 expected/solution/hint 等首屏字段。
- POST `/preview-api/v1/library/grade`：复用原无状态 schema/纯评分器，限定在本库题目，17 解释只 pendingReview。
- POST `/preview-api/v1/detective/grade`：严格独立首答/三 true 自查/终答 schema；只按当前 14 个编写模拟案例核对，oral 即使未来出现也只人审。

三种临时计算端点共用 16 KiB、5 秒、同源 Host/Origin/peer、JSON 类型与跨站拒绝保护；其它写方法及正式 API 仍拒绝。无学习 DB/身份/上传箱/store 导入，没有会话 cookie 或浏览器持久化。私有作者答案只在服务端，静态路径 404；构建绑定来源与 bank hash，seal 同时绑定公开投影。额外 UI 懒加载，独立 CSS 加 `.library-page` 作用域，不污染原课堂。

## 测试

新增 8 项 Node：冻结来源/17+43/54+432/14/168 精确分类、449 源兼容 golden（432 确定、17 人审）、14 案例正误/排序/分数与 oral 人审、投影隐私、全 API 与边界、篡改拒启、多位值独立守恒、三种原思维模型不变量。源兼容不是对全部 54 旧课做了新教材教研审定。

真实前后端三视口：每视口实际进入全部 17 卡、54 课和 14 案例，共 255 完整流程；所有 432 题组入口、7 类教具实际操作、方法搜索/6 指南筛选/空态、70 复习入口/244 原题、11 逆向深链、刷新与零持久化/CSP/无外联。保留原 60 Node /18 UI/12 数学 Node/9 数学浏览器、原课堂 30/210、17 单元导航、849 题/84 流程及 Docker/Compose/恢复全部门禁。仅把 CI 超时上限扩至 35 分钟容纳新真实浏览器测试，没有跳步/软失败。

早期新目录浏览器验证发现客户端重复 canonical 化导致 hash 拒绝展示；保持失败遮蔽，修正为对对象做一次 canonical/hash，未放宽校验。随后真实 UI 首轮 255 流程通过；最后加入原逆向索引和方法筛选后重跑最终完整证据，不拿旧截图冒充新源码。

复现：`python3 scripts/math-full-03/import.py ../math-learning`（只读冻结源），`npm run build:math-preview`，`node --test tests/math-full-remainder/library.test.mjs`，`node tests/math-full-remainder/browser.mjs`；CI 不下载旧仓库。归档脚本校验所有测量文件 hash 后才生成 85 个条目矩阵和截图清单。

## NAS 环境与测量边界

DS918+、x86_64，DSM7.1.1-42962 Update6、Linux4.4.180+、Docker20.10.3、Node24.15.0，见[只读环境记录](evidence/math-full-remainder/environment.json)。复用已批准的内容预览隔离目录，仅替换其38444入口；零挂载/只读根/256MiB/cpuset0，不用学习数据库。原正式SQLite/Auth底座继续由既有CI验证，本轮不将无DB预览测试冒充NAS生产数据验收。

| 实际 NAS LAN 测量 | 数量/时长 | 评分延迟 p50 / p95 / 最大 |
| --- | --- | --- |
| 原三年级题目 HTTP | 849题，7137ms | 6.27 / 12.66 / 79.13ms |
| 新旧课/思维题及模拟案例 HTTP | 449题+14案例，4473ms | 6.70 / 10.93 / 78.03ms |
| 新能力浏览器 | 三视口255流程，402334ms | 完整操作耗时，不是页面加载指标 |
| 原练习/课堂浏览器 | 84流程133871ms；210场景134924ms | 完整操作耗时，不是吞吐量压测 |

合成浏览器验证期间单次采样约32.3MiB/256MiB、CPU1.24%；只是瞬时观测，不推断长期容量或十年硬件稳定性。无新增付费服务/订阅。此次NAS未出现新启动/评分错误。三年级解释335题及新思维17题始终人审；源兼容golden不能替代高年级逐课教研。

[普通Chrome核对记录](evidence/math-full-remainder/native-chrome.json)与`native-home.jpg`、`native-thinking.jpg`为本轮真实Mac Chrome；[源码CI完整步骤](evidence/math-full-remainder/source-ci.json)对应部署SHA。NAS HTTP/回退探针文本也归档在同证据目录，保留原`.evidence/math-full-remainder/`相对导入与输出路径，以便在项目根复现；标准库/浏览器测试源码位于`tests/math-full-remainder`，CI不连接NAS。

## 暂停点与限制

实际 NAS 更新/回退、证据、执行报告和交接归档，并确认最终 HEAD 双 CI 后保持 Draft，等待 ChatGPT 独立审查；不合并、不开始英语或正式数据/奖励阶段。43 暂缓卡、168 蓝图、私密记录及生产部署不在本批。普通 Mac Chrome 已实际验收首页、天平操作/撤销及返回；实体手机/iPad仍待用户亲自体验，自动化视口不冒充实体设备验收。
