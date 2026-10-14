# KLH-BENCH-00｜Cloudflare 与 Node/NAS 公平对比测试协议

**签发日期**：2026-10-13；**状态**：待执行、非部署授权。  
**项目**：`lovestream/kevin-learning-home`；发布分支 `chatgpt/klh-platform-compare-tests`。  
**相互独立的两条任务**：[Cloudflare/D1](KLH-BENCH-01-CLOUDFLARE.md)、[Node/SQLite/NAS](KLH-BENCH-02-NODE-NAS.md)。

## 0. 研究目的和基线

在不迁移 Kevin 真实记录、不重写两门课程的前提下，用**同一套业务用例、同一套合成数据、同一套验收标准**判断哪条路线更适合 10 年以上持续发展。结果可能是 Cloudflare 更优、Node/NAS 更优、两者均不足，不能预设胜者。

开始前读取：main 的 `docs/phase-0/01～07` 与 `04-unified-contracts.md`；PR #1 的 NAS 真实报告 `docs/phase-1/PR-1A-nas-validation-report.md`、Cloudflare 可行性评估、运行路线决策；另外阅读尚未合并的架构任务 `chatgpt/klh-scalable-architecture-rfc/docs/tasks/KLH-ARCH-02-Scalability-RFC.md`，不得把它当成已批准 ADR。重新确认当前 git refs，分别出具确切 SHA。

旧来源只读：`math-learning@8e9115442b3978eee0d4821750ce04f47954bd26`、`word-request@d0b42a8872a7e87433b96770519203630223b6f2`。PR #1 分支探针及其 CI 可作为 Node 路线既有证据，不能把 kernel6.8 CI 冒充 DS918+ 真机。数学候选数据库、英语 V2 真记录、孩子个人素材及父母凭证一律不读取/导入。

## 1. 公共测试夹具与关键逻辑

**只使用合成 learner、合成账户和允许公开的课程示例；不得出现真实 Kevin 答题、实名、IP、NAS路径、Cloudflare token、七牛密钥。**

Codex 先独立提出并固定 `tests/platform-parity/contract-v1.md` 和 JSON fixture/schema；两条实现复用它，不允许为让某个平台通过而降低断言。保留来源算法的可追溯测试：从现有数学库挑出**至少1项真正的判分/首答规则**，从 Word Quest 挑出**至少1项拼写判分或复习调度规则**，合成输入、预期输出、内容版本、原始源码引用/哈希冻结。若不容易直接复用原算法，必须区分 `ADAPTER_PARITY_NOT_TESTED`，不能用自己编写的简化假算法宣称已兼容旧项目。

固定至少以下场景，每条路线一致：

| ID | 公共用例 | 不可妥协的验收 |
|---|---|---|
| P01 | Math封闭题正确/错误/提示后做对/首答 | 不能把提示或订正后的正确伪装独立首答；禁止客户端送correct/coins |
| P02 | WordQuest拼写/近似拼写/复习调度 | 对同输入与冻结原算法输出做差异比对，保留source/信任标识 |
| P03 | 首次写事件及revision | server端写学习证据，revision仅成功后推进 |
| P04 | commandId同请求重复100次 | 只写1条事件/1份receipt，返回一致结果 |
| P05 | commandId相同但body不同 | 必须409 `IDEMPOTENCY_CONFLICT`，不得多写事件或奖币 |
| P06 | 两设备同时用同expectedRevision写入 | 恰一成功；另一个409 STALE_REVISION；刷新后明确解决 |
| P07 | 注入写入失败/SQL约束失败 | 状态、事件、receipt、奖励全部回滚，不留下半提交 |
| P08 | 多次重复reward/source事件 | **仅合成策略示例**、两科来源钱包隔离；不启用真实中央币池，不重放历史 |
| P09 | 学生访问家长批阅/恢复/上传 | 服务端拒绝；不可因私网/Access或登录页隐藏而绕过 |
| P10 | 断网重试、离线缓存、跨浏览器会话恢复 | 原commandId不变，失败不上报已同步，不覆盖server更新 |
| P11 | 学科课程manifest、媒体assetId版本 | 切换媒体provider配置不改课程JSON；公开/私有权限不同 |
| P12 | 程序重启/重部署、数据库备份及全新环境恢复 | 学习事件、revision、钱包来源隔离与媒体manifest/hash一致 |
| P13 | 数学/英语最小互动页面在桌面、iPad尺度 | 真实可操作、可保存、刷新继续；静态截图不算业务通过 |
| P14 | 同样的负载下资源、时延与失败率 | 用同样脚本、并发、数据规模、地理网络进行可比统计 |
| P15 | 10倍/100倍/1000倍内容和媒体增长**设计演练** | 内容可独立扩容，不能靠“全部打包进前端”；数据可迁移、恢复 |
| P16 | 中断/恢复与切换试演练 | 停机/服务不可用时保护未同步草稿，备份后可恢复，不编造生产SLA |

