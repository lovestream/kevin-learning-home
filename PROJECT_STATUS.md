# Kevin Learning Home · 项目当前状态

2026-10-24，MATH-00 已审查合并；本分支按 Issue #11 实现 MATH-01 单课可视化只读，提交独立 Draft PR 等待审查。**本分支尚未合并或部署，main/NAS现有02B不包含数学课堂**。历史报告是各自时点的事实。

| 工作 | 当前事实 | 入口 |
| --- | --- | --- |
| IMPLEMENT-01 / 02A / 02B | PR5/6/7已合并main，正式02B试用源码7790da6 | [PR7](https://github.com/lovestream/kevin-learning-home/pull/7) |
| NAS隔离合成试用 | PR8已合并8b99528；手机/iPad实体登录通过，不代表全部业务或生产验收 | [PR8](https://github.com/lovestream/kevin-learning-home/pull/8) |
| MATH-00 来源审计/首课准备 | **已通过审查、合并PR #10**，merge `6864de8779953348c031faafdd18571447c38e0c`；133来源/273依赖、70 draft、原17hash、9候选片段及12新增审计测试 | [PR10](https://github.com/lovestream/kevin-learning-home/pull/10)、[审查评论](https://github.com/lovestream/kevin-learning-home/pull/10#issuecomment-6378456178) |
| MATH-01 首课可视化只读 | 本分支只接入 G3-U01-B01 公开教学投影与原可视化片段；默认关闭flag，Draft PR待独立审查；完整证据见执行报告 | [执行报告](docs/implementation/MATH-01-EXECUTION-REPORT.md)、[任务书](docs/implementation/MATH-01-READONLY-ACCEPTANCE.md) |
| MATH-02/03写入/练习及英语 | 仅规划，未实施；钱包、蛋仔不合并 | [分阶段方案](docs/implementation/MATH-COPY-ADAPTATION-PLAN.md) |
| 真实身份/记录、生产NAS、持续HTTPS/加密备份恢复 | 未完成、未授权上线 | [当前交接](docs/handoff/current.md) |

MATH-00审查SHA `67e514566d23f8fecc823e2ec56bfdd1a28a7431`，push [40051334963](https://github.com/lovestream/kevin-learning-home/actions/runs/40051334963)与PR [40051366888](https://github.com/lovestream/kevin-learning-home/actions/runs/40051366888)完整CI通过，原60 Node/18 UI/3视口/Docker/Compose保留。离线检查仅覆盖提交清单一致性；另独立核对9项原冻结文件Git blob，结果相符。

MATH-01按Issue11只在KLH独立分支、本地/CI合成家庭实现G3-U01-B01只读演示，采用服务端白名单DTO、不传taskSets/答案、不写进度；每个实际片段追踪原始与目标hash、许可，逐项验收A01–A12，提交Draft PR后停止。不可动旧数学/英语项目、真实记录或NAS试用容器。

现有NAS试用容器与7天CA保留，不自动清理/升级；证书到期独立安排，不能降低TLS验证。Node24在Linux4.4上的长期支持、正式备份恢复/密钥/外部访问仍待专门处理。
