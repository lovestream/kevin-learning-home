# KLH-BENCH-01｜Cloudflare Workers + D1 + 对象存储可行性实测

**任务关系**：必须先阅读同分支 [BENCH-00统一对比协议](KLH-BENCH-00-COMPARISON.md)，严格共享业务fixture、状态语义、负载档和报告格式。  
**执行顺序**：先本地 Wrangler/Miniflare D1 + 静态站测试；**远端 Cloudflare 创建/部署资源必须另获用户明确授权**，否则止步本地，标 `BLOCKED_APPROVAL`。  
**不允许**：生产部署、读真实学习数据、覆盖现有七牛 MCP Worker、动用户已存在的 Cloudflare 资源或把R2开启订阅当成默认授权。

## 1. 核心研究问题

Cloudflare能不能在**保留原数学/英语核心学习算法**的前提下，支持：完整学习请求、持久化状态与幂等金币试验、家长权限、规模增长、独立资源存储、导出和恢复？能否在 Free 计划 CPU 10ms/request、D1实际写入/查询限额下安全运行？针对平台差异，量化需要改造的代码量、风险和每年运维成本，而不只是给出静态页面“Hello World”。

### 与旧项目保真

- 新仓库当前还没搭真实app。不要拿一个空hello页面冒充学科迁移完成。
- 从 `math-learning@8e91154`、`word-request@d0b42a8` 只读提取/封装至少一个真实数学评估行为和一个真实英语拼写/复习行为；记录源文件、SHA与冻结fixture的期望输出。不改源仓库。
- 两学科的旧来源奖励分开存档；PoC最多使用单独的 synthetic reward ledger 来验证原子性，**不制定历史兑换比率，也不启用统一币池**。
- 浏览器端要求一份最小 React/Vite 或同等真实可操作 UI；一页 Math、一页 English，必须能点击、提交、刷新后恢复状态。API不能由客户端提交`correct`/`coins`/`trustLevel`获得授奖。

## 2. 服务端功能与测试

实现 `LearningRepository` 的 Cloudflare/D1 适配层，并用公共契约约束错误码。D1不是Node `node:sqlite`；不要依赖`BEGIN IMMEDIATE`+await JavaScript回调的事务写法。对同步需要原子的数据使用实际可验证的D1条件SQL、唯一键、受控原子`batch()`或其他经测试等价机制；验证跨**多个独立HTTP请求**并发下不会丢revision或重复award。

至少测试：
1. P01–P10学习与安全用例：不同key相同revision竞写只成功一个；同commandId 100次并发只一份receipt；相同key不同payload必须409且不更新；任何内部SQL失败保证全回滚；服务端身份、parent-only grant、CSRF/Origin、跨learner越权、重复帮助后首答证据都要有反例。
2. D1多个请求及Worker新部署后的数据持久性；在启用D1复制读取的场景下明确使用/不使用Sessions API的正确性前提，读回不能被陈旧副本误导。
3. 避免把多年的`subject_state.payload_json`塞进单行：对接近/超过单字段2MB的合成状态，展示保真分片/事件表策略；保留原始来源hash/字段与未知数据隔离。不允许靠截断成功。
4. Worker启动/负载：真实CPU时间、壁钟时间、请求限额、D1读/写行消耗和错误率；测试10ms CPU免费配额下是否有失败，以及如果需Paid的精确理由。不得用localhost结果声称云端免费适用。
5. 权限：访问入口Access能否保护`workers.dev`与预览域名，**同时**API执行学生/家长授权；不依赖隐藏链接或可伪造X-Forwarded/role头部。任何远端公开接口都须在鉴权就绪后才能开放。
6. 数据导出恢复：从测试D1中导出数据库/逻辑事件 + manifests，导入到新空测试数据库，逐字段比对数量/hash、revision及幂等receipt。并区分Time Travel与真正异地备份。
7. 故障/流量：D1不可达、Worker异常重试、并发50/100；至少3轮预热/报告p50/p95/p99。负载必须受限、不能冲击用户现有其他Workers额度。

## 3. 媒体架构与容量验证

