# Kevin Learning Home · 项目当前状态

更新日期：2026-10-23。默认分支状态已随PR7合并修正；历史报告保留原有时点。

| 工作 | 状态 | 证据/入口 |
| --- | --- | --- |
| IMPLEMENT-01底座 | 已合并 | [PR5](https://github.com/lovestream/kevin-learning-home/pull/5) |
| IMPLEMENT-02A身份安全 | 已合并，main CI成功 | [PR6](https://github.com/lovestream/kevin-learning-home/pull/6) |
| IMPLEMENT-02B登录网页/孩子首页/家长导航 | **PR7已合并main**，merge SHA `7790da6c07e118da93d8e3221b20a4fcf78c727f` | [PR7](https://github.com/lovestream/kevin-learning-home/pull/7) · [网页源码](apps/web/src/main.tsx) · [独立R1验收](docs/reviews/KLH-IMPLEMENT-02B-R1-ACCEPTANCE.md) |
| 实际merge提交完整CI | **PASS_CI**，push→main，Node60/UI18/旧3视口/Docker/Compose | [run39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578) |
| NAS局域网隔离合成试运行 | 已授权、已启动；正式Node24/SQLite v2健康，测试TLS入口可达；完整证据持续归档，实体手机/iPad待用户验收 | [Draft PR8](https://github.com/lovestream/kevin-learning-home/pull/8) · [试运行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/IMPLEMENT-02B-NAS-TRIAL.md) |
| 数学复制适配 | 已形成待审方案；未复制完整课程或开放学科 | [冻结/差异/分批PR方案](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/MATH-COPY-ADAPTATION-PLAN.md) |
| 英语接入、真实身份/记录、统一钱包/蛋仔 | 未实施 | [math-learning](https://github.com/lovestream/math-learning) · [word-request](https://github.com/lovestream/word-request)继续独立 |
| NAS生产服务与正式上线 | **NOT_RUN** | 不能以CI或合成试用代替正式验收 |

## 当前访问与边界

用户只要求LAN；外部沿用其已有Tailscale。本轮不配置公网、DSM/反向代理/防火墙/权限或Tailscale。NAS试用使用专用容器、专用空合成目录和7天测试CA，真实凭据/私钥不入GitHub，用户的地址与试用指南通过本地交接提供。既有8个容器的ID/状态/启动时间/重启计数核验不变。Linux4.4低于Node24官方支持内核基线，实际通过也不消除此长期维护风险。

实体手机/iPad/Safari须真实打开和登录后才能PASS；390/768视口截图不能代替。NAS试用保留供用户操作，restart=no；收尾只清理带本次marker/label且ID匹配的资源，不全局prune。PR8与数学方案等待ChatGPT独立审查，未合并。

## 接下来的顺序

1. 完成NAS合成登录/家长权限/刷新/退出的真实前后端证据，记录实体设备反馈；先不迁真实记录。
2. 审查数学源码冻结、复制白名单、身份/存储适配、判题保留和小范围课例方案，再开后续开发PR；英语独立随后。
3. 正式使用前再验收真实家长身份/恢复流程、持续HTTPS（LAN/Tailscale即可）、长期加密异地备份和新卷恢复、运行维护与回滚。

## 维护约定

新代码PR完成后独立审查，获得明确授权才合并并核对实际merge SHA的main CI。每阶段同步默认README/本页/交接；不要只把新状态留在孤立分支。合成试用与生产上线严格按事实记录PASS_CI/PASS_NAS/NEEDS_USER_ACTION/NOT_RUN。后续main若只是文档更新，应用冻结仍为上述7790da6，文档提交也须通过main CI。