**公平性细则**：每组开始前把同版本合成库恢复到相同基准；测试顺序和随机种子固定；读写样本数一致；预热次数相同；测试运行期间不可同时改算法。采用 `p50/p95/p99`、成功率、CPU时间、数据库读取/写入行、存储占用、冷/热资源加载、实际传输字节等指标；HTTP响应时延和真实用户点击体验分开。至少3轮，未实际跑到3轮则标明。

### 三个负载档位（只用合成数据）

- S 家庭：1 learner，2设备，2学科，100学习事件，500媒体引用（可重用媒体对象）。
- M 扩展：3 learners（全部虚构），10学科，10万事件，10万媒体引用。允许本地脚本生成，不上传海量实体到云。
- L 远期模型：10年/15学科/100万～千万学习事件、10 TB媒体**容量与成本模型**；默认不进行百万真实远程操作或10 TB上传。用数据库行宽、媒体体积/请求率及采样外推，清楚标注模型非实测，不预测十年供应商价格不变。

计算费用时分别估算免费/付费、动态请求、数据库行扫描、媒体存储/读写请求/外传、备份倍数、设备与电费、运维时间；账户现有七牛 MCP Worker 也共享 Workers 免费账号额度。未知项用区间/标“未核验”，不得编“免费无限”。

## 2. 数据安全、授权和禁止事项

**无需额外同意**：GitHub新分支的合成fixture/测试/文档、在Mac/CI本地测试、Cloudflare Wrangler本地 D1 模拟、现有 NAS 的只读检查（沿用既有认证并最小范围）。

**已经授权但未能执行的 NAS 范围**：用户只授权创建 PR-1A 的隔离 Docker 容器和专用合成目录；**这不自动授权新的BENCH持久服务**，也不授权变更Docker daemon socket或系统权限。新BENCH-NAS的容器/写入/常驻服务或权限更改须重新明确授权。无权限即 `BLOCKED: PERMISSION_DENIED`，不可提权、chmod 777、加入 root/docker 特权组、修改现有容器/服务、使用全局清理。

**需要另行用户明确许可**：创建远端 Cloudflare Worker/D1/R2/Access、绑定域名、变更账号或订阅、任何产生账单的资源、发布可公开访问的测试入口、向远端上传任何素材。Cloudflare PoC 首先本地运行，有权限也不代表已经授权云端部署。远端部分许可缺失时以 `BLOCKED_BY_APPROVAL` 停止，保留本地测试成果，不伪造云端实测。

不得改现有七牛云 MCP Worker、现有 Cloudflare Workers/KV/R2/D1、DS918+服务、原始数学/英语仓库、真实数据库。Cloudflare PoC 资源使用独立命名和最小权限；试验费用/风险在部署前申明。敏感报告只留本机，GitHub只提交脱敏合成数据和SHA校验。

## 3. PR、报告和项目停机线

Codex先交付一份共用fixture/比较基准 PR，或在独立 `codex/bench-shared-contract` 工作分支冻结契约；再用**两个相互独立的PR**执行 `BENCH-01` Cloudflare 与 `BENCH-02` Node/NAS。两侧不得互相冒充实测，公共夹具更改必须说明变更、同时重新测试双方。

建议输出：
- `docs/benchmarks/BENCH-00-common-protocol.md`（原文/修订差异、源SHA、统一fixture hash）
- `docs/benchmarks/BENCH-01-cloudflare-report.md`
- `docs/benchmarks/BENCH-02-node-nas-report.md`
- `docs/benchmarks/BENCH-03-side-by-side-decision.md`（只有两侧都有证据或明确阻塞后生成）
- `docs/handoff/platform-benchmarks.md`（任务链接、PR、head SHA、CI、是否真机/真云、阻塞/许可、下轮待决项）

**强制打标**：`PASS_LOCAL`、`PASS_CI`、`PASS_NAS`、`PASS_CLOUDFLARE_REMOTE`、`FAIL`、`BLOCKED_PERMISSION`、`BLOCKED_APPROVAL`、`NOT_RUN`。不得把 `PASS_LOCAL` 当成真云/真NAS。

不可自动合并两个PR、重写 Phase0 ADR 为“已接受”、进入PR-1B/数学整合、开正式钱包、迁入真实记录，**全部完成后STOP，交 ChatGPT审查选择路径**。
