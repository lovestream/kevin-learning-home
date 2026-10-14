# BENCH-01 执行报告：Wrangler/Miniflare 本地；远端云单列

报告整理：2026-10-14；本地实测时间 `2026-10-14T12:18:33.221Z`，为UI修复后的完整重测。独立草稿 [PR #3](https://github.com/lovestream/kevin-learning-home/pull/3)，共享基线 [PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)。未合并、未生产部署、未读/导入真实记录；旧仓库没有改动。

## 结论与执行边界

本地学习业务、幂等/CAS/事务、网页、媒体权限与空环境恢复通过。它证明本次选定核心算法与实验适配器可运行，尚不构成整站迁移或生产验收。Cloudflare Free 10ms CPU、真实D1复制/计费、R2/S3签名、Access及中国家庭网络仍为 BLOCKED_APPROVAL。没有创建远端资源或订阅。

## 可复现环境与来源

本地代码执行HEAD `fca88a03d03cbd6773917dc5810b73a26087a58a`；该SHA后如有仅清理/文档提交，不将它冒充当时执行SHA。环境 `{"node": "v24.15.0", "os": "darwin", "arch": "arm64", "kernel": "27.0.0", "route": {"simulator": "Miniflare/workerd", "sqliteVersion": "NOT_EXPOSED_D1_SQL_FUNCTION_DENIED", "miniflareVersion": "5.20261006.1-alpha", "workerdVersion": "1.20261006.1", "remote": false, "sessionPolicy": "first-primary", "staticAssets": "local binding mock; Wrangler native asset smoke separately"}}`；CPU `Apple M5`。精确CI SHA/结果见本报告的CI证据索引和[交接](../handoff/BENCH-01.md)。

数学冻结 SHA `8e9115442b3978eee0d4821750ce04f47954bd26`；英语冻结 SHA `d0b42a8872a7e87433b96770519203630223b6f2`。数学18份依赖/数据源码字节锁定；`pilot-core.mjs`只抽取原 `pilot-store.mjs` 的9–28、55–118行，避免未用的fs初始化；英语10个函数保持原文本。文件与函数哈希见[来源锁](../../tests/platform-parity/source-lock.json)。4组source测试通过，覆盖4个数学、4个拼写与3个调度fixture；没有宣称完整旧课程、原英语DOM或家长批阅100%兼容。

共同契约、fixture、schema和源锁的冻结摘要：

```json
{
  "version": "klh-parity-v1",
  "files": {
    "contract-v1.md": "d89c236b4992931040e4e78fcac29e6468eee9986b6418ab86da842794daa277",
    "fixture-v1.json": "68fdc9daf4a856d545999753282bbc4c9b92a0c64ac09bb04cf73b4f4a15ed07",
    "schema-v1.json": "7049df4b1b96efe4f43758550f955154c8e825b9dd0c7c5cded73b9ebd46d6e1",
    "source-lock.json": "942ea8bea691f742e01054bb9f49e4506728b8e6fd8ff444e87069860accf228"
  }
}
```

统一业务源码在 `experiments/shared`；路线适配器/生命周期在 `experiments/cloudflare`；共享可执行脚本在 `tests/platform-parity`；专用workflow `bench-cloudflare.yml`。生成runtime类型不是重写旧算法。详细文件变更以PR diff为准。

## P01–P16 验收

| ID | Mac本地 | 现代Linux CI | 真机/真云 | 证据及边界 |
| --- | --- | --- | --- | --- |
| P01 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 冻结数学四场景＋原首答/提示/订正源码；API验证首答防覆盖 |
| P02 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 原英语 normalization/近似拼写/调度函数黄金样例及适配器比较 |
| P03 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 只有成功写入推进revision和event |
| P04 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 100个独立HTTP重复请求，一条receipt/event |
| P05 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 同ID不同body返回409 IDEMPOTENCY_CONFLICT，无写入 |
| P06 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 两个独立session旧revision竞争恰一成功；另一409 STALE_REVISION |
| P07 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | SQL末尾约束失败，九张业务表完全回滚 |
| P08 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 仅synthetic reward；math/english来源分别去重，无历史钱包迁移 |
| P09 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 角色由持久化opaque session决定；student/跨learner/CSRF/Origin/伪造header反例 |
| P10 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 断网原ID草稿重试；第二浏览器更新时保留冲突草稿；明确操作后创建新命令 |
| P11 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 版本化course/media；本地provider切换course JSON不变；浏览器直传＋私有音频 |
| P12 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 进程重启、物理本地备份、逻辑导出、两个全新环境DB/media逐表逐对象hash |
| P13 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | Chromium 1280×800、768×1024、390×844的数学、英语、刷新、离线操作 |
| P14 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | S/M各三轮、并发2/50/100、200样本/轮；测量边界见下 |
| P15 | PASS_LOCAL（设计演练） | 见 CI 证据索引 | BLOCKED_APPROVAL | 10/100/1000倍增长设计演练；15学科与10TB仅模型 |
| P16 | PASS_LOCAL | 见 CI 证据索引 | BLOCKED_APPROVAL | 本地adapter不可用→HTTP503；中止进程/本地runtime→恢复数据不变；非真实停电 |

P09仅验parent-only拒绝及synthetic账号授权；真正家长批阅接口有意返回501，批阅模型移植未完成。P13为真实Chromium操作和iPad尺寸模拟，**不是物理iPad/Safari实测**。P15是设计演练，8个future subject只用于容量，不是假装已移植10门算法。P16只模拟服务/adapter故障，未关NAS电源或硬盘，未声明生产SLA。

## 性能：相同负载，严格区分CPU和壁钟

S：1 learner、2 subject、100 events、500 media refs。M：3 learner、10 subject、100000 events、100000 refs；所有虚构。每轮从相同seed 20261013和相同规范表摘要重建；先20次读取预热，再200独立HTTP样本，80%状态读、20%不同命令使用同baseline revision；最后只有1个写成功，另外39个409是有意竞争，不是故障。两档各3轮，分别并发2/50/100，**不是每个并发重复三轮**；nearest-rank分位数。本机两路线顺序执行，地理网络均为Mac回环，无公网/R2/NAS latency。

| 档位 | 并发/轮 | p50 ms | p95 ms | p99 ms | HTTP200 / 409 | 后端CPU ms/轮 |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| S | 2 | 1.910 | 3.909 | 5.126 | 161 / 39 | 未测（不可由wall替代） |
| S | 50 | 43.806 | 76.714 | 85.118 | 161 / 39 | 未测（不可由wall替代） |
| S | 100 | 78.248 | 160.364 | 176.190 | 161 / 39 | 未测（不可由wall替代） |
| M | 2 | 1.765 | 3.173 | 4.993 | 161 / 39 | 未测（不可由wall替代） |
| M | 50 | 41.156 | 71.964 | 75.726 | 161 / 39 | 未测（不可由wall替代） |
| M | 100 | 93.378 | 129.379 | 131.727 | 161 / 39 | 未测（不可由wall替代） |

合计1200测量请求/路线，120预热读取，另有attempt/session准备、业务100并发、恢复与浏览器请求。S/M是数据库历史容量压力，历史seed事件不是10万次算法执行。Math和English业务均有正确性测试，但负载样本的写入选English，不能推广到所有数学课程。

- S：1 learner / 2 subject / 100 events / 500 media refs；导入 47.76 ms；存储指标 `{"status": "NOT_EXPOSED_BY_ADAPTER"}`。
- M：3 learner / 10 subject / 100000 events / 100000 media refs；导入 961.85 ms；存储指标 `{"status": "NOT_EXPOSED_BY_ADAPTER"}`。

Node CPU来自**服务子进程** resourceUsage前后差，单位µs转换ms；memory取maxRSS，不是瞬时峰值采样。Node rowsReturned/rowsChanged不是D1扫描计费行数；CF表头D1 rowsRead/rowsWritten来自本地D1返回meta，真实云账单未核验，失败batch内部消耗可能未回传。CF进程RSS含模拟器和负载器，不能作为128MB Worker内存结论；CPU字段留null。磁盘目录总bytes含对象、WAL/空闲页等，不能当DB净容量；Node另取livePageBytes。D1拒绝sqlite_version和PRAGMA容量查询，**没有填猜测值**。完整逐轮统计和浏览器decoded/encoded字节见[脱敏本地JSON](results/cloudflare/local.json)。encoded包含API流量，decoded cold/warm仅静态资源；后者无压缩，本地缓存策略不代表CDN。

## 恢复、媒体和故障证据

超过2MB的合成状态 `2,100,101` bytes切成 `33` 片，完整未知字段与Unicode恢复后deep-equal；每片和整体hash验证，未截断。分片是存储实验，**不是Free 10ms下大状态命令成功证明**。生产仍需缩小在线projection、保留只读原来源档案与分段历史，否则每次整份state重写/哈希会增长。

物理备份方法：local Miniflare filesystem only; not a cloud D1 backup。逻辑备份按主键keyset导出九张表JSONL和对象manifest；导入40条/batch到另一全新空库，逐表count/hash/revision/receipt/两科奖励及对象SHA完全一致。另对物理备份在第二个新目录恢复比较。恢复检查点是业务测试库加2.1MB状态，**不是100000事件的完整恢复演练**；M全量恢复时长尚未实测。备份含可公开合成文件，所有登录session不进入逻辑档案，恢复后重新登录；本地物理快照的会话仅用于restart保留测试。修改备份对象被检测；provider local-a→b课程JSON不变；缺对象请求失败；对象32KiB PNG、1MiB WAV、5MiB二进制＋1MiB浏览器直传，M/L只复制引用，不制造海量文件。

私有对象签名60秒并额外验证synthetic session/learner/Origin，公开对象immutable、私有no-store；直接猜、错learner、盗链拒绝。传输经浏览器→独立本地对象mock，学习API只收intent/commit；hash、大小、mime签名/魔数、上传owner检查。**本地mock不是S3协议或R2 SDK**；裸R2预签URL是bearer能力，不能借本mock的额外cookie检查宣称R2可拒绝持有URL的其他人。

服务/adapter中断后本机观察恢复窗口 157.08 ms，属于实验进程/模拟器启动时间，不含硬件启动/公网/备份人工操作。RPO是最后完整checkpoint；DB故障注入HTTP503、恢复后九表hash不变，未进行真云服务停机。故障之前的离线草稿不能自动覆盖后来server状态，浏览器显式解决才生成新command。

## 已遇到的错误与修复

Miniflare5不能直接接受旧v4 options；改用其导出的转换器。旧d1Persist被转换丢弃导致重启session 401；改用resourcePersistencePath后P12通过。Wrangler outdir按配置目录解析，最初worker.js路径错误；统一为配置下dist。D1 sqlite_version函数被禁止，环境标NOT_EXPOSED并保留错误分类，不冒充Node SQLite版本。工具包装曾使用zsh只读变量status，修正为taskExit；那是本机包装错误，非D1/Worker失败。

浏览器初版复用已有nearMiss attempt导致测试等待超时；补服务端签发的新一轮UI，冻结source/fixture不变。当前冲突UI保留原draft并需用户明确操作；Cookie为HttpOnly/SameSite=Strict，本地HTTP没有Secure；固定synthetic密码和loopback gate仅供本实验，不能上线。

## 下一阶段门槛与停止

远端仍需一次明确的资源/费用/Access范围许可；鉴权就绪、保护workers.dev与预览、最小权限、受控小量请求后测CPU/128MB/D1usage/复制/完整导出与R2权限。现在不部署。

尚缺完整家长批阅、source UI全课程回归、生产账户/密钥/HTTPS、R2或七牛实际适配、M/L全量恢复、磁盘/CPU长期采样、Safari与真实用户公网体验、事件归档和PostgreSQL迁移实测。现阶段仅技术原型；等待ChatGPT独立审查，不进入PR-1B/正式钱包/真实迁移。

## UI回归与CI证据索引

历史完整通过 [38561552190](https://github.com/lovestream/kevin-learning-home/actions/runs/38561552190)，SHA `8469b56e798a85b27a4c5def8b54141dd0887b74`，历史artifact（当前CI JSON见下方修复后索引）。同SHA另一次运行 [38561546007](https://github.com/lovestream/kevin-learning-home/actions/runs/38561546007) 在离线重试网页断言失败，不能用一次通过掩盖不稳定。已修复subject动作并发与旧状态回读竞态：UI等待当前状态完成后才显示同步，保留未确认草稿；共用浏览器回归延迟状态读取120ms，两条路线最新完整本地测试通过。fixture与原算法未改变。修复后最新提交完整CI另见PR checks和交接，不把历史CI视为新HEAD。

修复后完整CI PASS_CI：[38565360572](https://github.com/lovestream/kevin-learning-home/actions/runs/38565360572)，实际执行SHA `f7a9eab0bf751e706fe7898d4cde7b775e3d1793`，[CI JSON](results/cloudflare/ci.json)已替换为本次修复后结果；包括类型、Wrangler本地迁移/静态/dry-run、source parity、业务、延迟状态读浏览器、恢复及S/M负载。历史成功与失败run链接保留。归档提交后的最终HEAD由PR最新checks验证，不以旧执行SHA代替。
