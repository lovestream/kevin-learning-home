# IMPLEMENT-02A R1 整改报告

2026-10-22；沿用 `codex/implement-02a-auth` / [Draft PR #6](https://github.com/lovestream/kevin-learning-home/pull/6)，整改前HEAD `1a31550670b5eb7f4e169e9a0f969ade9a62ffdc`，main仍为 `87ec45e95809d00b7104242702fb28ffbb6f7881`。任务来自 `chatgpt/klh-implement-02a-review-r1@5633acc15783d8032a1bad3594b06b978061c27f`，原文归档在[复审任务书](../reviews/KLH-IMPLEMENT-02A-R1-REVIEW.md)，blob `cf5f4a6c21b12068c3a5d5c059f7f666c60302ba`。

只做复审要求的两项整改；既有SQLite v2、checkpoint、flock、scrypt、会话生命周期和HTTP业务禁用边界保持。原53项测试及原CI结果保留，不将历史证据改写成R1结果。

## R1-01：锁定家长不暴露学习档案范围

`AuthService.view()` 在一次时钟读取中确定parentUnlocked。learner actor仍只返回自己的唯一learner ID；parent仅在二次解锁仍有效时查询当前有效grants并返回ID，否则learnerIds=[]，不查询或返回授权列表、标签或匿名数量。parent-lock、普通rotate和超时通过同一SessionDTO规则隐藏。`GET /api/v1/learners`和单个learner的服务端检查继续403拒绝锁定家长，Role/Tailscale头不授予权限。

新增真实HTTP完整状态链：锁定login → GET/session仍空 → unlock只见有效grant、不见已撤销grant → revoke立即隐藏/拒绝 → 重授权恢复 → 主动lock清空 → 重启仍锁定、旧cookie401 → 再解锁后rotate清空且旧cookie401 → 再解锁到期清空 → 重启不恢复过期权限。孩子在同一过程中始终只见自身、不能跨learner，伪造角色头不改变身份。锁定DTO同时断言不含合成learner ID或标签。

原备份恢复用例和正式镜像用例保留原名称及恢复后凭据/grant保真的断言：先验证恢复后的新登录仍锁定且IDs为空，再二次解锁验证原有有效授权列表。没有为求绿删除grant校验或降级TLS/权限负例。新增机器证据 `lockedParentScopeHidden`、`restoredGrantVisibleOnlyAfterUnlock` 在auth镜像测试成功后生成。

## R1-02：main push 运行完整 CI

foundation workflow的push分支增加main，保留两个原开发分支及目标main的pull_request。所有触发共用现有完整job：npm ci、typecheck/build、全部Node测试、3个Chromium视口、Compose1.28.5、现代Linux正式镜像与auth会话/备份/杀进程/重启验证，没有main专属简化路径。checkout继续使用准确event HEAD，NAS仅语法检查。

新增CI触发契约回归：检查main与开发分支push、main目标PR、完整job无条件执行、关键完整步骤及准确HEAD选择；不引入YAML依赖或外部服务。此测试只检查仓库明确的branch列表与完整job契约，实际YAML由GitHub Actions解析，不能冒充已经运行了main合并提交。

[合并运行手册](IMPLEMENT-02A-api-and-operations.md#合并与-main-ci-验收r1新增尚未执行合并)明确：最终PR HEAD绿灯且获ChatGPT复审/用户批准后才合并；随后读取实际merge/squash SHA，单独核对event=push、branch=main、该SHA的新完整Actions运行及artifact。**main合并后CI为NOT_RUN；本轮不合并，不以PR绿灯替代。**

## 验证与失败历史

先写回归再修复：R1-01在原实现因锁定login返回真实合成ID失败；R1-02因push分支缺main失败，定向2项均为预期失败。修复后定向HTTP、workflow及原v2备份恢复3项通过。完整回归实际55项=原53项+新增HTTP/CI契约各1项，JUnit逐项比对确认原53个用例名称完整保留且全部PASS。

本地PASS_LOCAL：55项Node、typecheck/build、3个Chromium视口通过，实际Node24.15.0/darwin-arm64；该实现运行时尚未提交，verification明确worktreeDirty=true，不冒充已提交HEAD。安全证据保存于[02a-r1](evidence/02a-r1/README.md)，与[原02A证据](evidence/02a/README.md)分开。

R1实现提交 `4bb58d4868480d7cc18b76486e8eb9f01b3a4be8` 的[PR CI 39706006427](https://github.com/lovestream/kevin-learning-home/actions/runs/39706006427)和[push CI 39706002116](https://github.com/lovestream/kevin-learning-home/actions/runs/39706002116)均SUCCESS。下载artifact核对executedHeadSha匹配、worktreeDirty=false，55项全部PASS，原53个用例名称完整保留。环境为Node24.15.0/linux-x64/kernel6.17.0-1022-azure；3视口、Compose1.28.5、非root readonly正式镜像、flock竞争、SIGKILL自动重启、迁移/备份恢复及启用auth的权限回归均通过。R1 CI未出现失败；此前两项定向预期失败记录保留在local/regression-history.json。

| 整改 | 结果 | 证据和边界 |
| --- | --- | --- |
| R1-01 | PASS_LOCAL / PASS_CI | [全部55项](evidence/02a-r1/ci/test-cases.json)、[原53项保留核对](evidence/02a-r1/ci/regression-preservation.json)、[正式镜像权限/恢复](evidence/02a-r1/ci/auth-container.json) |
| R1-02 | 配置/完整开发分支CI PASS_LOCAL / PASS_CI；main合并后实跑NOT_RUN | main和开发分支共用完整job，workflow契约通过；尚未合并，不能证明main已运行 |

长期归档[run元数据](evidence/02a-r1/ci/run.json)及文件校验和，不依赖短期artifact保存期限。文档归档会形成后续提交，准确最终HEAD和该HEAD最后CI在[PR6正文](https://github.com/lovestream/kevin-learning-home/pull/6)定位，不能用实现父提交通过代替最终归档提交验证。最后归档提交仍须完整CI绿灯后交接，不以此次实现提交的绿灯替代。

## 未运行范围与停止线

未连接NAS、未更改其Docker/系统/站点，未读取真实学习数据；旧math-learning/word-request仅只读Git元数据前后核对，不声称验证了原站在线状态。NAS02A、正式TLS/反代入口、真实账户/备份加密、main实际合并提交CI均NOT_RUN。旧Linux4.4/Node24支持风险继续保留。

保持PR6 Draft；完成最新HEAD完整CI与交接后STOP，等待ChatGPT复审。不合并、不进入02B、不生成真实家庭账号、不部署NAS生产服务。
