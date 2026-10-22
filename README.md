# Kevin Learning Home · Kevin 学习家园

当前开发 **IMPLEMENT-02B 学习家园外壳**：统一登录、孩子学习首页、家长二次解锁导航、科目入口和响应式页面，接入已通过验收的真实Node/SQLite会话。数学/英语仍为待迁入；原网站完全独立，无课程或真实记录迁移、统一钱包、蛋仔逻辑或NAS生产部署。

PR #6已合并至main `f2c42c2475d0ae85c1688b13e437bc4332d12315`，合并后[main CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39765830063)成功。02B使用独立`codex/implement-02b-shell`分支及Draft PR，完成后等待ChatGPT审查，不自动合并或进入下一阶段。

阅读[页面与状态设计](docs/implementation/IMPLEMENT-02B-ui-architecture.md)、[安全评估](docs/implementation/IMPLEMENT-02B-security-review.md)、[执行与截图](docs/implementation/IMPLEMENT-02B-execution-report.md)、[当前交接](docs/handoff/current.md)。`npm run verify`执行完整Node、旧浏览器回归和真实React端到端验证；Linux CI另跑Compose和正式容器。认证仍默认关闭，合成本机启用方式见页面设计文档；没有有效默认账号/口令。

## 02A开发时点的历史说明

下列文字保留02A阶段的原始状态，其“待审/无登录UI”描述属于当时；当前状态以上方02B说明和交接为准。

KLH-IMPLEMENT-02A 在已合并的工程底座上实现 SQLite v2、家庭身份/授权、安全会话与离线合成账户初始化。**数学与英语尚未整合，旧 `math-learning` 与 `word-request` 继续完全独立运行，并保有各自真实记录。** 本轮没有真实账户/记录、统一钱包、登录UI或NAS生产部署；旧实验原型不作为生产应用使用。

PR #5已合并到main `87ec45e9`。当前02A独立Draft PR待ChatGPT审查；从[02A执行报告](docs/implementation/IMPLEMENT-02A-execution-report.md)、[威胁模型](docs/implementation/IMPLEMENT-02A-auth-threat-model.md)、[迁移](docs/implementation/IMPLEMENT-02A-migration-report.md)、[接口/受控运行](docs/implementation/IMPLEMENT-02A-api-and-operations.md)与[交接](docs/handoff/current.md)阅读。02B尚未开始。

从 [本阶段执行报告](docs/implementation/IMPLEMENT-01-execution-report.md)、[架构](docs/implementation/IMPLEMENT-01-architecture.md)、[运行手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](docs/implementation/IMPLEMENT-01-backup-restore.md)、[文件采用矩阵](docs/implementation/IMPLEMENT-01-adoption-matrix.md) 和 [交接](docs/handoff/IMPLEMENT-01.md) 阅读。

本地（只操作本repo新合成目录）：Node24.15.0、npm11.12.1，执行 `npm ci`、`npm run build`、`node scripts/maintenance.ts migrate --root .foundation-work`、`npm start`，仅回环4177。测试先 `npx playwright install chromium`，再 `node scripts/verify.ts`。正式服务拒绝学习/家长写入，测试身份仅在独立test runner中存在。

历史 [Phase0文档](docs/phase-0/README.md) 保留原时点状态。NAS新部署、权限变更、真实数据迁移、对外入口与下一阶段开发均需另行批准。当前PR完成后暂停供ChatGPT独立审查。

[NAS GATE真机验收报告](docs/implementation/IMPLEMENT-01-NAS-GATE-report.md)是PR5历史证据，已通过并清理；不代表02A已在NAS部署或验证，Linux4.4超出官方支持基线的风险保留。
