# BENCH-01 交接

草稿 [PR #3](https://github.com/lovestream/kevin-learning-home/pull/3)，分支codex/bench-01-cloudflare，共享基线PR #2；不合并，不进入PR-1B/生产。

[执行报告](../benchmarks/BENCH-01-cloudflare-report.md)、[迁移差距](../benchmarks/BENCH-01-migration-gap.md)、[媒体契约](../benchmarks/BENCH-01-media-object-contract.md)、[本地JSON](../benchmarks/results/cloudflare/local.json)。本地执行SHA `fca88a03d03cbd6773917dc5810b73a26087a58a`，之后加入的容器媒体bind环境选项默认仍为loopback，仅供Node/NAS隔离。

源Math `8e9115442b3978eee0d4821750ce04f47954bd26`、English `d0b42a8872a7e87433b96770519203630223b6f2`；冻结契约/fixture/source hash不变。仅selected核心算法与synthetic业务原型，不是完整课程迁移。source parity、100独立HTTP重复、两设备CAS、SQL回滚、parent-only/跨learner/CSRF/Origin、provider切换、浏览器直传/私有下载、2.1MB保真与空环境DB/媒体恢复、S/M各3轮通过LOCAL。SQLite版本与Worker真实CPU未开放/未测，报告不填猜测值。

本地Wrangler migrate/dev/static assets/typecheck/dry-run成功；所有deploy命令均带--dry-run，没有云资源。远端Worker/D1/R2/Access、R2订阅、Free 10ms/128MB、复制/usage/网络未获授权，BLOCKED_APPROVAL。现有七牛MCP和账户配置不改变。

现代Linux CI已存在通过记录；本分支完成报告提交后复核最新HEAD，并归档精确code SHA/CI URL至报告。等待ChatGPT独立复审。

2026-10-14修复共用UI状态回读竞态，并以120ms状态读取延迟回归。最新完整本地PASS_LOCAL；历史完整CI SHA与失败记录见执行报告。最新HEAD的类型、Wrangler本地迁移/静态、source parity、业务/浏览器/恢复/负载由本PR最新checks验证。所有云端项目仍BLOCKED_APPROVAL。
