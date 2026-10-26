# Kevin Learning Home · 项目当前状态

## R3 已交付 NAS，继续 849 题与其余数学能力

**[打开 NAS 学习家园](http://192.168.2.100:38444/)**：免登录 HTTP，无需证书或 Mac 本地服务器。数学目录已恢复为上册 9 单元 39 课、下册 8 单元 24 课、7 节基础衔接；包括知识点、搜索、返回单元和册内相邻课。

部署源码 `020ceb9a6792a18e8d020914ec4250b631ef13d0`，镜像 `sha256:942c3001a5f703a38c8d90cd7ca2a21b0360f6b05f7c262d3c11c26641d31690`。精确部署源码的 push / PR 完整 CI 均成功。实际 NAS 三视口导航、30 代表课、全部 210 课堂场景、R3→R2 HTTP→R3 回退均通过；11 个受保护容器及旧合成文件 hash 不变。普通 Mac Chrome 已实际进入课堂并返回原单元；实体手机/iPad 仍待用户体验。

[PR #18](https://github.com/lovestream/kevin-learning-home/pull/18) 保持 Draft，不合并。[R3 报告与 CI](docs/implementation/MATH-FULL-01-NAS-R3-REPORT.md) · [NAS 交付回执](docs/implementation/evidence/math-full-r3/delivery.json) · [交接](docs/handoff/current.md)。后续证据文档提交不冒充 NAS 部署源码；169 个发布输入清单可验证对应关系。

用户最新要求：R3 后直接继续 [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 的 849 道练习，再做 [Issue #17](https://github.com/lovestream/kevin-learning-home/issues/17) 其它实际可用数学能力，分别独立 Draft PR，交付同一 NAS 入口。849 题的本地课堂内流程与纯评分器已实现，正在执行完整回归和准备独立 Draft PR；NAS 仍为 R3，不能把本地实现称为部署交付。见 [练习报告](docs/implementation/MATH-FULL-02-REPORT.md)。

同一工作副本继续使用，没有新增工作树或重复项目目录。原数学、英语、38443 和 8 个生产服务及真实数据不动。无正式账号、成绩持久化、真实积分或蛋仔迁移，不申请证书，不改 Tailscale/DSM/daemon/权限。[统一路线图](docs/implementation/KEVIN-HOME-INTEGRATION-ROADMAP.md)。R2 历史证据见 [R2 报告](docs/implementation/MATH-FULL-01-NAS-R2-REPORT.md)。
