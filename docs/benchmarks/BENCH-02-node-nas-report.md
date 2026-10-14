# BENCH-02 执行报告：Node/SQLite 本地与现代 Linux；NAS 单列

报告整理：2026-10-14；本地实测时间 `2026-10-14T12:34:11.226Z`，不改写成今天重新运行。独立草稿 [PR #4](https://github.com/lovestream/kevin-learning-home/pull/4)，共享基线 [PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)。未合并、未生产部署、未读/导入真实记录；旧仓库没有改动。

## 结论与执行边界

本地学习业务、幂等/CAS/事务、网页、媒体权限与空环境恢复通过。它证明本次选定核心算法与实验适配器可运行，尚不构成整站迁移或生产验收。现代Linux CI及容器持久化通过；2026-10-14 DS918+隔离业务真机通过，独立SSH/Docker核验后标 PASS_NAS。原普通用户Docker权限仍拒绝；用户仅授权本次Docker操作的sudo，没有修改系统权限。内核4.4低于Node24官方支持基线，标 RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL，不能据此承诺生产稳定性。

## 可复现环境与来源

本地代码执行HEAD `50c5100c2d4680106557d6e9c8482e1aaeeccf25`；该SHA后如有仅清理/文档提交，不将它冒充当时执行SHA。环境 `{"node": "v24.15.0", "os": "darwin", "arch": "arm64", "kernel": "27.0.0", "route": {"sqliteVersion": "3.51.3", "pragmas": {"journal_mode": "wal", "synchronous": 2, "foreign_keys": 1, "busy_timeout": 3000}}}`；CPU `Apple M5`。精确CI SHA/结果见本报告的CI证据索引和[交接](../handoff/BENCH-02.md)。

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

统一业务源码在 `experiments/shared`；路线适配器/生命周期在 `experiments/node`；共享可执行脚本在 `tests/platform-parity`；专用workflow `bench-node.yml`。生成runtime类型不是重写旧算法。详细文件变更以PR diff为准。

## P01–P16 验收

| ID | Mac本地 | 现代Linux CI | 真机/真云 | 证据及边界 |
| --- | --- | --- | --- | --- |
| P01 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 冻结数学四场景＋原首答/提示/订正源码；API验证首答防覆盖 |
| P02 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 原英语 normalization/近似拼写/调度函数黄金样例及适配器比较 |
| P03 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 只有成功写入推进revision和event |
| P04 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 100个独立HTTP重复请求，一条receipt/event |
| P05 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 同ID不同body返回409 IDEMPOTENCY_CONFLICT，无写入 |
| P06 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 两个独立session旧revision竞争恰一成功；另一409 STALE_REVISION |
| P07 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | SQL末尾约束失败，九张业务表完全回滚 |
| P08 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 仅synthetic reward；math/english来源分别去重，无历史钱包迁移 |
| P09 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 角色由持久化opaque session决定；student/跨learner/CSRF/Origin/伪造header反例 |
| P10 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 断网原ID草稿重试；第二浏览器更新时保留冲突草稿；明确操作后创建新命令 |
| P11 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 版本化course/media；本地provider切换course JSON不变；浏览器直传＋私有音频 |
| P12 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 进程重启、物理本地备份、逻辑导出、两个全新环境DB/media逐表逐对象hash |
| P13 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | Chromium 1280×800、768×1024、390×844的数学、英语、刷新、离线操作 |
| P14 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | S/M各三轮、并发2/50/100、200样本/轮；测量边界见下 |
| P15 | PASS_LOCAL（设计演练） | 见 CI 证据索引 | PASS_LOCAL（共享设计模型） | 10/100/1000倍增长设计演练；15学科与10TB仅模型 |
| P16 | PASS_LOCAL | 见 CI 证据索引 | PASS_NAS | 本地adapter不可用→HTTP503；中止进程/本地runtime→恢复数据不变；非真实停电 |

P09仅验parent-only拒绝及synthetic账号授权；真正家长批阅接口有意返回501，批阅模型移植未完成。P13为真实Chromium操作和iPad尺寸模拟，**不是物理iPad/Safari实测**。P15是设计演练，8个future subject只用于容量，不是假装已移植10门算法。P16只模拟服务/adapter故障，未关NAS电源或硬盘，未声明生产SLA。

## 性能：相同负载，严格区分CPU和壁钟

S：1 learner、2 subject、100 events、500 media refs。M：3 learner、10 subject、100000 events、100000 refs；所有虚构。每轮从相同seed 20261013和相同规范表摘要重建；先20次读取预热，再200独立HTTP样本，80%状态读、20%不同命令使用同baseline revision；最后只有1个写成功，另外39个409是有意竞争，不是故障。两档各3轮，分别并发2/50/100，**不是每个并发重复三轮**；nearest-rank分位数。本机两路线顺序执行，地理网络均为Mac回环，无公网/R2/NAS latency。

| 档位 | 并发/轮 | p50 ms | p95 ms | p99 ms | HTTP200 / 409 | 后端CPU ms/轮 |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| S | 2 | 0.585 | 1.094 | 1.712 | 161 / 39 | 90.824 |
| S | 50 | 8.042 | 37.058 | 43.195 | 161 / 39 | 64.445 |
| S | 100 | 8.199 | 34.581 | 35.140 | 161 / 39 | 54.970 |
| M | 2 | 0.386 | 0.753 | 1.012 | 161 / 39 | 57.932 |
| M | 50 | 8.294 | 16.857 | 20.166 | 161 / 39 | 51.211 |
| M | 100 | 8.244 | 27.570 | 28.420 | 161 / 39 | 42.110 |

合计1200测量请求/路线，120预热读取，另有attempt/session准备、业务100并发、恢复与浏览器请求。S/M是数据库历史容量压力，历史seed事件不是10万次算法执行。Math和English业务均有正确性测试，但负载样本的写入选English，不能推广到所有数学课程。

- S：1 learner / 2 subject / 100 events / 500 media refs；导入 3.24 ms；存储指标 `{"allocatedBytes": 2281472, "livePageBytes": 196608, "freePages": 509, "pageSize": 4096}`。
- M：3 learner / 10 subject / 100000 events / 100000 media refs；导入 822.29 ms；存储指标 `{"allocatedBytes": 92913664, "livePageBytes": 92913664, "freePages": 0, "pageSize": 4096}`。

Node CPU来自**服务子进程** resourceUsage前后差，单位µs转换ms；memory取maxRSS，不是瞬时峰值采样。Node rowsReturned/rowsChanged不是D1扫描计费行数；CF表头D1 rowsRead/rowsWritten来自本地D1返回meta，真实云账单未核验，失败batch内部消耗可能未回传。CF进程RSS含模拟器和负载器，不能作为128MB Worker内存结论；CPU字段留null。磁盘目录总bytes含对象、WAL/空闲页等，不能当DB净容量；Node另取livePageBytes。D1拒绝sqlite_version和PRAGMA容量查询，**没有填猜测值**。完整逐轮统计和浏览器decoded/encoded字节见[脱敏本地JSON](results/node/local.json)。encoded包含API流量，decoded cold/warm仅静态资源；后者无压缩，本地缓存策略不代表CDN。

## 恢复、媒体和故障证据

超过2MB的合成状态 `2,100,101` bytes切成 `33` 片，完整未知字段与Unicode恢复后deep-equal；每片和整体hash验证，未截断。分片是存储实验，**不是Free 10ms下大状态命令成功证明**。生产仍需缩小在线projection、保留只读原来源档案与分段历史，否则每次整份state重写/哈希会增长。

物理备份方法：SQLite VACUUM INTO。逻辑备份按主键keyset导出九张表JSONL和对象manifest；导入40条/batch到另一全新空库，逐表count/hash/revision/receipt/两科奖励及对象SHA完全一致。另对物理备份在第二个新目录恢复比较。恢复检查点是业务测试库加2.1MB状态，**不是100000事件的完整恢复演练**；M全量恢复时长尚未实测。备份含可公开合成文件，所有登录session不进入逻辑档案，恢复后重新登录；本地物理快照的会话仅用于restart保留测试。修改备份对象被检测；provider local-a→b课程JSON不变；缺对象请求失败；对象32KiB PNG、1MiB WAV、5MiB二进制＋1MiB浏览器直传，M/L只复制引用，不制造海量文件。

私有对象签名60秒并额外验证synthetic session/learner/Origin，公开对象immutable、私有no-store；直接猜、错learner、盗链拒绝。传输经浏览器→独立本地对象mock，学习API只收intent/commit；hash、大小、mime签名/魔数、上传owner检查。**本地mock不是S3协议或R2 SDK**；裸R2预签URL是bearer能力，不能借本mock的额外cookie检查宣称R2可拒绝持有URL的其他人。

服务/adapter中断后本机观察恢复窗口 82.69 ms，属于实验进程/模拟器启动时间，不含硬件启动/公网/备份人工操作。RPO是最后完整checkpoint；DB故障注入HTTP503、恢复后九表hash不变，未进行真云服务停机。故障之前的离线草稿不能自动覆盖后来server状态，浏览器显式解决才生成新command。

## 已遇到的错误与修复

初次现代Linux CI在M负载出现UND_ERR_SOCKET/fetch failed；业务、浏览器与恢复已通过。容量导出改主键keyset并主动yield I/O，后续CI通过。没有简单降低100并发/删除断言；失败run 38346632312、38346688719保留。NAS初次shell PATH没找到Docker；复用已审查的绝对路径定位后Docker Client存在，Server为权限阻塞，不是Docker缺失或Node实测失败。

浏览器初版复用已有nearMiss attempt导致测试等待超时；补服务端签发的新一轮UI，冻结source/fixture不变。当前冲突UI保留原draft并需用户明确操作；Cookie为HttpOnly/SameSite=Strict，本地HTTP没有Secure；固定synthetic密码和loopback gate仅供本实验，不能上线。

## 下一阶段门槛与停止

NAS本次实验已获授权并执行成功；CPU0绑定及512MiB实际生效，PIDs限制被内核丢弃。Docker权限/现有服务保持原状。生产候选仍需比较现代Linux小主机运行、NAS备份；不能用一次通过抵消老内核与长期维护风险。

尚缺完整家长批阅、source UI全课程回归、生产账户/密钥/HTTPS、R2或七牛实际适配、M/L全量恢复、磁盘/CPU长期采样、Safari与真实用户公网体验、事件归档和PostgreSQL迁移实测。现阶段仅技术原型；等待ChatGPT独立审查，不进入PR-1B/正式钱包/真实迁移。

## NAS真机、最新回归与CI证据索引

真机实际开始 `2026-10-14T12:19:36.403Z`；Node24.15.0/SQLite3.51.3/WAL/FULL/FK/busy_timeout3000。DSM7.1-42962 Update6，Docker20.10.3，本地ext4。源校验4组退出0，容器退出0。见 [原始JSON](results/node/nas-raw.json)、[独立核验与验收](results/node/nas-verification.json)、[浏览器](results/node/nas-browser.json)、[镜像来源](results/node/nas-image-provenance.json)。raw中的PASS_LOCAL/nas NOT_RUN是共用函数的静态标签，未改写原件；独立核验文件按实机执行地点标PASS_NAS。P15仅共享设计模型，不属于真机容量实测。

NAS后端源码SHA `c96e38ec0c30f282a16d91bb09c598d74314e6a7`；首次浏览器测试之前，只更新已修复的静态app.js，没有更改运行中的后端算法。UI修复提交 `a253310c6b0442850c1ded6e15f70d14863005b7`、实际文件SHA及时间点见 [前端来源](results/node/nas-frontend-provenance.json)。浏览器驱动包含状态读延迟120ms回归；不能将后端和前端冒称单一HEAD。两条路线最新完整本地回归通过，原fixture/source锁不变。

| NAS档位 | 并发 | p50 ms | p95 ms | p99 ms | 服务CPU ms/轮 | maxRSS KiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| S | 2 | 15.44 | 22.27 | 29.25 | 962 | 73040 |
| S | 50 | 303.61 | 654.28 | 707.58 | 800 | 79996 |
| S | 100 | 455.26 | 1113.23 | 1114.77 | 689 | 80980 |
| M | 2 | 11.39 | 16.71 | 25.92 | 708 | 82500 |
| M | 50 | 279.61 | 595.35 | 649.59 | 674 | 84244 |
| M | 100 | 417.89 | 1031.50 | 1033.87 | 614 | 84244 |

每轮161个200/39个预期409、零非预期错误。NAS负载HTTP在容器内部回环，浏览器才经SSH转发；与Mac CF模拟器硬件/网络不同，不用于绝对速度排名。M导入 5936.23 ms；数据目录 266,754,271 bytes，连同87,500,741-byte镜像归档仍小于约1GB授权。恢复含2,100,101-byte状态33片、九表/对象hash、逻辑及VACUUM INTO新环境恢复；中断恢复窗口 338.27 ms。M十万事件全量灾难恢复及NAS容器删除重建未测试；后者仅现代Linux CI已通过。

失败保留：NAS Docker Hub registry EOF；离线官方amd64归档校验后加载成功。`--cpus 1`因NanoCPUs/CFS不支持失败，在不改内核/权限的条件下改为单逻辑CPU `--cpuset-cpus 0`，容器内核验实际0。内核警告PIDs 128被丢弃，明确未生效。测试结束sudo过期，日志读取与自动清理无法完成，等待用户终端重新认证完成检查/清理；不将缺失的OOM状态猜为false。没有特权容器、放开seccomp、修改Docker组/socket、DSM或Tailscale。

现代Linux历史完整CI：[38559771381](https://github.com/lovestream/kevin-learning-home/actions/runs/38559771381)，SHA `276526a212d10e5c9693c4dbc2378e025104640d`，[业务JSON](results/node/ci.json)、[容器JSON](results/node/container-ci.json)；kernel6.8.0-1064-azure、Docker28.0.4。最新UI修复后HEAD另由PR检查验证，不把历史CI说成新HEAD实测。
