# Kevin Learning Home · 项目当前状态

## NAS 已含课本目录、70 课和全量 849 题

**[打开 NAS 学习家园](http://192.168.2.100:38444/)**：HTTP、免登录。上册 9 单元 39 课、下册 8 单元 24 课、7 衔接；每课第六步“自己验证”有五组临时练习，335 解释题待家长核对。刷新清空，不保存成绩或积分。

NAS 源码 `d835f8c7fbd5a341cc30cf44dea5c6dc62f65d12`，镜像 `sha256:15de948d7a34fe00286aee8b59b96bae48b81afce95478a56fb45c3fe30568c1`。精确源码完整 push / PR CI 均成功。实际 NAS 全 849 终答、三视口/84 完整练习流程、30/210 课堂、教材导航与练习版→R3→练习版回退全部通过；11 个受保护容器和旧合成文件 hash 不变。实体手机/iPad及本轮普通用户 Chrome 仍待体验，不能用视口自动化冒充。

[PR #18](https://github.com/lovestream/kevin-learning-home/pull/18) R3 最终归档 `8628f0a` 双 CI 成功，保持 Draft。[PR #21](https://github.com/lovestream/kevin-learning-home/pull/21) 为独立叠加练习 Draft，保持不合并。练习源码 CI 与原始证据见 [练习报告](docs/implementation/MATH-FULL-02-REPORT.md) · [NAS 回执](docs/implementation/evidence/math-full-02/delivery.json) · [交接](docs/handoff/current.md)。最终文档归档 HEAD 双 CI 在 PR 正文逐 SHA 记录，不冒称为部署源码。

按最新用户指令继续 Issue #17，已只读确认 17 已审思维卡、14 匿名模拟侦探、四至六年级各 18 旧版课（54 课/432 题），已在 `codex/math-full-03-capabilities` 完成本地实现，将以独立 Draft PR 接入同一 NAS。43 暂缓卡、168 蓝图和私密案卷不冒充已交付；这些剩余能力当前还未部署，70+849 不等于整站完成。

没有新 worktree/项目副本；原数学/英语、38443、8 个生产服务及真实学习数据不动。不开发真实账号/成绩持久化/积分或蛋仔，不申请证书，不改 Tailscale/DSM/daemon/权限。[统一路线图](docs/implementation/KEVIN-HOME-INTEGRATION-ROADMAP.md)。

Issue #17 本地全量验证通过：17 卡、54 旧课/432 题、14 模拟案例，三视口 255 完整流程；28 方法/6 指南、244 原复习题和 11 原逆向题深链。NAS 当前版本仍为上文 PR21，待源码双 CI 成功后受控更新。[新增执行报告](docs/implementation/MATH-FULL-03-REPORT.md)。
