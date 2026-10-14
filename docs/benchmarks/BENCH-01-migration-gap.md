# BENCH-01 迁移差距与工作量

本文件是待审查估算，非已批准架构或正式开发计划。依据共享source-lock与本地业务证据，不能把18个数学依赖文件的复用量写成“整站100%兼容”。两条路线都复用相同的学科算法；Cloudflare 的主要额外改造是运行时、身份、持久化和媒体接口。

| 部分 | 已复用/已测 | 正式迁移缺口 | 估算工作量与风险 |
| --- | --- | --- | --- |
| Math | 原判分、selfCheckTask/revealHelp/submitTask、首答/订正/帮助规则；18依赖源码字节保真 | 完整session模型、所有题型、家长批阅、宠物/商城、原路由和异常兼容；本PoC只用合成warmup选择题 | 5–10人日提取/接口，另5–10人日全课程回归；来源状态隐式依赖风险高 |
| English | 原10个纯函数：拼写归一化/变体/近似判断、练习判分、复习日程 | 原DOM状态机、全部课程/信任标识、离线旧schema转换、音频和review UI；新增attempt plumbing不是旧handler的全文复用 | 4–8人日接口，另4–8人日UI/历史兼容；日期/时区/首次完成语义需专门回归 |
| 事务 | 两侧同一SQL约束/receipt/CAS；D1用受控batch，真实SQL失败全回滚已本地验证 | 不能移植node:sqlite的BEGIN IMMEDIATE+JS回调；生产迁移/维护任务、错误重试、真实复制读取要重新设计 | 3–6人日；关键风险为并发、分片时的唯一性与过时读取 |
| 身份 | synthetic session、CSRF、Origin、server role/learner、反例通过 | 生产家长/孩子账号、HTTPS/Secure cookie、撤销/审计、Access身份验签或ctx.access映射、恢复/批阅操作审计 | 3–6人日；测试固定密码绝不能部署公网 |
| 媒体 | 独立assetId/version、dynamic manifest、本地双provider、直传和恢复 | 真R2/S3/七牛adapter、私有访问网关、多段上传/重试、备份保留与对象生命周期 | 4–8人日；mock不是S3协议，R2裸预签URL的bearer语义需单独评审 |
| 部署/观测 | 本地Wrangler迁移/资产、typecheck、Linux CI，无远端资源 | 小量真云CPU/usage/复制/Access测试、家庭网络/iPad、报警、备份异地恢复 | 3–6人日；用户许可和实际账户计划未核验，可能额外等待 |

人日为单人熟悉代码时的参数化估算，部分可重叠，**不是报价/排期承诺**；没有真实数据迁移时长估算。Node也需要身份/完整课程/媒体改造，但可保留fs/现有Node服务部署习惯；Cloudflare不能靠nodejs_compat获得持久磁盘或node:sqlite。

## 在线状态与十年规模

本地2.1MB状态分成33片并保留未知字段，证明存储格式不会因D1单行2MB限制而截断。当前command仍读取、解析、复制和重写整个subject state，历史attempt无限积累时CPU/查询数/内存都会增长；50条batch保护会返回413，而不是继续无界写入。生产应定义有界在线projection、不可变事件与冷历史、版本化checkpoint、原来源只读档案，逐学科保留原意。不能把未来十年JSON持续拼到一个payload中。

Free DB 500MB和Paid单DB 10GB都是硬边界；需要用真实行宽、索引和保留策略预估。[D1限制](https://developers.cloudflare.com/d1/platform/limits/)说明横向扩成多个小库的方向，但跨库事务、receipt唯一性和路由迁移并非自动解决。本次仅单库实验，未测跨库CAS。

建议350MB起预警、400MB前完成清理/迁移演练（设计阈值，不是平台配置）；若数据超单库预算，可按稳定learner分片，保留不可变路由表/命令作用域，迁移时短暂停写、导出、hash比较、再切换。更复杂的跨learner事务或分析可转PostgreSQL；本PoC的SQL包含SQLite特定语法，**不能只换driver就宣称兼容PostgreSQL**。逻辑JSONL/媒体manifest已验证同架构恢复；跨数据库引擎移植尚未测试。

## 生产与云验证门槛

当前配置workers_dev/preview_urls关闭、虚构DB ID、无云凭据、loopback-only业务gate。正式远端测试需另行许可及账号鉴权。可对选定Worker而非整个账户施加Access，覆盖routes/custom domain/workers.dev/preview；避免改变现有七牛MCP服务。[Access官方说明](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)仍要求应用API自己判断parent/learner权限，入口登录不能替代对象所有权。

实际CPU必须采Worker日志/trace；localhost p95含DB与IPC等待，既不能据此宣称Free通过，也不能据此断言必须Paid。英文日期函数在原项目时区行为需做DST/时区扩展回归。所有未知项继续明确标注；本PR停止于原型评审。
