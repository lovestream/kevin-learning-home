# KLH-IMPLEMENT-02B-R1｜第二轮独立复审与合并前验收

> 日期：2026-10-23。由 ChatGPT 独立核查 [Draft PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)，HEAD `f179b895dfdb0d7c2c1961832d813be8d91724d2`，base/main `f2c42c2475d0ae85c1688b13e437bc4332d12315`。  
> **结论：此前R1-01/R1-02整改已通过源码、真实浏览器E2E及最新CI核验。PR #7可提交用户审批合并；此文件本身不授权合并、不部署NAS、不进入学科整合。**  
> 原始审核任务：[KLH-IMPLEMENT-02B-R1-REVIEW.md](https://github.com/lovestream/kevin-learning-home/blob/chatgpt/klh-implement-02b-review-r1/docs/reviews/KLH-IMPLEMENT-02B-R1-REVIEW.md)。Codex [R1整改报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02b-shell/docs/implementation/IMPLEMENT-02B-review-R1.md)。

## 一、已验证的事实

- GitHub再次确认 PR #7为Draft/open、未合并、mergeable=true/clean，main依然是`f2c42c2`；从`147a3143`至`f179b895`仅两提交，其中`f940fc1`调整前端代码和测试，最后的`f179b895`仅文档与合成审计证据，无新的业务代码改动。
- 同一最终HEAD`f179b895dfdb0d7c2c1961832d813be8d91724d2`的 [PR CI #39875247271](https://github.com/lovestream/kevin-learning-home/actions/runs/39875247271) 与 [push CI #39875241411](https://github.com/lovestream/kevin-learning-home/actions/runs/39875241411) 都为completed/success；实际workflow job的`node scripts/verify.ts`、Compose 1.28.5、Container isolation and restored-host verification及artifact上传成功。
- **独立下载最终PR CI真实artifact** `implement-02b-evidence`（ID `12468596758`），解包解析`verification.json`与`shell-browser.json`：`executedHeadSha=f179b895…`、`worktreeDirty=false`；Junit **60 testcase、零失败、零error、零skip**；浏览器`total=18`、`filtered=false`、`failures=0`；浏览器原13项保留并新增5项R1测试，`browserViewports=3`，额外shell视口390/768/1280/1440均执行。确认这是最终HEAD证据，不拿实现父提交报告替代。
- 正式现代Linux CI容器仍保留非root/readonly、flock双writer互斥、SIGKILL后重启、SQLite事务与恢复、认证授权/会话撤销、媒体与事件对账。新18项是合成React + Node Auth + SQLite测试，不是将所有身份API mock成假响应。

## 二、R1-01：背景5秒复核不闪屏——PASS_CODE + PASS_CI

源码`apps/web/src/identity.ts`：
- 引入`run(operation, work, background=false)`分流；后台成功检查开始时不再`publish(empty("checking"))`，不会无故清空身份或将整个`App`变成access gate。
- 背景`revalidateInBackground()`先检查是否有未完成请求、角色是否已解锁、是否隐身/离线/存在待办退出或锁定，防止重入；请求沿用generation、AbortSignal及8秒超时屏障；主动操作抢占背景请求。
- 检测actor、角色、授权ID、parentUnlocked或提升截止时间改变时，**先mask/撤销可见敏感状态，再读取新learner元数据**；请求失败/超时/过期/撤销/网络错误均fail-closed。保留parent elevation5分钟有效期、5秒复核，不延长授权、不存储浏览器身份。
- `useEffect`依赖角色、期限等标量，不因普通DTO对象刷新重启5秒定时器。

新真实Chromium案例`r1-parent-continuous-two-polls`提供**真实墙钟12,085ms + 至少两次真实200后台权限检查**；MutationObserver记录正常期间无pending/gate/privacy隐藏/导航及选择器脱离，焦点与DOM保持；解锁截止时间未更新。新另外四例覆盖配置更新不替换焦点、真实revoke与503及离线、挂起轮询触发8秒超时且主动锁定优先、server elevation过期与credential reset401。源码及断言已核对，而不只读取报告的PASS文字。

## 三、R1-02：稳定JSX组件类型与键盘导航——PASS_CODE + PASS_CI

源码`apps/web/src/main.tsx`：`Link`、`SubjectLinks`、`Empty`已提取到`App()`以外的模块级稳定函数组件；路由、catalog、reload函数以props传递。App内其余页面`render*`是直接调用的普通渲染函数，不再以不稳定函数组件类型创建JSX。
- E2E`r1-config-refresh-stable-link`检查真实config返回后的`node.isConnected`与`document.activeElement===node`，再按Enter导航和main聚焦；上述12秒连续性测试也在正常两轮复核下验证相同导航节点、选择节点和焦点。
- 这些改动不涉及Node AuthService、SQLite migration、锁、生产Cookie/Origin/CSP配置，不修改数学/英语原课程或网站。

## 四、审查边界与未来要求

- **未执行**：DS918+上的最新02A/02B合成镜像、真实iPad Safari、实际Tailscale HTTPS反向代理Cookie/Host/Origin、真正家庭账号初始化、真实学习记录和备份加密/异地恢复。此前DS918+对PR5/v1底座的NAS GATE不能代替现在整个02B的NAS验证。
- 家长后台授权撤销只在下一次成功轮询/主动校验时同步，非WebSocket即时推送；服务端本身对实际请求立即拒绝。网络中断和已知本地到期会主动遮蔽；不要承诺零延迟跨设备更新。
- 正常后台请求期间展示最近一次已确认、尚未到期的家长资料，是防止整页闪烁的明确权衡；权限变化/请求异常时遮蔽。此范围已在威胁模型与真实E2E中体现，不等于可离线读取被撤销的真实数据。
- UI/后端当前数学和英语registry仍 disabled，未迁入课程、真实练习或金币与宠物成长；当前02B完成只意味着**可扩展统一登录/导航外壳**完成，不代表学习家园已经正式可作为旧站替代品。

## 五、合并审批与后续顺序

1. **等待用户明确批准“合并PR #7”**。获批准时重新读取最新HEAD、main、合并冲突及同HEAD最新push/PR CI；如果改变需重审。将Draft标记Ready，执行GitHub正常squash合并，保存真实main merge SHA。
2. **合并后核对真正的`event=push`、`head_branch=main`、`head_sha=<merge SHA>`之完整GitHub Actions success**。不能把PR上的绿灯冒充合并后主分支绿灯；失败或未运行必须暂停下一阶段。
3. 先由用户决定后续是**NAS隔离的02B合成登录/设备兼容验收**，还是制定数学/英语各自复制适配计划。后两者均须保持旧站独立，并在触碰真实身份、生产NAS或学习记录前另行审批。
4. 当前本复审**未合并PR #7、未授权02C/学科迁移、未操作NAS与真实数据**。复审结论应同步留在PR讨论供Codex阅读。
