# Kevin 学习家园：当前交接

2026-10-24。**MATH-01 独立审查已完成、PR #12 已合并；本地/CI拥有首课只读功能，但NAS原有试用镜像仍是02B，不含数学课程。** 本文覆盖先前Draft阶段交接的历史状态。

## MATH-01 合并与验收

- [PR #12](https://github.com/lovestream/kevin-learning-home/pull/12) 最终审查 HEAD `824907055badc8484d9be2d480730fc1516013a8`，已审查并合并，merge SHA `f62a485492f79afe7832e8ec7021bfbfb62e214a`。[ChatGPT审查意见](https://github.com/lovestream/kevin-learning-home/pull/12#issuecomment-6383023852)归档于PR评论：GitHub不允许作者正式Approve自己的PR，不能冒充平台APPROVED。
- [push CI40075159711](https://github.com/lovestream/kevin-learning-home/actions/runs/40075159711)、[PR CI40075162094](https://github.com/lovestream/kevin-learning-home/actions/runs/40075162094)已核实精确HEAD、completed/success。原60 Node、18 UI、3视口、新12数学Node/9数学浏览器、Docker/Compose和容器恢复保持通过。合并后的main独立CI另行看Actions，不得将PR CI称为main通过。
- [实施报告/A01–A12/原始失败修复](../implementation/MATH-01-EXECUTION-REPORT.md)、[来源9项至8目标与hash](../implementation/evidence/math-01/origins.json)、[实际单课投影等价](../implementation/evidence/math-01/public-projection-check.json)、[来源边界](../implementation/evidence/math-01/source-boundaries.json)。仓库 `evidence/math-01/ci`归档的是早期实现提交`3970dd8`的快照；最终HEAD两套CI日志/PR正文独立验证，不混淆时点。
- 只读首课：`G3-U01-B01` / contentVersion `2026-10-07.2` / editorialRevision `2026-10-09.4` / `draft`。六步教学、相机/盒子投影与临时照片可交互，只在浏览器组件内存；第六步说明练习未接入。只复制原审计批准片段及单课公开DTO，未将70课、题库答案或旧数学写API移入。
- 功能开关`KLH_MATH_READONLY=1`必须显式配置且有正式auth，默认关闭；服务端session/孩子身份/家长解锁与实时grant为唯一来源，现有Host/Origin/Cookie/CSRF/CSP维持。学习状态11业务表不变，认证必要last_seen/audit/session写入另计。
- Math实体Mac/Safari/手机/iPad/Android人工验收`NOT_RUN`。既有手机/iPad通过的是02B登录，不是本次课程页面验收；真实Kevin学习记录未导入。本次未连接/部署/清理NAS。

## 前置已合并

- IMPLEMENT-01/02A/02B：PR5/6/7已合并，原正式02B NAS试用镜像来源`7790da6`；NAS隔离试用归档PR8合并`8b99528`，仍保留原容器和临时CA。
- MATH-00：PR10合并`6864de8`，来源审计133文件/273依赖/70 draft元数据/9候选与首课只读合同，Issue9关闭。

## 下一关口：MATH-02（未授权实施）

MATH-02 将首次涉及数学学习阅读记录的持久化，需要单独范围审查和任务授权，不能基于MATH-01通过自动放开写入。开发前必须确认数据模型按learnerId+math+contentVersion隔离，服务端重新鉴权，命令schema/revision/幂等receipt/event落在同一SQLite事务，含重试、409冲突、权限撤销、SIGKILL重启、备份新卷恢复与多孩子隔离的独立测试；这仍**不是**练习、积分或蛋仔权限。每阶段独立分支、Draft PR、完整双事件CI及审查。

当前NAS隔离试用`restart=no`，旧8容器、原数学/英语站和真实数据不能触碰；7天CA有期限，不得降低TLS验证或自动替换生产证书。正式家庭使用仍须持续受信HTTPS、真实身份/密钥恢复、加密异地备份、新卷恢复、外部Tailscale路线与Node24/DSM Linux4.4支持评估。NAS数学课程试用另获明确授权后方能开展。
