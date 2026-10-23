# KLH-IMPLEMENT-02B-R1｜独立复审与页面稳定性整改

> ChatGPT 独立复审时间：2026-10-22。  
> 对象：[PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)，`codex/implement-02b-shell@147a3143dd5dca09fcb8aa70fd4d6b083597a4ab`，基线 `main@f2c42c2475d0ae85c1688b13e437bc4332d12315`。PR当前 Draft/open、mergeable/clean、未合并。  
> **结论：02B功能/权限/构建/现代Linux CI总体合格；但发现两处真实交互稳定性缺陷，建议以一次小范围R1合并前整改解决，再由ChatGPT复审。**  
> 本文件仅是审核与整改任务，**不授权合并 PR #7、进入数学/英语整合或部署 NAS。**

## 1. 已独立确认的通过项目与真实证据

- 已读取 `apps/web/src/{api.ts,identity.ts,main.tsx,style.css,validation.ts}`、`apps/server/http.ts`、`packages/contracts/routes.ts`、`packages/subjects/index.ts`、`tests/shell/{browser.ts,ui-fixture.ts,contracts.test.ts}`、02B执行/安全/交接文档，而不仅是阅读Codex总结。
- 最新 HEAD `147a3143dd5dca09fcb8aa70fd4d6b083597a4ab` 的 [push CI #39803049231](https://github.com/lovestream/kevin-learning-home/actions/runs/39803049231) 和 [PR CI #39803057670](https://github.com/lovestream/kevin-learning-home/actions/runs/39803057670) **均completed/success**。最后的提交 `b08defe2→147a314` 只有README、交接、合成证据/截图，没有修改网页、后端运行代码、Node测试/CI工作流。
- **独立下载最终PR HEAD的GitHub Actions真实artifact** `implement-02b-evidence`（artifact ID `12437820643`），解包直接解析：`verification.json.executedHeadSha=147a3143…`、`worktreeDirty=false`、Junit **60 testcase、0 error、0 failure、0 skipped**；`shell-browser.json` **13个真实编译React+Node Auth/SQLite场景全PASS**；原3视口证据、正式Docker/Compose成功与14张PNG界面截图齐全。不以实现父提交证据代替最后HEAD。
- 已将14张PNG解包，并独立查看欢迎、登录、孩子首页、家长锁定/解锁、离线、缺科目等界面的缩略对照；另查看390px家长解锁截图原图。基础信息架构清楚、窄屏无明显溢出、空学科/无报告/无金币的文案诚实；此类截图是**静态状态**，不是长期交互流畅性证明。
- 数学/英语`enabled:false`、`contentVersion:null`，原仓库`math-learning`/`word-request`未被此次PR代码写入；新的学习进度、真钱包、真实学习记录、NAS常驻部署都未开启。原55项Node回归保留，新增5项，旧业务写路径/父母权限规则未放宽。
- NAS上的02B、实体iPad Safari、正式Tailscale HTTPS/反代与真实家庭账户/加密备份都 **NOT_RUN**，不能因为现代Linux CI成功而宣称上线就绪。

## 2. R1-01（需整改）：5秒家长后台复核触发整页阻塞式过渡

**源码证据：**
- `apps/web/src/identity.ts` 定义 `PARENT_POLL_MS=5000`；家长解锁后 `useEffect` 执行 `setInterval(() => void callbacks.current.sync(), PARENT_POLL_MS)`。
- `sync()` 一律调用 `run("确认权限",…)`；`run()` 在任何网络请求之前执行 `mask();publish({...empty("checking"),busy:true,operation})`，清除已经通过服务器确认的 session/learner/selected。
- `apps/web/src/main.tsx` 的 `authenticated` 完全依赖 `state.phase==="authenticated"`。每次循环会把已解锁家长中心切换成“正在确认身份”的 access gate，销毁原有家长页面元素；哪怕请求立刻返回200，也会产生布局抖动、焦点丢失和输入/按钮中断。
- 当前13个E2E场景最长的家长完整链未覆盖**连续维持前台解锁状态超过10秒并观察两个真实5秒轮询**；现有截图也不会揭示时间性闪烁。

**整改目标：**
1. 区分**用户主动操作/页面切换需要阻塞核验**与**已解锁状态的定时后台复核**。背景 happy-path 复核不得将整个应用设为`checking`、卸载家长页面/侧栏、抢夺键盘焦点、反复出现加载页。
2. **安全行为不能退让**：后端 revocation/role/grant变更一旦在复核中发现，应立即隐藏已撤销/过期内容；浏览器切后台/离线/失焦、网络异常、超时或乱序响应时继续fail-closed；不延长5分钟家长解锁期限、不把身份/CSRF/learner名单保存到localStorage或URL，不采用仅靠前端隐藏替代服务端grant检查。
3. 建议实现独立的 `revalidateInBackground()`，带 generation+AbortSignal/竞态屏障，不采用重新渲染整个空`Identity`来防止闪现；是否需要短暂遮蔽**仅私有字段区域**由威胁模型与代码证据说明。无法安全保持可操作状态时，应优先收紧，而不是放宽身份授权。
4. 增加 **真实React+Node E2E、连续保持家长解锁至少11～12秒**：对两次轮询，正常200时页面标题/家长选择列表持续在位，键盘/按钮焦点不丢，`checking`access gate不出现；通过受控后端 revoke/到期/HTTP503/网络断开测试确认随后的fail-closed，并验证未把问题转移到闪烁私有名字或倒计时重置。若为加速用测试时钟，至少还需一次真实墙钟运行或明确等价证据。
5. 保留原5秒复核或解释调整间隔的利弊；不通过取消全部后台复核或永久延长parent权限获取绿灯。

**严重度：合并前UX/可访问性稳定性阻塞，不是已证实的跨学习者提权漏洞。**

## 3. R1-02（需与R1-01一起解决）：React内部定义组件导致无关状态更新时卸载焦点元素

**源码证据：** `apps/web/src/main.tsx` 在`function App()`作用域内部声明`function Link()`、`function SubjectLinks()`、`function Empty()`等，并在 JSX 使用 `<Link …/>`、`<SubjectLinks/>`。每次`App`重渲染，这些函数对象是新的React组件类型；React按类型替换其子树，即使href/key都没变也会卸载重建页面导航链接及科目卡。

**整改目标：**
1. 将需要作为 JSX 组件使用的`Link`/`SubjectLinks`/`Empty`等提取到稳定模块级组件（通过props传`navigate`、currentPath、catalog等），或改为稳定的自定义Hook+普通渲染函数，避免`App`每次渲染重新创建组件类型；不得改变语义路由、CSP、授权或可访问性。
2. 加真实Chromium验证：键盘Tab聚焦一枚侧栏/家长导航链接，在不改变path/grant的`sync`或config刷新之后，焦点仍停留在同一语义控件、该DOM节点引用未被无故替换；parent解锁态的定时轮询也需通过这条测试。
3. 切换学员/真正导航改变页面时允许内容重建，但应有明确焦点移交，不可因普通授权轮询破坏可操作的UI。

**严重度：中，聚焦可访问性/响应式交互；不是授权漏洞。**

## 4. 范围和验证清单

- **只在**`codex/implement-02b-shell`原Draft PR #7 修复本两项，不在`main`直接修改，不开始02C/数学/英语、奖励/蛋仔、NAS部署。尽量仅动`apps/web/src/{identity.ts,main.tsx}`、必要的组件模块和`tests/shell/browser.ts`，不改SQLite v1/v2、`AuthService`安全核心、原有反代策略、Docker权限。
- 新增R1专项 E2E 后，**原60项Node与13条真实浏览器场景全部保留**，增加新场景（或同名用例新增明确断言并记录总数变化）；原3视口、390/768/1280/1440真实布局、Docker/Compose、SIGKILL、恢复、CSRF/Origin、家长锁定/解锁/撤销测试全部持续绿灯。
- 02B的 `scripts/verify.ts` 当前硬编码`shell.total===13`，新增场景后须更新检查，不能保留仅13而静默忽略新增测试；新版最终CI完整真实执行全部UI案例。
- 完整保留历史失败与旧证据，新增`docs/implementation/IMPLEMENT-02B-review-R1.md`、更新`docs/implementation/IMPLEMENT-02B-execution-report.md`、`docs/handoff/IMPLEMENT-02B.md`、记录R1新用例和PR最新SHA与push/PR Actions URL。截图可以只补必要的焦点/持续状态证据，别为少量修复生成大量重复图片。
- Codex完成后仍 **STOP**；用户告知 ChatGPT 再审。不能自动合并PR #7、自动生成真实父母账号、打开Tailscale公网或操作NAS生产。

## 5. 非阻塞的后续事项

- SubjectRegistration当前只有 `awaiting-migration/unavailable` 的status；未来正式学科上线还需定义 `ready`/校验课程与manifest状态及动态禁用边界，但**02B只是空插件外壳，不要求这轮把数学/英语真正设为ready**。
- 仍有未来独立NAS 02B 合成端到端兼容、实体Safari/iPad、生产HTTPS origin/反代Cookie与安全恢复、加密异地备份关卡，不作为本轮代码合并必要条件。
- 后续可优化账号输入焦点提示、空态文本，但不要因普通视觉微调扩增R1范围。
