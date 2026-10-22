# KLH-IMPLEMENT-02A-R1｜独立复审与合并前精准整改

> **复审日期：2026-10-22。状态：02A主体功能与合成测试通过，暂不批准合并 PR #6；先完成以下两项小范围整改并重测。**  
> 仓库：`lovestream/kevin-learning-home`；[PR #6](https://github.com/lovestream/kevin-learning-home/pull/6) 当前 `codex/implement-02a-auth@1a31550670b5eb7f4e169e9a0f969ade9a62ffdc`，基线 `main@87ec45e95809d00b7104242702fb28ffbb6f7881`。  
> 已核对当前HEAD的 [PR CI 39702494904](https://github.com/lovestream/kevin-learning-home/actions/runs/39702494904) 和 [push CI 39702490625](https://github.com/lovestream/kevin-learning-home/actions/runs/39702490625) 均 SUCCESS；53项 Node、3视口 Chromium、现代Linux非root Docker、SQLite备份恢复及容器重启测试通过。**但这些不是DS918+上的02A认证模块实测。**

## 1. 已达到验收要求的核心范围，不得重做或回退

- 按已合并的原代码冻结 `87ec45e9` 建立真实v1合成数据库，执行显式checkpoint与 `002-family-auth.sql` 增量迁移；旧10张数据表count+hash保持，旧迁移row1保持并新增row2；旧001字节不变；失败和中途SIGKILL可恢复；旧镜像拒绝直接写v2DB。
- `packages/auth/service.ts` + `apps/server/auth-http.ts` 中的持久身份/授权、随机会话摘要、父母短时解锁、撤销、CSRF/固定Origin/Host、Secure+HttpOnly+Strict Cookie、scrypt及有界限频设计，已有真实HTTP与TLS合成测试。
- 新增6张认证相关表，v2 checkpoint在完整验证后安全撤销所有已恢复会话，保留旧事件、grant和凭据版本；CLI要求TTY与显式合成模式，没有HTTP首访成为管理员功能。
- 现代Linux Docker auth重启与注销/恢复测试通过；旧30项回归持续有效。正式学习、金币/钱包、批阅、媒体私密发布和旧数学/英语整站迁移仍不开放。
- 旧 `math-learning`、`word-request` 的真实记录和部署未变，当前测试仅基于Git元数据，不冒充原站在线状态验证；未操作NAS环境。

## 2. 需整改的 R1-01：锁定家长的身份响应泄露 learner ID 列表

**可复核源码：** `packages/auth/service.ts` 的 `view(session)` 无论家长是否经过二次解锁，都会对其 `learner_grants` 查询并把 `learnerIds` 作为 `POST /api/v1/auth/login` 或 `GET /api/v1/auth/session` 的 SessionDTO 返回。而同文件 `learners(session)` 明确规定：家长 `parent_unlock_until<=clock()` 时拒绝访问 learner 列表和具体元数据。

这是**数据最小暴露/权限语义不一致**，还不是已证明的跨learner授权绕过；用户家庭场景风险较低，但可以在02A内低成本修正，避免02B的前端依赖错误的锁定态响应。

**要求：**
1. 明确执行“未解锁家长只能看到自己的 actor 身份/锁定状态，不暴露 learner 档案的 ID、标签或 grant 元数据”。家长锁定态 SessionDTO 的 `learnerIds` 返回空列表，二次解锁成功后才返回经授权的完整列表；家长锁定/旋转/解锁到期后再次清空。孩子 SessionDTO 可保留自身唯一 learner ID。
2. `GET /api/v1/learners` 及单个learner的 parent-only 检查继续保持服务端拒绝；任何 Role/Tailscale 头伪造均不得绕过。
3. 增加真实HTTP负例测试：login锁定→`learnerIds=[]`、GET/session锁定仍空、unlock后只显示有效grants、revoke立即生效、主动parent-lock/超时后再次隐藏；验证孩子仍只见自身，历史会话不恢复权限。
4. 如产品上有不同的明确设计理由必须暴露匿名数量或占位符，请在PR报告写威胁与必要性后请用户决策，不要默认返回实际learner IDs。

## 3. 需整改的 R1-02：合并后main分支缺独立CI

**可复核源码：** `.github/workflows/foundation.yml` 当前 `on.push.branches` 只列 `codex/implement-01-foundation` 和 `codex/implement-02a-auth`；`pull_request.branches=[main]`。这意味着PR阶段会跑CI，但最终合并到main的提交本身没有自动触发push CI。前一阶段PR5合并后就曾出现main无runs，并不意味着此前CI不通过。

**要求：**
1. 为 `on.push.branches` 增加 `main`，同时保留本阶段开发分支的push/PR测试；CI继续完成 `npm ci`、typecheck/build、完整53+测试、浏览器、Compose V1、Linux容器验证，不能只跑文档lint。
2. 禁止在GitHub Actions执行NAS SSH、读真实凭据或连接真实站点。保留只读/语法层面历史NAS gate校验即可。
3. 更新合并运行手册：PR6最终HEAD checks绿且获用户批准后合并；合并后核对`main` squash/merge HEAD的新Actions运行PASS；**不把PR上的绿灯冒充main合并后绿灯**。
4. 如CI失败保留失败记录/修复说明，不删除回归用例，不通过跳过网络、TLS或身份负例来求绿。

## 4. 可后续解决、不是02A代码合并阻塞的事项

- **DS918+真实02A认证+v2镜像**未运行，前一阶段的旧schema1/NAS GATE不能代替。NAS正式部署前另批准一次隔离v2合成环境验收，至少确认新schema/auth/Cookie受控反代、flock与重启；不得把本次Linux CI写成PASS_NAS。
- **生产TLS/Tailscale HTTPS入口及反代Host/Origin传递**没有配置或验证，不允许假定仅设`KLH_AUTH_ORIGIN`就能安全开放。必须明确仅localhost上游，杜绝绕过TLS直接访问。
- **真实账号及备份加密**未完成；当前v2 checkpoint包含慢哈希/家庭关系，必须保持私有，不可把明文备份上云或放GitHub。完整数据保护方案需真实导入前验收。
- **宿主管理员离线恢复**可以重置凭据，属于受信任操作边界，不等同Web端账户自恢复；后续设计家庭恢复手册。
- 会话、限频与审计的容量上限和归档策略可在学习家园上线前进一步评估；旧内核Node24支持风险仍存在。

## 5. 验收交接与停止线

只在原 `codex/implement-02a-auth` 分支、PR #6 上提交小范围整改，保持 Draft。更新或新增 `docs/implementation/IMPLEMENT-02A-review-R1.md`，在 `IMPLEMENT-02A-execution-report.md`、`docs/handoff/IMPLEMENT-02A.md` 更新准确HEAD、新增测试与CI结果；旧53项和旧CI原记录不要改写为新结果。

R1-01、R1-02必须具备新测试或CI执行证据；所有原53项Node、3视口、auth-enabled Linux容器、v1→v2升级/备份、SIGKILL及会话撤销回归继续通过。完成后**STOP等ChatGPT独立复审**，不自动合并 PR #6、不进入02B、不动NAS或原数学英语、不给真实家庭生成账号。
