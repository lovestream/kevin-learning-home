# Kevin Learning Home · 项目当前状态

## 2026-10-25：MATH-FULL-01 完成，独立 Draft PR 待审

本开发分支 `codex/math-full-01-70-lessons` 完成 [Issue #15](https://github.com/lovestream/kevin-learning-home/issues/15)：**70/70 六步课堂、64 交互/6 静态、51 教具模式、三视口 210 场景通过**。先完成代表课 checkpoint，再在同一分支批量完成全量，没有逐课停工或创建多份 PR/worktree。全部内容仍为 draft，不能冒称教材已审定。

本机免账号入口 **http://127.0.0.1:4179/** 已在用户实际 Mac 的可见 Chromium 打开；70 课目录与折纸课 0%→100% 实际操作已核实。固定交付在 `~/Documents/Kevin-Learning-Home-Trial/`：`打开70课体验.command`、`70课体验说明.md`。当前只有本机回环入口；Mac 后续锁屏不影响已完成的 probe，用户体验前须自行解锁。新 70 课在 **NAS/实体手机/iPad NOT_DEPLOYED**，不要把虚拟视口验证写成实体跨设备上线。

| 范围 | 当前事实 |
| --- | --- |
| main / 既有底座 | PR14 已合并 `942dc508858f548af1e0517aa3365e08bfbee0e4`；后续路线文档 main `44dca2affc369f89b3540ec7e1a11f0e3a100c08` CI 已成功；本批代码尚待 Draft PR 审查 |
| 新本机预览 | 独立 content-only 进程、显式启用、127.0.0.1:4179；无账号、真实资料、SQLite、成绩或阅读写入 |
| 新课验收 | 70 个唯一 ID、原版本/修订/单元/先修与正文保留；5,003 字段投影、145 来源/目标 hash；210 浏览器场景、新 16 测试、原完整本地回归通过 |
| 原 NAS 38443 / 38444 | 旧 02B / 合成单课仍保留；本轮没有部署/改容器、CA、权限或 Tailscale |
| 849 道练习 | 未接入；[Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 独立批次，335 解释题不能假自动评分 |
| 数学小侦探/思维卡/高年级 | 未迁入；[站级残余台账](docs/implementation/MATH-FULL-SOURCE-SCOPE.md)及 Issue #17 单独审计 |
| 正式身份/真实记录/积分/蛋仔/生产部署 | 暂停，不属于本机内容体验 |
| Mac 目录 | 继续复用原 math-trial 工作副本，11 个相关 worktree/主目录没有新增、删除或移动；原私密指南保留 |

[执行报告](docs/implementation/MATH-FULL-01-REPORT.md)、[逐课矩阵](docs/implementation/evidence/math-full-01/lessons-coverage.json)、[来源范围](docs/implementation/MATH-FULL-SOURCE-SCOPE.md)、[当前交接](docs/handoff/current.md)。最终精确 HEAD 的 push/PR 完整 CI（含原 Docker/Compose/恢复）以本批 Draft PR 正文最终记录核实，不能用已成功的 main 或旧 PR CI 代替。

保持 Draft、不合并，等待 ChatGPT 独立复审；旧数学/英语独立，不反向修改、不导入 Kevin 真实数据。70 课教学完成不代表 849 题或旧数学整站完成。原 MATH-02 持久化继续暂停。
