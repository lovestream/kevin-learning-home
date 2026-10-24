# Kevin 学习家园：当前交接

更新时间：2026-10-24。此页记录**当前事实和下一个执行关口**；之前各 PR 报告是历史截面，不应把其中的“待验收/未合并”当成今天的状态。

## 02B：合并与 NAS 隔离试用验收

- [PR #7](https://github.com/lovestream/kevin-learning-home/pull/7) 已合并：正式 02B 应用版本 `7790da6c07e118da93d8e3221b20a4fcf78c727f`，main push CI [39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578) 成功。60 项 Node、18 项真实 UI、旧3视口、Docker/Compose/恢复测试保留。
- [PR #8](https://github.com/lovestream/kevin-learning-home/pull/8) 的 NAS 试用工具、验收证据和数学复制适配方案已完成独立审查并**合并**，merge SHA `8b99528dbbfca186770f629007225903a89b2875`，最终 PR HEAD `faa0f1c43985e924f5688651d9f7cde20301c9fe` 的 [push CI39955559268](https://github.com/lovestream/kevin-learning-home/actions/runs/39955559268) 和 [PR CI39955563304](https://github.com/lovestream/kevin-learning-home/actions/runs/39955563304) 均成功。本 PR 对 apps/packages/正式 Docker/lock 无运行代码差异；NAS 正式试用镜像仍对应 PR7 版本。
- NAS 实际部署：DS918+ 上隔离目录、合成账户、非 root/只读容器、TLS 代理，仅局域网 IP HTTPS 高位端口，不改旧8容器、DSM、Tailscale 或原网站。Mac Chromium→NAS 真正 HTTPS/认证后端四场景通过；[自动化报告](../implementation/IMPLEMENT-02B-NAS-TRIAL.md)、[证据](../implementation/evidence/02b-nas-trial/acceptance-summary.json)。
- **实体设备新增用户验收（2026-10-23）**：用户已亲自在手机及 iPad 成功访问局域网试用入口，账号登录正常。此为实体设备访问/登录实测，**不等于**手机/iPad 全套业务流程、Android、长期运行、正式家长恢复、外部 Tailscale 或生产部署完成。PR8 最初报告中的 `NEEDS_USER_ACTION` 只是归档时点，不能覆盖最新人工反馈；[验收补充记录](https://github.com/lovestream/kevin-learning-home/pull/8#issuecomment-6366568612)。

## 下一步：数学阶段的严禁越线约束

- **MATH-00审计/合同已完成，独立开发分支待Draft审查，尚未复制课程**：[Issue #9](https://github.com/lovestream/kevin-learning-home/issues/9)。本轮从main `5ccd196`建立`codex/math-00-source-audit`，完成133项来源、273条依赖、原17hash复核、allow/adapt/exclude与9来源片段候选（并非批准整文件复制）。首课只读合同、12项新增审计自检已归档；最终review SHA及push/PR完整CI链接以本分支Draft PR正文为准。不得把“已经规划”写成“已经复制/部署”。
- [已批准的分阶段数学适配方案](../implementation/MATH-COPY-ADAPTATION-PLAN.md)：后续 **MATH-01 一课只读** → **MATH-02 阅读记录可控写入** → **MATH-03 练习闭环** → **MATH-04 分批扩大课程**，每一阶段独立 PR/测试/审查。不一次复制70课（其冻结元数据仍是70项 draft），不得悄悄改 lessonId、taskId、contentVersion/元数据。
- 英语后续独立设计，不提前复制旧 `word-request` 词库/数据；钱包、蛋仔/统一积分暂不合并。旧 `math-learning` 和 `word-request` 必须可独立使用且原文件、真实学习记录不受影响。
- **正式家庭使用仍未获批准**：真实身份、历史学习记录迁移、可持续受信 HTTPS、加密异地备份和新卷恢复、上线/回滚、外部 Tailscale 路径、Node24 与 DSM Linux4.4 的长期支持风险均需单独评估。当前7天测试CA及合成密码不能成为生产配置。
- NAS 试用容器 `restart=no` 并保留；不要自动清理、重建、改端口或覆盖合成试用数据。若临时证书到期，需要重新设计后续试用证书/入口，不得通过降低TLS验证标准绕过。旧8容器不可触碰。

## 资料定位

- [02B NAS 执行报告](../implementation/IMPLEMENT-02B-NAS-TRIAL.md)
- [数学复制适配规划](../implementation/MATH-COPY-ADAPTATION-PLAN.md)
- [来源冻结和课程清单](../implementation/evidence/02b-nas-trial/source-freeze.json)
- [MATH-00 任务和验收边界](https://github.com/lovestream/kevin-learning-home/issues/9)


## MATH-00 本轮审查入口与停止线

- [执行报告](../implementation/MATH-00-EXECUTION-REPORT.md)、[来源审计/逐文件SHA/耦合与许可](../implementation/MATH-00-SOURCE-AUDIT.md)、[机器清单](../implementation/evidence/math-00/source-inventory.json)、[来源边界](../implementation/evidence/math-00/source-boundaries.json)。数学70唯一lessonId/4 contentVersion/70 draft不变，首课12 taskId只记录元数据，不复制题目答案。
- [下一轮只读合同与A01–A12验收](../implementation/MATH-01-READONLY-ACCEPTANCE.md)、[DTO字段与摘要计算合同](../implementation/evidence/math-00/readonly-contract.json)。接口仍未实现；不要把本文当MATH-01授权。
- 原课堂不能直接复制：它引用完整taskSets/写API；首课有referenceAnswer/expectedExplanation/expectedEvidence。只读方案逐字段投影并只取observe/box-camera，inline SVG不需要静态SVG MIME、打印模板或第三方游戏素材。
- [本机目标验证](../implementation/evidence/math-00/local-checks.json)：12项Python审计自检+原workflow约束测试通过；完整Node60/UI18/原三视口/Docker/Compose均保留，由最终HEAD两套CI核对，不用本机目标测试替代。CI只做离线metadata验证，不读取旧repo或SSH NAS。
- apps/、packages/（含auth）、正式Docker/package/lock运行代码零修改；数学/英语HEAD和status指纹前后不变，英语blob读取0，真实数据/备份/inbox/私有词包未读取。NAS本轮零连接，现有试用和CA保留。
- 从本分支Draft PR交付后停止，等待ChatGPT审查，不合并、不做MATH-01源码复制或页面/API实现，不实施MATH-02/03写入，不合并钱包/蛋仔。
