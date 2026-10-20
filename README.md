# Kevin Learning Home · Kevin 学习家园

KLH-IMPLEMENT-01 建设正式工程底座：React/Vite空壳、Node24/SQLite、版本迁移、合成命令测试、独立媒体目录和一致性备份恢复。**数学与英语尚未整合，旧 `math-learning` 与 `word-request` 继续完全独立运行，并保有各自真实记录。** 本阶段无真实记录迁移、统一钱包、家长账号或生产部署；旧实验原型不作为生产应用使用。

从 [本阶段执行报告](docs/implementation/IMPLEMENT-01-execution-report.md)、[架构](docs/implementation/IMPLEMENT-01-architecture.md)、[运行手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](docs/implementation/IMPLEMENT-01-backup-restore.md)、[文件采用矩阵](docs/implementation/IMPLEMENT-01-adoption-matrix.md) 和 [交接](docs/handoff/IMPLEMENT-01.md) 阅读。

本地（只操作本repo新合成目录）：Node24.15.0、npm11.12.1，执行 `npm ci`、`npm run build`、`node scripts/maintenance.ts migrate --root .foundation-work`、`npm start`，仅回环4177。测试先 `npx playwright install chromium`，再 `node scripts/verify.ts`。正式服务拒绝学习/家长写入，测试身份仅在独立test runner中存在。

历史 [Phase0文档](docs/phase-0/README.md) 保留原时点状态。NAS新部署、权限变更、真实数据迁移、对外入口与下一阶段开发均需另行批准。当前PR完成后暂停供ChatGPT独立审查。
