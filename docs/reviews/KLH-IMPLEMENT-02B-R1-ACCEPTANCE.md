# KLH-IMPLEMENT-02B-R1｜第二阶段网页外壳整改最终独立复审

> **复审日期：2026-10-23。结论：R1-01 和 R1-02 均通过，PR #7 达到代码合并条件；需用户明确批准才可转换 Ready/合并，不得自动开始学科整合或 NAS 生产部署。**
>
> PR：[lovestream/kevin-learning-home #7](https://github.com/lovestream/kevin-learning-home/pull/7)  
> 本次精确 HEAD：`codex/implement-02b-shell@f179b895dfdb0d7c2c1961832d813be8d91724d2`，main仍为 `f2c42c2475d0ae85c1688b13e437bc4332d12315`。  
> PR保持 Draft/open，GitHub mergeable=true、clean，未合并。上一轮[审查任务](https://github.com/lovestream/kevin-learning-home/blob/chatgpt/klh-implement-02b-review-r1/docs/reviews/KLH-IMPLEMENT-02B-R1-REVIEW.md)与[Codex整改报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02b-shell/docs/implementation/IMPLEMENT-02B-review-R1.md)。

## 1. 真实CI、最终SHA和artifact独立对照

- `f179b895` 的 [最终 PR Actions #39875247271](https://github.com/lovestream/kevin-learning-home/actions/runs/39875247271)、[push Actions #39875241411](https://github.com/lovestream/kevin-learning-home/actions/runs/39875241411) 均为 `completed/success`，同一head SHA。实际job里的 Node `scripts/verify.ts`、Compose 1.28.5 parser、Linux Docker container/recovery与artifact上传均 success。
- 已**直接下载最终PR Actions artifact ID 12468596758**，不是仅复述报告或引用上一提交：`verification.json.executedHeadSha=f179b895...`，`worktreeDirty=false`；`foundation-junit.xml`实数60个testcase、0 failure、0 skipped；`shell-browser.json`实际18个案例、0失败、未过滤、真实编译React+Node Auth/SQLite合成环境，原三视口验证通过。正式Docker `container.json`、`auth-container.json` 均 `PASS_CI`，非root/readonly、restartCount=1、会话撤销和家长锁定范围保护通过。随artifact有15张02B网页截图（含新增R1连续操作）及1张基础页图。React/Node代码没有真实NAS CI连接。
- 最后一次实现提交 `f940fc1943180e7b518640a16d1ed600b335bd42` 到最终归档HEAD `f179b895` 的compare显示**只有文档/证据更新，无 apps/packages/tests/scripts/CI runtime 变化**。最终提交又额外跑了完整双事件CI，不能用父提交绿灯冒充最终验证。
- 精确证据来自GitHub Actions下载zip内的`foundation-junit.xml`、`verification.json`、`shell-browser.json`，并独立对比仓库 `identity.ts`、`main.tsx`、`tests/shell/browser.ts` 和 `IMPLEMENT-02B-review-R1.md`。

## 2. R1-01：真实后台权限复核不打断页面——PASS_CI、PASS_CODE_REVIEW

- `apps/web/src/identity.ts` 新增 `revalidateInBackground()`，5秒定时器调用 `sync(selected,true)`，不再将正常后台请求直接转为`empty("checking")`、整体mask或busy；保留真实SessionDTO、learners、选择与当前React页面。
- `pending.current`阻止多轮后台请求重叠；真实请求有8秒超时并同步`suspend`清空私密视图；前台主动操作、离线、失焦、取消、迟到响应用generation/AbortSignal挡住回写。解锁到期、session过期及grant/actor变更会fail closed，不能凭浏览器header、缓存或旧grant提权。
- 从最终artifact `shell-browser.json.r1Evidence.continuity`确认：真实墙钟 `wallClockMs=12085`、`successfulPolls=2`、`unchangedUnlockDeadline=true`、`stableDOMAndFocus=true`。原case `r1-parent-continuous-two-polls` 实际运行13秒左右且 PASS。并有真实SQLite grant撤销/503、offline恢复、8秒超时、主动锁定胜过晚到响应、权限过期/credential重置401的独立用例。
- **真实风险边界**：周期性有界复核允许已确认家长资料在下一轮请求返回前短时间仍可见，服务端请求始终现查授权；不是服务端主动推送/零延迟撤销。家长权限不自动延长。当前无证据表明新增跨learner越权。

## 3. R1-02：组件类型与键盘焦点稳定——PASS_CI、PASS_CODE_REVIEW

- `apps/web/src/main.tsx` 的 `Link`、`SubjectLinks`、`Empty` 已成为**模块级稳定React组件类型**；`App()`中仍采用普通 `renderParentPage/renderWorkspace`函数直接调用，而不是动态内层JSX组件类型。
- 新 `r1-config-refresh-stable-link` 真浏览器用例验证：真实 `/api/v1/config` 响应造成重渲染时，左侧导航元素仍是原DOM节点，键盘焦点仍在同一链接，按Enter可正确切页、焦点移到main；家长持续12秒用例也检查导航/学习者节点未被普通后台轮询重新卸载。
- 已保留原13个真实界面场景，新增5个R1专项场景；`scripts/verify.ts` 已改为要求`shell.total===18`，不能遗漏新用例而误报全绿。

## 4. 其他边界和剩余风险

- 学科仍是`math/english enabled=false`、`contentVersion=null`、空计划/报告/积分，没有真实课程或学习者成绩。两个旧仓库`math-learning`与`word-request`及其各自生产数据库没有被本PR改变；旧站具体在线HTTP状态不在本次测试范围。
- 容器验证是**现代Linux CI（kernel 6.17）**，不是DS918+ 02B新版本实际运行；Mac、Safari实体设备、群晖Linux4.4上的02A/02B合成部署、真实家长账号、Tailscale正式HTTPS proxy、真实Cookie/Origin端到端、安全密钥与加密异地备份均 `NOT_RUN`。NAS阶段旧Node24官方内核支持基线4.18风险仍在。此处代码合并**不等于上线验收**。
- JS/React浏览器前端需要后续真实Mac/iPad的操作者可用性体验；当前Chromium viewport仿真不代表实体Safari。旧学习站的全面测试和未来来源SHA复制适配需要单独批准。

## 5. 合并流程与后续阶段

1. **等待用户明确批准合并PR #7**：再次核对PR最新HEAD `f179b895`、base/main最新SHA、mergeable和两次最终HEAD CI状态，如有新提交先比差异和重新审查；再将Draft转Ready，正常GitHub merge（例如squash），保留PR追溯，不合并其他实验PR。
2. 合并后读取GitHub返回的实际main merge SHA；必须查看 `event=push,branch=main,headSha=<实际merge SHA>` 的**真实、完整Actions**全部成功，否则暂停后续学科。之前PR的success不能替代main合并后的success。
3. 后续推荐**先评估NAS上仅合成账号的02B隔离试运行与实体浏览器可用性**，再决定第三阶段从冻结SHA复制数学或英语课程的具体顺序与范围；两门旧课必须继续独立，不能迁移真实记录、开启钱包或部署生产，除非再次得到用户明确授权。
4. **当前ChatGPT没有合并或修改 PR #7，也未操作任何 NAS 或真实数据。** 本报告单独归档在 `chatgpt/klh-02b-r1-acceptance-20261023`，不写入main、不写PR代码分支。
