# Kevin Learning Home · Kevin 学习家园

KLH-IMPLEMENT-02A 在已合并的工程底座上实现 SQLite v2、家庭身份/授权、安全会话与离线合成账户初始化。**数学与英语尚未整合，旧 `math-learning` 与 `word-request` 继续完全独立运行，并保有各自真实记录。** 本轮没有真实账户/记录、统一钱包、登录UI或NAS生产部署；旧实验原型不作为生产应用使用。

PR #5已合并到main `87ec45e9`。当前02A独立Draft PR待ChatGPT审查；从[02A执行报告](docs/implementation/IMPLEMENT-02A-execution-report.md)、[威胁模型](docs/implementation/IMPLEMENT-02A-auth-threat-model.md)、[迁移](docs/implementation/IMPLEMENT-02A-migration-report.md)、[接口/受控运行](docs/implementation/IMPLEMENT-02A-api-and-operations.md)与[交接](docs/handoff/current.md)阅读。02B尚未开始。

从 [本阶段执行报告](docs/implementation/IMPLEMENT-01-execution-report.md)、[架构](docs/implementation/IMPLEMENT-01-architecture.md)、[运行手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](docs/implementation/IMPLEMENT-01-backup-restore.md)、[文件采用矩阵](docs/implementation/IMPLEMENT-01-adoption-matrix.md) 和 [交接](docs/handoff/IMPLEMENT-01.md) 阅读。

本地（只操作本repo新合成目录）：Node24.15.0、npm11.12.1，执行 `npm ci`、`npm run build`、`node scripts/maintenance.ts migrate --root .foundation-work`、`npm start`，仅回环4177。测试先 `npx playwright install chromium`，再 `node scripts/verify.ts`。正式服务拒绝学习/家长写入，测试身份仅在独立test runner中存在。

历史 [Phase0文档](docs/phase-0/README.md) 保留原时点状态。NAS新部署、权限变更、真实数据迁移、对外入口与下一阶段开发均需另行批准。当前PR完成后暂停供ChatGPT独立审查。

[NAS GATE真机验收报告](docs/implementation/IMPLEMENT-01-NAS-GATE-report.md)是PR5历史证据，已通过并清理；不代表02A已在NAS部署或验证，Linux4.4超出官方支持基线的风险保留。

---

## 当前状态（2026-10-23，优先于上面的历史描述）

**[查看项目最新状态与下一步](PROJECT_STATUS.md)**。此前README中“02A仍为Draft、02B未开始”是旧阶段遗留文字，**已不再准确**：PR #5、#6均已合并；**[PR #7](https://github.com/lovestream/kevin-learning-home/pull/7) 的02B登录网页/孩子首页/家长界面已完成R1复审，但仍在Draft开发分支，尚未合并到main，也未部署NAS。**

- [PR #7 的实际02B网页源代码](https://github.com/lovestream/kevin-learning-home/tree/codex/implement-02b-shell/apps/web/src)
- [02B代码复审最终验收报告（main内）](docs/reviews/KLH-IMPLEMENT-02B-R1-ACCEPTANCE.md)
- [02B R1整改与18项真实浏览器测试](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02b-shell/docs/implementation/IMPLEMENT-02B-review-R1.md)

下一步需要**用户批准合并PR #7→核验main新CI→另行确定NAS合成环境验收/学科复制适配**。本项目仍未迁入原数学/英语课程和真实学习记录，两个旧网站保持独立运行。
