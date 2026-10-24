# Kevin Learning Home · 项目当前状态

更新：2026-10-24。**MATH-01 已完成独立审查、合并至 main；数学课堂只读功能尚未部署NAS。** 历史PR报告按其归档时点解释，不把“待合并”混同于当前状态。

| 阶段 | 当前事实 | 证据 |
| --- | --- | --- |
| 基础外壳/认证 IMPLEMENT-01/02A/02B | PR5/6/7已合并；既有NAS隔离试用应用仍是02B镜像 `7790da6` | [PR7](https://github.com/lovestream/kevin-learning-home/pull/7) |
| NAS隔离试用 | PR8已合并；用户手机/iPad实测访问/登录成功，不包含数学课程 | [PR8](https://github.com/lovestream/kevin-learning-home/pull/8) |
| MATH-00数学来源审计 | PR10已合并；133来源/273依赖与首课来源候选 | [PR10](https://github.com/lovestream/kevin-learning-home/pull/10) |
| MATH-01首课可视化只读 | **[PR12](https://github.com/lovestream/kevin-learning-home/pull/12)已审查合并**，merge `f62a485492f79afe7832e8ec7021bfbfb62e214a`；G3-U01-B01单课、六步只读、默认flag关闭；无阅读记录/练习/奖励写入 | [ChatGPT审查评论](https://github.com/lovestream/kevin-learning-home/pull/12#issuecomment-6383023852)、[实施报告](docs/implementation/MATH-01-EXECUTION-REPORT.md) |
| MATH-02阅读记录持久化 | **未开始；需另设独立授权、任务书、Draft PR和审查** | [分阶段规划](docs/implementation/MATH-COPY-ADAPTATION-PLAN.md) |
| 英语/钱包/蛋仔/70课扩大覆盖 | 未实施，旧网站继续独立使用 | [交接](docs/handoff/current.md) |
| NAS数学课程部署及真实Kevin数据迁移 | **未批准、未执行**；实体手机/iPad数学课堂验收NOT_RUN | [执行报告](docs/implementation/MATH-01-EXECUTION-REPORT.md) |

MATH-01最终审查SHA `824907055badc8484d9be2d480730fc1516013a8`；[push CI40075159711](https://github.com/lovestream/kevin-learning-home/actions/runs/40075159711)与[PR CI40075162094](https://github.com/lovestream/kevin-learning-home/actions/runs/40075162094)均success：原60 Node/18 UI/三视口，新增12数学Node/9浏览器，Docker/Compose/重启与恢复保留。旧学习表11项未变化（会话与认证审计必要写入另计）。合并后的main独立CI不使用PR成功冒充，结果见Actions。

严格限制：现有NAS试用仍为02B且`restart=no`，短期试用CA、原8容器、旧站和真实记录不动。不得自动部署课程、重建/清理容器、改DSM/Tailscale/凭据或迁移历史。长期TLS、异地加密备份/新卷恢复、Linux4.4/Node24维护兼容和实体数学设备体验仍为上线前关口。
