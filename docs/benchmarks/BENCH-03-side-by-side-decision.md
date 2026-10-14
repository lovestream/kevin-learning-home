# BENCH-03 横向决策报告（待ChatGPT独立审查）

整理日2026-10-14；本地实验实际发生在2026-10-13，NAS新只读检查与授权发生在14日。两条路线都已通过选定学科核心逻辑的本地业务、浏览器、恢复和三轮S/M负载。**当前不能宣布Cloudflare Free生产通过，也不能把Linux CI当DS918+兼容结果。** 远端Cloudflare尚未获授权；NAS已获本次业务容器和Docker专用sudo授权，交互Docker Server20.10.3读取成功，但启动脚本在镜像/容器准备阶段报错，原因等待核实。

## 审查入口

- [共享契约 PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)：固定原算法/fixture/schema、共享测试工具及本报告。
- [Cloudflare PR #3](https://github.com/lovestream/kevin-learning-home/pull/3)：Cloudflare adapter、Wrangler本地、结果与迁移/媒体差距。
- [Node/NAS PR #4](https://github.com/lovestream/kevin-learning-home/pull/4)：SQLite事务、Linux容器、NAS隔离材料、结果与运维成本。

两路线均基于共享契约，相互不包含对方adapter；没有合并PR、升级DSM、生产域名、真实记录、历史钱包兑换或中央币池。未接受的架构RFC只作为约束参考。

## 结果与边界

| 维度 | Cloudflare Workers/D1 | Node/SQLite现代Linux | DS918+现状 |
| --- | --- | --- | --- |
| 算法复用 | 同18份Math依赖/原core spans＋10个English纯函数；4组黄金测试 | 同源码和期望，非另一套演示算法 | source parity尚未在NAS运行 |
| 写一致性 | 条件SQL CHECK＋atomic batch；100重复、CAS409、末尾SQL失败回滚通过LOCAL/已有CI | BEGIN IMMEDIATE/WAL/FULL/FK；相同用例LOCAL/CI通过 | 尚无业务结果 |
| 网页 | 数学/英语可操作、刷新、离线原ID、双浏览器冲突、desktop/iPad尺寸、直传/私有下载 | 同一份UI；相同浏览器用例 | 尚未通过SSH桥运行 |
| 存储与恢复 | 本地D1逻辑空库恢复＋模拟器物理快照；2.1MB/33片保真 | VACUUM INTO＋逻辑空库与媒体hash；删除重建Linux容器持久化 | 仅确认可写本地ext4，不是runtime通过 |
| 资源与性能 | D1本地meta和HTTP延迟已测；云CPU/128MB/账单未测 | 服务进程CPU/maxRSS、SQLite容量已测 | 尚未测；J3455/7.43GiB/4.4.180+只读已核实 |
| 维护 | 平台维护机器，仍需账号/依赖/权限/备份与收费控制 | 用户维护OS、容器、磁盘/网络/备份 | 旧内核支持与长期设备故障风险另计 |
| 可移植性 | SQL仍有SQLite语法；D1 binding与云读取策略需要适配 | 本地文件/VACUUM较直接；搬到其他现代主机方便 | 不以换镜像/放开权限绕过官方基线 |

源数学至少一项真实判分/首答与原英语拼写/日程已复用；完整题型、家长批阅、原WordQuest DOM、生产身份与实际历史迁移均未完成。Parent review为501，P09通过只证明权限反例。10门subject中的8门是容量占位，不代表10門课程已经迁移。iPad是Chromium viewport，不是物理Safari。

## 公平性与本地性能

同seed 20261013、相同S/M业务表规范hash：[基准逐表比较](results/shared/baseline-parity.json)全一致。S100事件/500 refs，M100000事件/100000 refs；每档3轮（并发2/50/100，各一轮）、20读取预热、200样本/轮，80%读、20%竞写同revision。每轮161个200和39个预期STALE_REVISION 409，没有运输/非预期HTTP失败。随机session/attempt ID不做跨路线相等断言；重复请求的receipt/result仍逐请求检查。

| 档位/并发 | Node p95 / p99 ms | CF模拟器 p95 / p99 ms |
| --- | ---: | ---: |
| S/2 | 0.56 / 0.74 | 1.95 / 2.91 |
| S/50 | 14.12 / 19.12 | 41.67 / 44.83 |
| S/100 | 15.82 / 16.18 | 74.35 / 74.80 |
| M/2 | 0.40 / 0.52 | 1.42 / 2.10 |
| M/50 | 8.11 / 8.22 | 34.60 / 40.10 |
| M/100 | 15.31 / 15.88 | 67.97 / 74.37 |

这些是Mac回环**HTTP壁钟**，不是真实用户网络、CPU时间或免费配额判定。CF模拟器多进程/IPC结构与Node子进程不同，所以不能直接把上述倍率外推到Cloudflare云端/NAS。Node真实服务CPU每轮约23–49ms/200请求；CF Worker CPU未测，不能以localhost请求wall>10ms判需Paid。两个分支的Linux CI独立runner硬件可能不同，必须各列环境，不能平均成一个排名。

动态写样本仅English且主要故意冲突；Math正确性有独立场景但尚无同强度Math性能负载。真实大state/free CPU、M全量灾难恢复、长时间锁/GC/磁盘I/O采样、家庭公网/iPad点击体验均留待下一轮。cold/warm decoded资源与CDP encoded（含API）都存JSON，不能把body bytes说成压缩线速。

## Cloudflare长期成本：低流量不等于大容量永久免费

以2026-10-14复核的官方文档计算。Free Worker动态请求100000/日、CPU10ms、128MB；D1 Free单库500MB/50查询每请求、每日5m读/100k写，超额会拒绝请求。[Workers限制](https://developers.cloudflare.com/workers/platform/limits/)、[D1限制](https://developers.cloudflare.com/d1/platform/limits/)、[D1定价](https://developers.cloudflare.com/d1/platform/pricing/)。现有七牛MCP Worker共享账号动态额度；当前账号剩余额度/套餐、Access和R2订阅未读取，不能宣称新站额度全部独占。

静态app shell请求可免费，文件数/大小仍有限；媒体应在对象层，不能把10TB塞进Static Assets。[静态资源计费](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)。Workers Paid当前起步USD5/月，还需看CPU/请求usage；没有开通。[Workers定价](https://developers.cloudflare.com/workers/platform/pricing/)。

R2 Standard包含10GB/月、1m Class A/10m Class B，超出存储USD0.015/GB-month；A/B超额USD4.50/0.36每百万，外传按官方为免费。账户总用量与取整规则计费，备份也占容量；开通R2仍须checkout/订阅及用户授权。[R2定价](https://developers.cloudflare.com/r2/pricing/)、[开通说明](https://developers.cloudflare.com/r2/get-started/)。

| 十进制在线素材GB | 1份R2 USD/月 / 年 | 2份R2 USD/月 / 年 | 静态满容量10年2份USD |
| ---: | ---: | ---: | ---: |
| 10 | 0.00 / 0.00 | 0.15 / 1.80 | 18.00 |
| 100 | 1.35 / 16.20 | 2.85 / 34.20 | 342.00 |
| 1000 | 14.85 / 178.20 | 29.85 / 358.20 | 3582.00 |
| 10000 | 149.85 / 1798.20 | 299.85 / 3598.20 | 35982.00 |

表只算对象存储，假定同账号10GB free共享一次；**不含**动态Worker、D1超额、A/B请求、域名、Access、AI/TTS、其他供应商备份、税费和人工维护。2份同供应商副本不是完整异地独立故障域。自用S约1000动态请求/日、M约10000/日只是可调场景，未测云CPU所以“可能Free”仍有条件。若已经Paid，新站边际基础订阅可能为0，但账号计划未知。

对象计费操作模型：写入/列举/备份/multipart为A，读取按实际对象取回B；每月A10000/B100000且无别的用量时在包含量内；A2m/B20m时按当期超出部分约USD4.50+3.60，实际取整、cache与备份操作需remote usage核实。私有网关会增加Worker动态请求，而公开CDN缓存可减少对象读取。

10TB如果逐年从100GB线性增长，十年费用应积分容量曲线，不能把末年10TB乘十年当实际预算；表中十年满容量只是敏感性上界场景。价格/支持/汇率不承诺十年不变，建议每半年更新预算。

## 数据十年增长与路线退出

Node M实测live SQLite pages约92.9MB/100000合成事件＋相等数量媒体refs，规范JSON约91.3MB。按同宽线性外推：100万约0.929GB、千万约9.29GB；是**模型**，不含更丰富真实事件、更多索引/副本/快照、最终15科差异与长期碎片。单库Free500MB早于百万量级用完，Paid10GB在千万模型时已经几乎没有余量，不能承诺一个D1库十年无限。D1本地不开放page统计，不能拿Node页数说成云端实际占用。

设计演练：以S500 refs，10/100/1000倍为5000/50000/500000 refs；课程通过assetId/version加载，app shell仍3静态文件，不随素材数量打包。M实际100000 refs在中间档位，L100万–千万事件/10TB没有实际创建。平均10MB素材的100GB/1TB/10TB约1万/10万/100万对象，仅模型。

共同建议：原来源档案与未知字段保真保存；有界在线projection＋不可变事件＋版本checkpoint＋冷归档；DB、媒体、计算各自扩容。350–400MB设计预警先于D1 Free硬限制；增大Paid单库仍有10GB边界。按learner稳定分片需要全局路由、receipt作用域与停写迁移；PostgreSQL需要明确SQL/schema适配和恢复演练，不是更换driver即成功。已有JSONL/manifest工具证明同架构恢复，不证明跨PostgreSQL或真跨云搬迁。

Node24支持计划目前止于2028-04-30，NAS旧kernel是否偶然可运行与受支持生产平台不同。[Node支持平台](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md)、[发布计划](https://github.com/nodejs/Release/blob/main/schedule.json)。十年以上可维护性依赖持续升级、兼容fixture、可验证备份和明确退出路线，不能靠固定一次镜像。

## 暂定判断，不作为正式ADR

若优先少维护、自用少流量且素材少：Cloudflare值得先做受许可的真云小量验证，但生产身份、10ms CPU、D1usage/复制、真实对象权限与家庭网络尚未通过，所以现在不能承诺Free或稳定性。若优先Node代码/事务/完整fs服务复用：现代Linux主机＋NAS备份更自然，增加设备和维护成本。[Node预算模型](https://github.com/lovestream/kevin-learning-home/blob/codex/bench-02-node-nas/docs/benchmarks/BENCH-02-hardware-cost-model.md)把沉没成本、更新、盘/UPS、电费和人工分开。

DS918+直接做Node24主在线计算仍需本次真机结果，并保留unsupported kernel风险；已有权限问题不能被说成Node已经运行失败。费用也不能只凭访问量少比较：10TB R2两份副本按现价约USD3598/年，与小家庭几GB相差很大；NAS大盘/冗余/异地备份和故障同样有成本。

## 停止线

待NAS当前镜像/启动错误核实并记录、最新CI证据归档后，停在三个草稿PR，交ChatGPT独立审查。不合并、不进入正式开发/PR-1B、不接真实记录或历史钱包、不创建Cloudflare远端Worker/D1/R2/Access、不开订阅。
