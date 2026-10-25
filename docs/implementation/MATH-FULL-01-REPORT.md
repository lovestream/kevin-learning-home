# MATH-FULL-01 执行报告

2026-10-25，[Issue #15](https://github.com/lovestream/kevin-learning-home/issues/15)，分支 `codex/math-full-01-70-lessons`。**本分支 70/70 教学课堂完成，30 代表课 checkpoint 与 70×3=210 课堂场景通过；独立 Draft PR 待 ChatGPT 审查，不合并。** 本批不是 849 题或整站完成，NAS 新 70 课版本 **NOT_DEPLOYED**。

## 可以实际打开的入口

同一用户 Mac 已启动 **`http://127.0.0.1:4179/`**，70 课目录可点击，**不需要账号、密码或安装 CA**。固定交付仍是 `~/Documents/Kevin-Learning-Home-Trial/`，新增 `打开70课体验.command` 与 `70课体验说明.md`；不生成新 worktree 或私密凭据，不覆盖原 START-HERE/CA/旧启动器。实际未脱敏绝对路径在本机交付消息给出。

已通过本机 Aqua/console UID 检查，在真实可见 Chrome for Testing 窗口独立确认 70 条课堂链接，免登录进入 `G3-U01-B03` 并将折叠从 0% 操作到 100%。正常关闭后，本次本机端口和 runtime 释放，重开成功；浏览器已保留供体验。后续 Mac 锁屏阻止了进一步 Finder 界面操作，故不声称完成 Finder 双击的人工验证；启动文件存在、权限和执行内容已验证，可见启动及关闭/重开均已实际运行。[Mac 证据](evidence/math-full-01/mac-access.json)与[真实 headed 目录截图](evidence/math-full-01/mac-visible-catalog.png)。

此地址只在这台 Mac 回环访问，是无身份/无真实数据的本机 HTTP，**不是 NAS/手机部署，也没有降低原 HTTPS 保护**。390/768 为真实 Chromium 的触屏模拟视口，包含 trusted touch PointerEvent 验证，不冒充实体 iPhone/iPad 访问；新版本在实体设备/NAS 均 NOT_DEPLOYED。原 NAS 38443 仍 02B、38444 仍合成单课，未覆盖、重启或修改。

## 实现与严格隔离

- 冻结源 `math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279`，从最新 main `44dca2affc369f89b3540ec7e1a11f0e3a100c08` 开始。PR14 merge `942dc508858f548af1e0517aa3365e08bfbee0e4` 与后续两次文档 main CI [40157207222](https://github.com/lovestream/kevin-learning-home/actions/runs/40157207222)、[40157522583](https://github.com/lovestream/kevin-learning-home/actions/runs/40157522583)、[40157599282](https://github.com/lovestream/kevin-learning-home/actions/runs/40157599282)已分别核实 success；它们不是本批代码 CI。
- 严格公开教学 DTO：70 个唯一 ID，版本/修订/draft/单元/先修和原正文保留；原 64 verified、6 static-visual 保留。5,003 字段映射与 145 个来源/目标 hash 逐项归档。公开 AST/条件参数驱动示范，不泄漏原任务 expected/solution 等。完整[来源范围与许可](MATH-FULL-SOURCE-SCOPE.md)、[逐字段映射](evidence/math-full-01/field-mappings.json)、[逐文件来源](evidence/math-full-01/origins.json)。
- `apps/preview` 是独立入口与内容进程；显式 `KLH_CONTENT_PREVIEW=1`，强制绑定 127.0.0.1。只读内容启动时逐课 schema/hash/registry 校验，静态构建资源 seal 校验后缓存；readiness 不反复扫描。没有正式 AuthService/MathService/SQLite import，没有登录绕过、真实卷、写接口、真实 cookie 转发或学习成绩。正式 server/授权实现未改变。
- 预览源码与 DTO 全部在 `apps/preview`；正式 Docker 最终层不复制此目录。lucide 为 devDependency，正式镜像 prune 后不保留；Dockerfile/Compose 无改动。正式 60 Node、18 UI 和数学 12 Node/9 浏览器全部保留。
- 教具按 51 种模式注册，复用 57 个原运行时来源的必要闭包与已有几何/计量/运算算法，不写 64 份页面。React 状态只在本次内存；刷新/关闭清空，不写 localStorage、sessionStorage、IndexedDB、Cache Storage 或 Service Worker。6 静态课明确纸笔指导，不硬造拖动或掌握标签。

## 统一接口契约（预览 v1）

| 接口 | 当前行为 |
| --- | --- |
| GET `/preview-api/v1/catalog` | 70 项目录、原元数据、renderer、每课 canonical DTO SHA256、冻结来源；无 actor/learner/session |
| GET `/preview-api/v1/lessons/:lessonId` | 严格教学白名单；客户端 schema/ID/hash 再校验；未知课 404 |
| GET `/health/ready` | 内容已校验的静态就绪信息，database=false |
| 写入方法 | POST/PUT/PATCH/DELETE/OPTIONS 均 405，无学习写入 |
| `/api/v1/auth/*`、真实 learner/state 等 | 在预览端 404，不代理正式服务；正式服务仍匿名 401、家长未解锁 403、CSRF 拒绝保持 |

所有响应 no-store、严格 CSP（无 unsafe-eval/unsafe-inline）、nosniff、frame-deny、同源资源限制；Host/Origin 精确校验。4 个原代码生成折纸 SVG 经脚本/链接/外部资源检查后独立提供，可从折纸课堂进入模板页。未来 849 题应另审公共题面与临时校验契约，不使用当前教学 DTO 放入答案。

## 自动化验收与性能边界

| 验证 | 结果 |
| --- | --- |
| 代表课 checkpoint | 30/30：覆盖 10 种教具、16 个 conceptLab 模型族及空间/质量模式；先完成初始 15 课验证，再扩充覆盖并连续完成全量 |
| 全课实际 HTTP + DOM | 70/70 × 390/768/1280 = **210/210**；六步、开头/预测条件图、真实教具或静态图、原字段、状态变化 |
| 教具有效操作 | 运算扩展验证执行后的数值、混合运算验证首步/中间量、数据分类与重复投票拦截；其余课程实际按钮/滑条驱动原模型，不把点“已猜想”当做全部模型操作 |
| 输入/状态 | 手机/平板 tap 选择，立体模型 trusted touch/mouse 拖动与键盘焦点，reduced-motion，全部课程刷新后操作/猜想归零；零浏览器持久条目/cookie/外站请求/写请求/CSP violation/页面错误 |
| 新增 Node | **[16/16](evidence/math-full-01/local-targeted.json)**：投影/未知 schema/内容漂移、70 匿名 GET/写入与源隔离、资源缺失/篡改拒启动、正式权限回归、固定 Mac 交付，以及 66 组核心情境/35 教材模型/空间拓扑/质量/量纲/时间/分数/面积守恒 |
| 原完整本地回归 | **60 Node、18 UI、3 基础视口、12 数学 Node、9 数学浏览器，typecheck/build 全通过**；[local-baseline.json](evidence/math-full-01/local-baseline.json) |
| 来源离线检查 | PASS：145 目标、5,003 投影 hash、冻结来源边界、无旧服务/数据依赖、正式镜像不含预览目录；CI 不下载或执行旧项目 |
| 最终 HEAD CI | push / pull_request 两套完整 CI 保留全部原回归与 Docker/Compose/恢复，并增加上述预览测试；精确 SHA/run/结论以本 Draft PR 正文最终交付记录核实，未完成前不得宣称成功 |

[完整逐课矩阵](evidence/math-full-01/lessons-coverage.json)、[实际 210 场景](evidence/math-full-01/browser.json)、[最终 30 课 checkpoint](evidence/math-full-01/checkpoint.json)、[早期 15 课 checkpoint](evidence/math-full-01/checkpoint-initial15.json)、[16 份永久截图索引](evidence/math-full-01/screenshots.json)。本地场景约 **104.7 秒**，包含逐课六步操作、截图和刷新，不是网络首屏指标。生产预览主 JS 约 586kB / gzip 188kB、另有约 19kB 惰性核心教具 chunk；构建的 >500kB 提示保留，没有调高阈值掩盖。70 课数据按需获取，目录约 74kB，单课最大漂亮格式约 8.2kB；未让浏览器下载整份 1.33MB 原题库。尚未宣称 NAS 性能或真实移动网络性能。

触摸事件测试使用 Chromium [Input 协议](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent)，断言真实浏览器 PointerEvent 的 isTrusted/type；不是向页面派发伪事件来代替触控。执行代理查看了手机/平板/桌面代表截图，且操作了真实可见 Mac；用户本人对全部新课程的体验仍待反馈。

本地证据诚实记录执行时 `44dca2a` + dirty 工作区，并绑定实际测试/UI/内容服务文件 hash；不冒充最终干净提交。最终 CI checkout 精确事件 HEAD，`.evidence/math-full-01` 中的新执行记录与全部产物由 Actions 归档。

## 失败与修正

初版测试没有等待 CoreWorkbench 惰性加载，并错误假设所有教具都是 SVG；原位值、投票、彩带等使用真实 HTML 材料块，改为等待就绪并检查受审图形结构/实际状态。SVG role=button 不能使用 HTMLElement.innerText，改用 textContent/aria-label。早期 Zod 默认 JIT 探测触发严格 CSP 的 eval 拒绝，按正式 UI 使用 jitless，**没有放宽 CSP**。HTTP Host 负向初版用 fetch，运行时未发送自定义 Host，改用真实 node:http 请求；正式 POST 的原 CSRF 403 与预期 401 不同，保留实际安全语义。上述修正后未筛选全 210 场景与全部回归通过。

## 剩余工作与停止线

849 题五组/五型、三项自查、终答/提示与 335 解释题人工核对属于 [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 的独立练习 PR，当前未接入。数学小侦探、17 已审卡/43 暂缓卡、四至六年级实际课程及蓝图容器另见[站级残余台账](MATH-FULL-SOURCE-SCOPE.md)，不把本批标为整站完成。正式账号、真实记录、积分/钱包/蛋仔、长期 HTTPS 与生产部署均暂停。

本批仅一个分支/一个 Draft PR、复用原工作目录；没有修改旧数学/英语、真实记录、NAS 容器/权限/DSM/Docker daemon/Tailscale，未删除其他工作树。完成后停等 ChatGPT 独立复审，不自行合并或越过下一批契约审查。

本轮另实际查看了归档中的 390px 位值与质量、768px 时钟、1280px 折盒截图，文字和教具未见横向截断；这属于开发者视觉检查，不代替用户在实体手机/iPad 上体验。
