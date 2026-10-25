# Kevin Learning Home · 项目当前状态

## 最新执行：PR #14 R1 可用性交付（2026-10-25）

已确认原隐藏指南就在用户当前 Mac，安全交付至 **`~/Documents/Kevin-Learning-Home-Trial/`**（0700）：私密 `START-HERE.md`、公开 CA（均 0600）、可双击启动器与目录整理清单。已在 Finder 确认可见，实际本机 headed Chromium 用新合成孩子登录 **38444**，首页数学「只读课堂」、英语「待迁入」，进入六步首课；关闭最后标签后可重新打开，重复启动不会堆新 profile。旧 **38443** 仍是 02B 两科「待迁入」，不要混用入口/账号。

唯一活动工作副本为 `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial`，原新秘密源保留在其 `.trial-private`。已盘点 11 份相关目录（1 主仓库 + 10 worktree），只有 1 math-trial；3 份保留、2 份待用户确认的清理候选、6 份先归档/确认，**没有删除或移动目录**。[整理清单](docs/implementation/MATH-NAS-01-R1-DIRECTORIES.md)与[R1 报告](docs/implementation/MATH-NAS-01-R1-DELIVERY.md)归档完整元数据、截图、真实 Mac 访问和测试证据。

本地完整正式回归以及 15 Python、8 工具 Node 通过。最终 HEAD 的 push 与 pull_request 完整 CI 精确链接以 [Draft PR #14 正文](https://github.com/lovestream/kevin-learning-home/pull/14)为准。用户本人体验仍待反馈，普通 Safari/实体手机/iPad 为 `NEEDS_USER_ACTION/NOT_RUN`；测试 CA 2026-10-31 13:58:29 UTC 到期，仅专属 Chromium 内信任，不改全局信任或 Tailscale。R1 没有 NAS 部署/容器配置写入、旧站/真实数据操作。保持 Draft，不合并，不进入 MATH-02。

## MATH-NAS-01 技术验收归档（2026-10-24）

数学首课现已在新的合成账户隔离入口 `https://192.168.2.100:38444/` 运行，**数学：只读课堂；英语：待迁入**。旧 `38443` 继续运行原 02B，两套账户、数据库、证书、容器和网络独立。正式运行源固定已通过 main CI 的 `e594b3e6db0563f6a6b56bc2b0724f1bcd8c961e`，不是从工具分支漂移的 latest 构建。

[Issue #13](https://github.com/lovestream/kevin-learning-home/issues/13) 的真实 NAS 浏览器全量 **4/4 通过**：390/768/1280 的孩子六步课堂、家长 12 秒两轮权限复核、撤销后 403/隐私遮蔽；11 学习表 count/hash 不变，原 8 服务及旧 02B 两容器/旧证书/匿名站点不变。新 app healthy，严格 TLS 仅信任独立测试浏览器 profile 的新 CA，不改系统全局信任。完整证据与失败修正在 [执行报告](docs/implementation/MATH-01-NAS-TRIAL-REPORT.md)，交付 [Draft PR #14](https://github.com/lovestream/kevin-learning-home/pull/14) 等待独立审查。最终 HEAD 与两套 CI 链接以该 PR 正文核验记录为准，不复用早期成功。

**这仍是合成账户试用，不是生产上线。** 实体手机/iPad 的数学触控与课堂体验 `NEEDS_USER_ACTION`；不支持浏览器内独立 CA 的设备存在证书关口，不跳过警告、不全局安装信任。旧账号登录也留给用户手工确认，未读取旧口令/Cookie/DB。R1 已将新账号指南和启动器交付到上方固定 Documents 目录；隐藏原秘密源继续保留，密码不放 GitHub。未修改旧数学/英语项目，未导入真实学习数据，MATH-02 未开始。

更新：2026-10-24。MATH-01 已合并至 main；新 NAS 数学隔离试用已完成技术验收，旧 NAS 02B 继续保留。历史报告按归档时点解释。

| 阶段 | 当前事实 | 证据 |
| --- | --- | --- |
| 基础外壳/认证 IMPLEMENT-01/02A/02B | PR5/6/7已合并；既有NAS隔离试用应用仍是02B镜像 `7790da6` | [PR7](https://github.com/lovestream/kevin-learning-home/pull/7) |
| NAS隔离试用 | PR8已合并；用户手机/iPad实测访问/登录成功，不包含数学课程 | [PR8](https://github.com/lovestream/kevin-learning-home/pull/8) |
| MATH-00数学来源审计 | PR10已合并；133来源/273依赖与首课来源候选 | [PR10](https://github.com/lovestream/kevin-learning-home/pull/10) |
| MATH-01首课可视化只读 | **[PR12](https://github.com/lovestream/kevin-learning-home/pull/12)已审查合并**，merge `f62a485492f79afe7832e8ec7021bfbfb62e214a`；G3-U01-B01单课、六步只读、默认flag关闭；无阅读记录/练习/奖励写入 | [ChatGPT审查评论](https://github.com/lovestream/kevin-learning-home/pull/12#issuecomment-6383023852)、[实施报告](docs/implementation/MATH-01-EXECUTION-REPORT.md) |
| MATH-NAS-01数学隔离试用 | 新 38444 合成实例运行；真实 LAN 全量 4/4、11表不变、旧10容器/证书不变；实体手机/iPad待用户反馈 | [Draft PR14](https://github.com/lovestream/kevin-learning-home/pull/14)、[报告](docs/implementation/MATH-01-NAS-TRIAL-REPORT.md) |
| MATH-02阅读记录持久化 | **未开始；需另设独立授权、任务书、Draft PR和审查** | [分阶段规划](docs/implementation/MATH-COPY-ADAPTATION-PLAN.md) |
| 英语/钱包/蛋仔/70课扩大覆盖 | 未实施，旧网站继续独立使用 | [交接](docs/handoff/current.md) |
| NAS生产部署及真实Kevin数据迁移 | **未批准、未执行**；新38444仅合成隔离试用，手机/iPad数学验收NEEDS_USER_ACTION | [试用报告](docs/implementation/MATH-01-NAS-TRIAL-REPORT.md) |

MATH-01最终审查SHA `824907055badc8484d9be2d480730fc1516013a8`；[push CI40075159711](https://github.com/lovestream/kevin-learning-home/actions/runs/40075159711)与[PR CI40075162094](https://github.com/lovestream/kevin-learning-home/actions/runs/40075162094)均success：原60 Node/18 UI/三视口，新增12数学Node/9浏览器，Docker/Compose/重启与恢复保留。旧学习表11项未变化（会话与认证审计必要写入另计）。合并后的main独立CI不使用PR成功冒充，结果见Actions。

严格限制：旧38443保留02B，新38444仅数学只读合成试用，两者均 restart=no；短期CA到期为2026-10-31，原8容器、旧站和真实记录不动。不得自动扩大课程、重建/清理旧资源、改DSM/Tailscale/权限/凭据或迁移历史。手机/iPad数学体验、长期受信TLS、异地加密备份/新卷恢复、Linux4.4/Node24维护兼容仍为正式上线前关口。当前仅等待本轮独立复审和用户实机反馈，不开始 MATH-02。
