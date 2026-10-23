# Kevin Learning Home · Kevin 学习家园

2026-10-23：[PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)已按用户明确授权合并，实际合并提交`7790da6c07e118da93d8e3221b20a4fcf78c727f`。[合并后的main完整CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578)成功：Node60、真实界面18、原3视口、Docker/Compose。React登录、孩子学习首页、家长解锁导航与学科空入口现已在main。

当前进行**NAS局域网隔离合成试运行和数学复制适配规划**，独立[Draft PR #8](https://github.com/lovestream/kevin-learning-home/pull/8)等待ChatGPT审查，未合并。NAS使用精确7790da6正式镜像、独立数据卷和临时测试TLS；原8个容器未改变。手机/iPad实体操作仍需实际验收，试用不代表生产上线。只需LAN访问，外部沿用用户现有Tailscale，不配置公网或更改Tailscale。

数学/英语尚未接入，原站继续独立；无真实账户/记录迁移、积分或蛋仔合并。先审查[数学复制适配方案](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/MATH-COPY-ADAPTATION-PLAN.md)，再安排实际接入，英语随后；正式使用前另行验收真实身份、持续HTTPS、加密备份恢复与上线条件。

从[项目当前状态](PROJECT_STATUS.md)、[当前交接](docs/handoff/current.md)、[本轮NAS执行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/IMPLEMENT-02B-NAS-TRIAL.md)阅读。`npm run verify`保留60项Node、18项真实React端到端及旧浏览器回归，Linux CI另验Compose和正式容器；没有可用于生产的默认账号/密码。

## 02A开发时点的历史说明

下列文字保留02A阶段的原始状态，其“待审/无登录UI”描述属于当时；当前状态以上方02B说明和交接为准。

KLH-IMPLEMENT-02A 在已合并的工程底座上实现 SQLite v2、家庭身份/授权、安全会话与离线合成账户初始化。**数学与英语尚未整合，旧 `math-learning` 与 `word-request` 继续完全独立运行，并保有各自真实记录。** 本轮没有真实账户/记录、统一钱包、登录UI或NAS生产部署；旧实验原型不作为生产应用使用。

PR #5已合并到main `87ec45e9`。当前02A独立Draft PR待ChatGPT审查；从[02A执行报告](docs/implementation/IMPLEMENT-02A-execution-report.md)、[威胁模型](docs/implementation/IMPLEMENT-02A-auth-threat-model.md)、[迁移](docs/implementation/IMPLEMENT-02A-migration-report.md)、[接口/受控运行](docs/implementation/IMPLEMENT-02A-api-and-operations.md)与[交接](docs/handoff/current.md)阅读。02B尚未开始。

从 [本阶段执行报告](docs/implementation/IMPLEMENT-01-execution-report.md)、[架构](docs/implementation/IMPLEMENT-01-architecture.md)、[运行手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](docs/implementation/IMPLEMENT-01-backup-restore.md)、[文件采用矩阵](docs/implementation/IMPLEMENT-01-adoption-matrix.md) 和 [交接](docs/handoff/IMPLEMENT-01.md) 阅读。

本地（只操作本repo新合成目录）：Node24.15.0、npm11.12.1，执行 `npm ci`、`npm run build`、`node scripts/maintenance.ts migrate --root .foundation-work`、`npm start`，仅回环4177。测试先 `npx playwright install chromium`，再 `node scripts/verify.ts`。正式服务拒绝学习/家长写入，测试身份仅在独立test runner中存在。

历史 [Phase0文档](docs/phase-0/README.md) 保留原时点状态。NAS新部署、权限变更、真实数据迁移、对外入口与下一阶段开发均需另行批准。当前PR完成后暂停供ChatGPT独立审查。

[NAS GATE真机验收报告](docs/implementation/IMPLEMENT-01-NAS-GATE-report.md)是PR5历史证据，已通过并清理；不代表02A已在NAS部署或验证，Linux4.4超出官方支持基线的风险保留。

---

## 当前状态（2026-10-23，优先于上面的历史描述）

**[查看项目最新状态与下一步](PROJECT_STATUS.md)**。PR #5、#6、#7均已合并main；02B登录网页/孩子首页/家长界面已进入main，并通过实际合并提交完整CI。NAS当前为独立合成试用，实体设备验收和正式上线条件仍须分别验证。

- [main中的02B网页源码](apps/web/src/main.tsx)
- [02B独立R1验收报告](docs/reviews/KLH-IMPLEMENT-02B-R1-ACCEPTANCE.md)
- [PR8：NAS试运行证据与数学复制适配规划](https://github.com/lovestream/kevin-learning-home/pull/8)

旧数学/英语继续独立，未迁课程或真实记录，不合并钱包/蛋仔。下一步由ChatGPT审查PR8和数学方案，再安排后续开发。
