# Kevin Learning Home · Kevin 学习家园

KLH-IMPLEMENT-02A 在已合并的工程底座上实现 SQLite v2、家庭身份/授权、安全会话与离线合成账户初始化。**数学与英语尚未整合，旧 `math-learning` 与 `word-request` 继续完全独立运行，并保有各自真实记录。** 本轮没有真实账户/记录、统一钱包、登录UI或NAS生产部署；旧实验原型不作为生产应用使用。

PR #5已合并到main `87ec45e9`。当前02A独立Draft PR待ChatGPT审查；从[02A执行报告](docs/implementation/IMPLEMENT-02A-execution-report.md)、[威胁模型](docs/implementation/IMPLEMENT-02A-auth-threat-model.md)、[迁移](docs/implementation/IMPLEMENT-02A-migration-report.md)、[接口/受控运行](docs/implementation/IMPLEMENT-02A-api-and-operations.md)与[交接](docs/handoff/current.md)阅读。02B尚未开始。

从 [本阶段执行报告](docs/implementation/IMPLEMENT-01-execution-report.md)、[架构](docs/implementation/IMPLEMENT-01-architecture.md)、[运行手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](docs/implementation/IMPLEMENT-01-backup-restore.md)、[文件采用矩阵](docs/implementation/IMPLEMENT-01-adoption-matrix.md) 和 [交接](docs/handoff/IMPLEMENT-01.md) 阅读。

本地（只操作本repo新合成目录）：Node24.15.0、npm11.12.1，执行 `npm ci`、`npm run build`、`node scripts/maintenance.ts migrate --root .foundation-work`、`npm start`，仅回环4177。测试先 `npx playwright install chromium`，再 `node scripts/verify.ts`。正式服务拒绝学习/家长写入，测试身份仅在独立test runner中存在。

历史 [Phase0文档](docs/phase-0/README.md) 保留原时点状态。NAS新部署、权限变更、真实数据迁移、对外入口与下一阶段开发均需另行批准。当前PR完成后暂停供ChatGPT独立审查。

[NAS GATE真机验收报告](docs/implementation/IMPLEMENT-01-NAS-GATE-report.md)是PR5历史证据，已通过并清理；不代表02A已在NAS部署或验证，Linux4.4超出官方支持基线的风险保留。
