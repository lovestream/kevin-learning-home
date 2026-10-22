# KLH-IMPLEMENT-02A-R1｜第二轮独立复审验收结论

> 复审日期：2026-10-22。  
> 对象：[PR #6](https://github.com/lovestream/kevin-learning-home/pull/6) `codex/implement-02a-auth@c71fd6c05dab94ee6dc5118cc034d0d6c4eea5c0`，基准 `main@87ec45e95809d00b7104242702fb28ffbb6f7881`。  
> **结论：02A-R1-01、02A-R1-02 均通过代码与 CI 复审，PR #6 具备合并条件。须由用户明确批准后才能转换 Ready、合并和进入02B。** 本复审没有合并、修改 PR #6 或部署 NAS。  
> 首轮审查：[KLH-IMPLEMENT-02A-R1-REVIEW.md](KLH-IMPLEMENT-02A-R1-REVIEW.md)；Codex [整改报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02a-auth/docs/implementation/IMPLEMENT-02A-review-R1.md)。

## 1. R1-01：锁定状态最小泄露——通过

- 已直接检查 `packages/auth/service.ts::view()`：一次时钟读取决定 `parentUnlocked`，`parent` 未解锁时 `learnerIds=[]` 且不执行 `learner_grants` 查询；已经解锁时只返回未撤销的授权 learner ID，容量上限原样保留；孩子仍仅可见自身唯一 learner ID。
- `learners()` 服务端仍要求 parent 二次解锁，不能仅凭隐藏前端导航授权；`X-Role/X-Tailscale-User`不会提权。
- 已检查新增 `tests/auth/http.test.ts` 真实HTTP案例：锁定 login/session不暴露ID和标签，unlock后列举有效grants、revoke立即生效、lock/rotate/5分钟到期/重启后的重新锁定、旧Cookie401、孩子scope独立。测试没有绕开身份接口。
- `tests/auth/container-smoke.ts` 在Linux正式镜像的恢复环节明确断言：restore后的新登录为locked且learnerIds=[]，解锁前 `GET /api/v1/learners` 403，二次解锁后才看到原有效grant。原备份/恢复数据保真断言仍在。

## 2. R1-02：main push 完整CI——配置及验证通过；post-merge运行仍待合并

- `.github/workflows/foundation.yml` 的 `on.push.branches` 现在为 `[main, codex/implement-01-foundation, codex/implement-02a-auth]`，`on.pull_request.branches=[main]`；各事件共用一个未条件跳过的完整job。
- 完整job仍包括：`npm ci`、TypeScript检查+构建、55项Node测试、3视口Chromium、Compose v1.28.5、现代Linux Docker非root/只读/持久数据和auth-enabled恢复测试；NAS历史探针仅语法检查，不连接 NAS。
- 新 `tests/auth/workflow.test.ts` 静态检查上述触发分支和完整job契约。**该测试证明工作流配置符合预期，不证明main已真正触发。** PR尚未合并，所以正式 `event=push,branch=main,head_sha=<真实合并SHA>` 之Actions运行仍是 **NOT_RUN**，批准合并后必须独立复核。
- 应保持一次性历史NAS测试workflow关闭，避免不必要的远端动作。

## 3. 最新最终SHA的真实CI与回归保全

- 最终实现+归档HEAD：`c71fd6c05dab94ee6dc5118cc034d0d6c4eea5c0`，基准main没有新提交，与main的比较为ahead2/behind0，PR #6处于Draft/open、mergeable=true、clean。
- 同一最新HEAD的 [PR CI 39755060950](https://github.com/lovestream/kevin-learning-home/actions/runs/39755060950) 和 [push CI 39755056270](https://github.com/lovestream/kevin-learning-home/actions/runs/39755056270) 均是 `completed/success`；PR CI job步骤里 verify.ts、Compose解析、Linux container验证均SUCCESS。
- 通过 `docs/implementation/evidence/02a-r1/ci/test-cases.json`、`regression-preservation.json` 核对：55项 PASS，原53项完整保留，新加2项；正式 Docker 测试结果 `auth-container.json` 标明lockedParentScopeHidden和restoredGrantVisibleOnlyAfterUnlock。注意这批随仓库归档的原始 `verification.json` 属于R1实现父SHA `4bb58d48`；最终归档HEAD的成功以真实GitHub Actions最终运行结果和artifact为证，不将父SHA伪装成最终SHA。
- Codex保留了改动前预期失败的两项测试记录与重新通过的结果，未删除历史失败或重写53项初始证据。

## 4. 仍存但不妨碍合并代码的边界

1. **NAS 02A 尚未实机运行：NOT_RUN。** 之前NAS确认的是第一阶段原生锁和v1底座，不能套用到v2认证模块/容器/反代TLS；用户批准后上线前需隔离NAS真机验收。Linux4.4低于Node24官方支持基线这一风险始终存在。
2. **正式HTTPS/Tailscale反代、实际Cookie与Host/Origin传递：NOT_RUN。** 本轮Linux容器内HTTP模拟TLS终止，独立TLS测试在本地完成，不能视为家庭生产入口安全验收。
3. **正式账号、真实学习数据、加密异地备份与钥匙恢复：NOT_RUN。** 当前CLI限制`--synthetic`，checkpoint含密码慢哈希和家庭关系，禁止公开上传或直接作为未加密云备份。
4. **02B学习家园UI尚未实现**，学习/奖励/批阅/媒体业务仍禁用；数学与英语原站继续独立运行，未迁入课程，不得宣称已经完成统一平台。
5. **原站在线可用性** 尚无直接网页/真实记录验收，但本PR没有写旧项目或修改其部署；原站原代码HEAD前后元数据一致。
6. **main post-merge CI** 尚未发生：只能在合并后验收，若失败应暂停02B、修复main再进入后续PR。

## 5. 下一步执行条件

**仅在用户明确批准“合并 PR #6，并推进02B”时**：首先重新读取 PR #6 的最新head、mergeable、main和最新Actions，如HEAD更改需重审；将Draft设Ready，按既定正常GitHub策略合并（例如squash，保留PR历史）；记录真实合并SHA，核对新main的Actions `push` full job成功。随后再从已合并的新main准备 `KLH-IMPLEMENT-02B` Draft PR任务，优先实现孩子/家长登录、权限导航、空学科插件入口、今日计划与家长报告占位，仍只合成数据；不得顺带修改数学/英语、真实NAS或全部课程。

目前的独立复审**不代表用户已批准合并PR6，也不授权执行02B**。
