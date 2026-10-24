# Kevin Learning Home · 项目当前状态

2026-10-24，此为MATH-00独立开发分支的交付状态；未合并到main。历史执行报告保持原有时点。

| 工作 | 当前事实 | 入口 |
| --- | --- | --- |
| IMPLEMENT-01 / 02A / 02B | PR5/6/7均已合并main，正式02B源码7790da6 | [PR7](https://github.com/lovestream/kevin-learning-home/pull/7) |
| NAS隔离合成试用 | PR8已合并8b99528；用户已实测手机/iPad访问与登录成功，不扩大为全部业务/生产验收 | [PR8](https://github.com/lovestream/kevin-learning-home/pull/8)、[当前交接](docs/handoff/current.md) |
| MATH-00 来源审计/首课准备 | 独立分支codex/math-00-source-audit，133来源/273依赖、原17hash、70draft元数据已核对，Draft待审 | [Issue9](https://github.com/lovestream/kevin-learning-home/issues/9)、[完整审计](docs/implementation/MATH-00-SOURCE-AUDIT.md) |
| MATH-01 首课可视化只读 | 仅合同/验收任务书，**未复制课程、未实现接口/页面** | [下一轮任务书](docs/implementation/MATH-01-READONLY-ACCEPTANCE.md) |
| MATH-02/03写入/练习与英语 | 仅规划，未实施；钱包和蛋仔不合并 | [既有分阶段方案](docs/implementation/MATH-COPY-ADAPTATION-PLAN.md) |
| 真实身份/记录、生产NAS、持续HTTPS/加密备份恢复 | NOT_RUN/未授权上线 | 本轮不操作NAS或真实数据 |

MATH-00只读取固定tracked Git blob并记录元数据；数学和英语原文件/HEAD/status不变，不运行旧构建/测试，不打开真实记录/备份/inbox/.env/密钥/私有词包。新增12项审计自检；原60 Node、18 UI、三视口、Docker/Compose不删除不跳过，最终精确HEAD的push/PR CI在本分支Draft PR正文核对。

现有NAS试用容器与7天CA保留，不自动清理或部署新内容；CA到期需单独安排，不降低验证或改生产证书。手机/iPad登录通过不代表数学首课已验收、Tailscale外部路径或生产可用。Linux4.4与Node24长期支持风险继续保留。

本轮交付Draft PR后停止，等待ChatGPT审查；只有MATH-00通过并另行授权后才执行MATH-01。不要把此分支文档误读为已进入课程迁移，也不要自行合并。