不要将未来10TB课件全部打包进Static Assets；静态部署仅JS/CSS/app shell。实现并验证极薄的`MediaAsset` manifest 和`MediaGateway`，课程只引用assetId+version，没有硬编码某个vendor URL。最小测试生成**可公开的合成图片/音频/二进制文件**（例如几十KB、1MB、5MB），验证：

- 公开可发布课程资源经标准Cache-Control版本化缓存访问，发布新版本不污染旧课程引用；
- 私人learner媒体只有合法授予者能访问；测试直接猜URL、盗链、错误权限、缓存跨用户泄露；
- 大媒体走**浏览器直传到对象存储**的限时签名/分段机制，不允许通过Worker同步缓冲上GB素材；
- 资源hash、mime、大小、manifest与对象一致；故障后可以从备份恢复。
- R2远端试验需要单独确认R2订阅开通的计费条件；不经许可不开R2。可用本地S3 mock进行契约测试，但**不可冒充R2真机**。
- 测试内容发布时无需重部署app的最小流程：course manifest与media manifest作为版本化数据/对象动态加载；保持权限与可回滚。
- 模拟100GB/1TB/10TB媒体成本和对象数量，不实际创建100GB以上内容；真实上传仅小型合成文件且提前申明体积。

Cloudflare官方文档以测试当天为准，关注：
- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>
- <https://developers.cloudflare.com/d1/platform/limits/>
- <https://developers.cloudflare.com/d1/worker-api/d1-database/>
- <https://developers.cloudflare.com/d1/best-practices/import-export-data/>
- <https://developers.cloudflare.com/r2/pricing/>
- <https://developers.cloudflare.com/r2/get-started/>

## 4. 运行阶段与许可界限

### 01A：无需远端云权限

在`codex/bench-01-cloudflare`独立分支创建`experiments/cloudflare/`或同等隔离目录、fixture测试、`wrangler dev --local`、D1 local migrations、本地Mock对象存储、浏览器E2E、CI；可模拟D1/Workers真实API的本地适配，输出`LOCAL/CI`报告。

首次报工时附使用资源和预估调用次数；不能把既有Cloudflare七牛MCP的account id/token写入Git或报告。部署配置采用环境变量/secret binding、不要硬编码用户标识与private IP。

### 01B：**取得家长二次确认以后** 才进行真云试验

申请用户许可的文字应列出预计新资源名、套餐和费用影响、是否需要R2订阅、拟创建域名/测试URL、需登录/最小权限范围、自动清理计划。新建独立`klh-bench-*`命名的Worker和D1测试库，需R2则独立bucket。严格不触碰现有MCP Worker。

授权后才运行受控远端测试，收集`PASS_CLOUDFLARE_REMOTE`证据，量化CPU/usage/latency、D1写入一致性、断线重试、资源权限、备份导出恢复。若无授权，仅报告`BLOCKED_APPROVAL`，不把本地Wrangler模拟当成线上验证。

## 5. 交付与停止

提交一个只包含Cloudflare PoC的独立PR，不覆盖PR#1或现有任务分支，报告：
- `docs/benchmarks/BENCH-01-cloudflare-report.md`：P01-P16逐项`PASS_LOCAL/PASS_CI/PASS_CLOUDFLARE_REMOTE/FAIL/BLOCKED_APPROVAL/NOT_RUN`；真实源算法比对、完整用例、CPU/读写/延迟/耗费、资源数量、改动文件、测试环境与确切SHA。
- `docs/benchmarks/BENCH-01-migration-gap.md`：数学与英语实际需要改造哪些接口、预计工作量与缺陷风险、D1扩容/迁移策略；给出仅保留业务逻辑与改写事务层的差异。
- `docs/benchmarks/BENCH-01-media-object-contract.md`：mediaID引用、public/private、签名URL、provider迁移、跨云校验与备份/恢复。
- `docs/handoff/platform-benchmarks.md`或`docs/handoff/BENCH-01.md`：PR/CI/HEAD、真实远端是否运行、许可状态、下一步建议。

若云端权限、免费额度、CPU或D1原子行为存在实质问题，不自动开通Paid或修改Cloudflare账户方案，标出后请用户决策。**本PR不合并、不迁入Kevin真实记录、不上线网站，不继续PR-1B，待 ChatGPT 审核。**
