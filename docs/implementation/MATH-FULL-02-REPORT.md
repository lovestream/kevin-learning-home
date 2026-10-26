# MATH-FULL-02 · 849 题课堂内临时练习

## 状态与基线

按 [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 及用户最新连续推进指令，在稳定 R3 `8628f0aa8b50fd32c3efe4485d92293582cdc420` 上创建 `codex/math-full-02-practice`。PR #18 未合并，因此本 Draft PR 叠加到 `codex/math-full-01-70-lessons`，避免重复混入 70 课变更；不合并任一 PR。工作目录仍为原副本，没有新 worktree。

**CODE_READY_LOCAL_PASS，NAS 尚为 R3 教学版本 `020ceb9`。** 本报告只有实际发布并复核运行源码/镜像、849 题、回退和保护快照后，才标为 NAS 交付。入口仍是 `http://192.168.2.100:38444/`，不使用登录或证书，不依赖 Mac 本地运行。

## 课程与来源

冻结 `math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279:content/pilot/lessons.json`：70 课、849 唯一题 ID，顺序、原文、选项、单位、图示、内容版本和 editorialRevision 均保持。

| 原题组 | 数量 | 原类型 | 数量 |
| --- | ---: | --- | ---: |
| warmup 热身 | 140 | number | 357 |
| core 核心 | 249 | choice | 93 |
| transfer 迁移 | 143 | explanation | 335 |
| challenge 挑战 | 73 | expression | 25 |
| review 复习 | 244 | fields | 39 |

`import.py` 只读冻结 Git blob，记录每题 canonical hash、原序号与版本，核对旧工作区前后 status hash 一致。[source.json](evidence/math-full-02/source.json) 记录源文件和纯评分器/两种图组件的 blob/hash 与类型导入适配。没有读取旧 DB、私密案卷、账户、备份或 Kevin 记录。

复用原 `shared/pilot-math.mjs` 的完整纯 `validateTask`，字节不变；解释题“已保存”提示只在新服务响应处替换为真实的临时模式语义。沿用原测量图、概念关系卡、分数与贴边图，未重画六步课堂或教具。无新增外部图片/PDF/网络素材。原仓库未提供通用 LICENSE；仅按仓库所有者本次明确授权复制自有代码和题文，保留来源，不作广泛再分发许可声明。第三方 React/Zod/lucide 等沿用原工程依赖与 notices。

## 同一课堂体验

练习在原第六步“自己验证”中出现，五组各保留原题序。可任意切组/跳题、返回实验、重做、回课；空组明确显示原库无题，不伪造完成数。保留独立首答的内存快照，孩子逐项勾选三项自查（原有专用检查文案优先），允许修改终答，提交后给核对、分层提示和参考过程。错误后可继续订正，重做或刷新清空；没有 localStorage、sessionStorage、IndexedDB、Service Worker、SQLite、成绩、掌握标签或积分。

335 个解释题始终 `pendingReview` / “待家长核对”，不会自动判正确。先独立回答、自查、终答，再提供参考过程及原 rubric；原文不会被改为选择题。输入法、键盘、单位、choice 的结论+证据、分数和表达式规则均保留。提交期间不允许编辑覆盖异步结果；切题/离开会取消请求，旧结果不能落到新题。

## 无状态接口与边界

| 接口 | 契约 |
| --- | --- |
| GET `/preview-api/v1/practice/lessons/:lessonId` | 严格白名单：原题/选项/固定单位/图示/公开作答约束与版本；不含 expected/solution/hint/diagnostic/expectedEvidence/rubric/字段答案 |
| POST `/preview-api/v1/practice/grade` | 唯一新增计算端点；JSON ≤16 KiB、5 秒读取超时、严格字段/答案长度、三 true 自查、匹配 lesson/task/version；未知字段或身份字段拒绝 |
| 响应 | 有限 status/message；有效终答后才返回原 hint/solution/rubric；`persisted:false`。335 解释题只人审 |

同源 Host/Origin/私网 peer 与严格 CSP、no-store、无 CORS、无 cookie 保留；Content-Type 必须 application/json，不接受编码包体或跨站 Fetch。纯数学 parser 自身限制 number ≤80 字符、expression ≤160 字符、禁止 eval 和未知数乘未知数。答案字典及纯评分器仅在服务端 private 目录，私密静态路径不可访问，Vite bundle 不含判题器或题目参考过程。构建核对来源 hash，seal 同时绑定私有 bank 和公开投影 hash，篡改阻止启动。

本次内容服务零数据库/身份/真实学习表导入，新增 POST 仅在内存中计算，不保留请求、首答或历史；正式 `/api/v1/*` 仍无匿名访问，原 MathService/grant/session/CSRF 回归完整保留。不会将新临时接口接到正式 MathService。

## 验证与复现

- `python3 scripts/math-full-02/import.py ../math-learning`：显式只读源导入；CI 不需旧仓库。
- `npm run build:math-preview`；`node --test tests/math-full-02/practice.test.mjs`：来源/849 golden/人审、独立数学 fixtures、严格输入与真实 HTTP 全题、静态泄漏/私有路径、篡改拒启。
- `node tests/math-full-02/browser.mjs`：真实前后端，三视口各 70 课/849 唯一入口；每个实际存在的组×类型加证据/三种特殊图，共 84 完整首答/自查/终答/订正/重做流程；键盘/输入法、刷新清空、CSP/零持久化/唯一无状态 POST。
- `node scripts/verify.ts` 保留原 60 Node、18 UI、12 数学 Node、9 数学浏览器及基础视口；新增分支仅扩展原 CI branch 门禁，未减少断言或测试数量。
- 原内容模型/HTTP、17 单元三视口导航、30 代表课/210 全课堂与 Docker/Compose/恢复门禁全部保留。push 与叠加 PR 均运行同一无条件完整工作流，验证精确事件 HEAD。

原工作流测试曾因精确分支名单未加入两条新分支失败，已同步扩展名单和叠加 PR base，并单项复核通过；不掩盖失败。早期浏览器脚本使用无空格按钮名未匹配实际 accessible name，改为六步 nav 的真实第六个按钮；完整流程随后实测通过。最新归档以覆盖矩阵和 PR 精确 HEAD 双 CI 为准，不能用早期旧 SHA 或本地结果代替 NAS。

## 已完成的本地证据

三视口实际浏览器每个覆盖 70 课/849 唯一题；84 个完整流程通过，包含解释题人审、choice 证据、多字段与三类特殊图，完整结果 [browser-local.json](evidence/math-full-02/browser-local.json)。逐题 [tasks-coverage.json](evidence/math-full-02/tasks-coverage.json) 与 [golden.json](evidence/math-full-02/golden.json) 均 849；514 确定题同时做错答/非法输入阴性，335 解释题不自动正确。真实 HTTP 遍历 849 终答，六项新增 Node 门禁全通过。390/768/1280 截图及 hash 在同目录，已实际查看手机多字段布局。原正式完整基线全通过。

## 后续与限制

完成本批实际 NAS 发布后，按最新用户指令继续 Issue #17 的已存在可公开数学能力，独立 Draft PR。不是把 70+849 当整站完成；正式账号、真实学习数据、旧钱包/蛋仔、私密错题案卷和未来统一奖励仍不在本批范围。实体手机/iPad 的手动体验仍待用户，不把三视口截图说成实体设备验证。
