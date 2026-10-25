# Kevin Learning Home · 项目当前状态

## MATH-FULL-01 R2：70 课已交付 NAS 局域网入口

**[打开 NAS 学习家园](http://192.168.2.100:38444/)**：直接进入数学目录，无需登录、HTTPS 证书或 Mac 本地服务器。用户最新 HTTP 要求覆盖此前证书方案；没有申请证书或修改 Tailscale/DSM/DNS。

运行源码 `974fdee8134c833d718b574d79e18d96756a73e0`，专用内容镜像 `sha256:03fc82b25c501c8e8f71ef92ea66c3e5d14e1f0cc2fee7be8b0c1cb90b60d521`。后续验证工具/文档提交未改变 166 个发布构建输入，NAS 实际 seal 的 11 个静态文件与测试构建一致。

70/70 六步课堂（64 交互 / 6 静态）已在该 NAS 地址通过 30 代表课及全部 210 个浏览器场景，覆盖 390/768/1280 宽度、教具、键盘/触摸、刷新清空及零浏览器持久化。普通 Mac Chrome 已实际进入课堂并操作纸盒从展开到 100% 折合，随后返回目录；实体手机/iPad 待用户体验，不把视口测试称为实体设备验收。

已演练原 38444 合成单课回退并恢复新 HTTP 入口。旧 app、合成卷、证书及原 TLS 容器完整保留；11 个受保护容器的身份/镜像/启动时间/挂载/状态及旧合成文件 hash 均不变。原 38443、8 个生产服务、数学/英语旧项目、真实学习记录和系统权限未变更。

Mac 原交付目录 `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 已加入 `打开NAS学习家园.webloc` 和 `NAS学习家园使用说明.md`，没有新建工作树或复制新的项目目录。

[PR #18](https://github.com/lovestream/kevin-learning-home/pull/18) 保持 Draft，不合并。部署源码的 [push CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40207392981) / [PR CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40207396436) 均成功；本轮最终证据提交的精确 HEAD 双 CI 由 PR 正文单独核实，不沿用旧 SHA。

**70 课教学不等于完整数学网站迁移。** [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 的 849 题及 [Issue #17](https://github.com/lovestream/kevin-learning-home/issues/17) 其它实际可用功能尚未迁入，后续独立 Draft PR 接到同一 NAS 入口。无正式账号、真实记录、成绩持久化、积分或蛋仔迁移。

[R2 执行报告](docs/implementation/MATH-FULL-01-NAS-R2-REPORT.md) · [NAS 原始交付证据](docs/implementation/evidence/math-full-nas-r2/delivery.json) · [路线图](docs/implementation/MATH-FULL-ROADMAP.md) · [交接](docs/handoff/current.md)
