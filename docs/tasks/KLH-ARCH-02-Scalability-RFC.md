# KLH-ARCH-02：面向十多年增长的学习家园架构与可迁移存储 RFC 任务

> 签发：ChatGPT，2026-10-13。此文档是**设计与审计任务书**，不是已批准的最终ADR或部署授权。  
> 项目：`lovestream/kevin-learning-home`；签发时 main `46687ba370ca7e47764e500641bc371e2c0d4727`，在审PR #1 分支 `codex/pr-1a-nas-runtime-probe` 的最新观察 SHA `98d22980c2b0d984fde7f7d507ca98173001beb4`。Codex开始前先刷新 SHA、拉取完整树，检查工作区冲突，避免丢失其他进展。
> 任务类型：**仅架构研究、确切媒体清点、可测试的接口契约设计与成本/迁移评估。严禁本轮直接部署云服务、建立付费资源、上传真实数据或重构数学/英语业务。**
> 核心产品约束：平台预期服务 Kevin 十年以上，陆续增加语文、英语阅读/口语、数学、物理、化学、地理、历史及未知未来学科。未知的媒体规模与功能类型是设计前提；可迁移性、可扩展性和恢复能力优先于现在节约一次部署操作或刻意维持永久免费。

## 一、必须遵守的架构决策原则

1. **明确区分四个域**：应用前端与运行时（compute）、元数据与学习记录（transactional database）、内容与媒体大对象（blob/object storage）、历史归档与跨服务商备份（archive/disaster recovery）。不把它们强制绑定一个厂商。
2. **前端部署包保持轻量且与媒体资源增长解耦**。Workers Static Assets 只承载 React/Vite 入口、JS/CSS和少量很小的固有UI资源；庞大的词卡图片、教材图、课程音频/视频、未来上传素材，优先按内容版本上传对象存储；不能因为“当前不到20,000文件”就把所有未来资源写进静态打包规则。
3. **媒体存储抽象要薄而真实**：明确 media asset ID、manifest/schema、版本、对象 key、hash、size、mime、访问等级、存储 provider/ref、生命周期与授权；不要为了未来而写复杂插件框架和假实现。
4. **学科学习引擎与供应商SDK隔离**：数学、Word Quest、宠物系统只访问课程/媒体和状态的领域接口；不得把原始 R2/七牛 URL 或 D1 API 散落在题库和渲染组件里。
5. **统一学习数据与课程内容更新要保真**：不可把来源旧数据改写成新证据；学科事件/首答/家长批阅、历史奖励的事务和去重约束不改变。
6. **服务商可迁移**：优先选择标准 S3 兼容对象存储的公共子集；R2、七牛或未来别的供应商通过 adapter 与迁移工具互换。R2实现的是S3兼容子集，不假定100%兼容。
7. **容量与费用无硬编码假设**：将来从 100MB -> 10GB -> 100GB -> 1TB -> 10TB 或更多时，理想情况仅改变存储成本和配置，不需要重写科目/移动端。
8. **平台不是“永远免费”**：接受随着数据量增长适度付费；设监控预算、生命周期政策与容量警戒；不为省钱自动删除不可恢复的孩子学习记录。

## 二、当前外部事实（执行时须重新核验）

Cloudflare 官方文档（以实际查询时间为准）：
- Workers Static Assets：Free 每版本20,000文件，单文件25 MiB；内容部署包不适合无止境增长的图片/视频库。<https://developers.cloudflare.com/workers/platform/limits/>
- R2 Standard：每月10 GB-month免费、超出容量约$0.015/GB-month、Class A/B请求另计、互联网外传不收费；单bucket总容量/对象数量不限，单对象最大5 TiB。<https://developers.cloudflare.com/r2/pricing/>；<https://developers.cloudflare.com/r2/platform/limits/>
- D1：Free每库500MB/账户合计5GB；Paid单库10GB硬限制。单个字符串/blob/行最大2,000,000字节；数据量/索引增长需按学习事件和报告分区设计，不能把全量10年状态塞单行JSON。<https://developers.cloudflare.com/d1/platform/limits/>
- R2 S3兼容性及直传：<https://developers.cloudflare.com/r2/api/s3/api/>，<https://developers.cloudflare.com/r2/api/s3/presigned-urls/>，<https://developers.cloudflare.com/r2/objects/upload-objects/>
- 私有Bucket不应为了方便媒体访问就公开，公共域名需考虑缓存、安全与版权：<https://developers.cloudflare.com/r2/buckets/public-buckets/>
- 当前 NAS Node24 实测仍因 Docker daemon 权限 BLOCKED，不能写作 Node24 “已运行失败”。参照项目 `docs/phase-1/PR-1A-nas-validation-report.md`，它在 Codex PR #1 分支内。

已由 GitHub 树按冻结版本统计（**不是构建产物、不是当前账户用量**）：
- Word Quest `d0b42a8`：1,863 张 WebP，约 86.6 MB；多数属于 Core2000 和 Movers/阅读图，语音主要通过 browser speechSynthesis。
- Math Learning `8e91154`：正式 `public/` 17 个文件约 5.37 MB；整个 Git 仓库约92.2 MB但大量是 `research/`、`docs/` 和 `assets/source/`，不代表都要进入网站。
- 两repo的媒体仍可能包含版权限制的素材；公开访问策略必须通过许可审查，不得把“原本是私有家庭网站”当作公有资产授权。

## 三、希望 Codex完成的研究交付

### 1. 精确的媒体与构建产物库存
针对冻结版本，并重新记录最新refs：
- 按 `runtime/public`、`course media`、`source`、`research`、`test artifacts`、`user generated/private` 分类；不得将源图、重复图、审计截图全部算成线上资源。
- 每分类列出文件数量、总/最大文件体积、扩展名、目录、实际代码引用点、课程依赖及生产是否需要。
- 通过内容 SHA-256 找重复文件、同图不同分辨率、未被引用资源、坏链接；只出报告，**不删除**。
- 提出 Git 中保留“内容定义/版本/manifest”与对象存储保存“大体积文件”的分界；不要未经审查批量改动现在 Git 的文件历史。
- 评估现有课程的离线需求、固定音频 vs 浏览器TTS、未来音视频/儿童录音的增长。

### 2. 分层架构 RFC（正式ADR提案但不要自动标 Accepted）
参考：
```
Browser/PWA
   -> App Shell + UI (Cloudflare Workers Static Assets / future other runtime)
   -> Business API (Workers candidate / future Node)
       -> LearningRepository (D1 candidate / future PostgreSQL or SQLite service)
       -> CourseRegistry + ContentManifest
       -> MediaGateway/MediaStorage (R2 OR Qiniu OR S3 service)
       -> RewardLedger/PetService
   -> Media Delivery: immutable assets public only if license permits; private media via auth/signed access
   -> External Backup/Export: NAS + second copy, versioned with hash and restore test
```
R2与七牛的取舍必须讨论接口能力、访问/外传费用、写入请求/缓存策略、安全权限和可替换性，而不是单纯比较免费10GB。
**重要**：对象存储不是数据库；D1也不是未来无上限单库。各域都要独立迁移策略。

### 3. 明确对象与数据契约（先在文档给类型和数据流）
建议 MediaAsset 元数据最少有：
```ts
type MediaAsset = {
  assetId: string;             // 稳定逻辑标识, e.g. media:wordquest:whisper:picture:1
  version: string;             // 绑定可追溯内容版本
  sha256: string;              // 原始源文件校验值
  sizeBytes: number;
  mimeType: string;
  visibility: 'public-licensed' | 'private-learner' | 'internal-source';
  storageRef: {provider: 'r2'|'qiniu'|'local'|'s3'; bucketAlias: string; objectKey: string};
  derivatives?: Array<{variantId: string; objectKey: string; sizeBytes: number; mimeType: string;}>;
  sourceLicense?: string;
  contentRefs?: string[];
};
```
约束：课程只引用 `assetId + version`，不在内容中硬编码 七牛/Cloudflare 链接；服务端 resolver负责签名URL或受控流式访问，导入/备份 manifest 可读且 provider 独立。内容 hash 和 key 约定如 `content/{sha256Prefix}/{sha256}.{ext}`，避免重名覆盖；错误上传需可撤回但不可删正在引用的已发布内容。
文档展示前后端接口（例如 `GET /api/v1/media/:assetId`、`POST /api/v1/parent/media/upload-intent`、`POST .../commit`），公开/私有不同权限和缓存；详细实现延后。大文件优先浏览器直传到对象存储的限时签名URL/分段上传，不通过Worker直接承载大文件。
不要将R2 S3密钥、七牛AK/SK公开给浏览器或Git。

### 4. 数据库10+年扩展
- 学习事件按可查询的行/时间划分，不默认永远把整个孩子状态压进1个payload JSON；但不在本轮写真实迁移器。
- D1 免费/付费每库上限、查询单线程/CPU预算、索引和分区/归档策略；若未来超过D1单库约束，提供“学科/学年归档库或迁移PostgreSQL”的**可执行路线**，不能只是“以后扩容即可”。
- 学科引擎通过 Repository/transaction command抽象隔离 D1 API，明确 CAS revision、幂等指令、唯一奖励账本、课程版本、原始历史证据保存。
- 数据库备份和存储对象备份要相互校验，保证恢复时课程记录引用的媒体对象仍可用。

### 5. 10年容量、费用及服务风险模型
分别提供小/中/大三档或 10GB / 100GB / 1TB / 10TB 预测；列出总容量、资源数、峰值对象大小、月请求、缓存命中率、预估下载、备份倍率、每月存储费与请求费。
区分“已验证官方价格”“估算假设”“未核实账户优惠”。不要为了把总价写成零而遗漏备份、服务调用、域名、语音模型、API、未来AI和对象读取费用。
给容量增长提醒阈值、月账单上限提醒/监控和可迁移触发条件。

### 6. 跨服务商迁移与备份演练设计
- 设计可重入的 `export media manifest -> copy objects -> verify sha256 + size + mime -> switch provider alias -> rollback` 流程；
- 不要求对所有资源改写课程JSON；切换期间双读、渐进切换与回滚；
- 数据库与对象目录恢复的 `RPO`、`RTO` 目标提案，至少一份NAS离线/独立备份并定期空环境恢复；严格区分公开内容与孩子私人录音、答题及原始导出。
- 删除政策默认保守：已发布课程素材和原始证据不自动删；过期变体可重生成但原件备份必须明确。

## 四、请产生的 GitHub 文件

全部写入 `kevin-learning-home` 新PR/独立文档分支，注意与当前未合并PR #1隔离：

1. `docs/architecture/0002-ten-year-scalability-rfc.md` —— 分层架构、权衡、明确保留旧学科引擎。
2. `docs/architecture/media-storage-contract.md` —— asset manifest/types、权限、provider adapter、安全传输/缓存。
3. `docs/architecture/data-growth-and-portability.md` —— D1/数据库增长、迁移和恢复设计。
4. `docs/architecture/ten-year-capacity-cost-model.md` —— 可调整假设的容量/成本预测。
5. `docs/architecture/media-inventory.md` —— 两旧仓库媒体清点，附来源SHA/实际引用/分类。
6. `docs/handoff/current.md` —— 交接索引如果开发分支已带此文件；不可覆盖当前PR #1的状态快照，建议本轮另创建 `docs/handoff/architecture-02.md`，并在PR说明链接。
7. PR正文记录改动、验收、未做事项以及至少3条待用户选择的架构决策。

**本轮只做文档、静态检查/脱敏脚本（若必要），不在 Cloudflare 创建 Worker/R2/D1，不消耗现有七牛云计费服务，不提供/使用用户凭据，不修改数学/英语源仓库或生产数据。**

## 五、验收与交接

- 两旧仓库媒体数量与可部署文件清单可复核，且区别 Git仓库总量/真正产物。
- D1大小、Workers静态资产限制、R2容量与计费有最新官方引用；明确免费上限≠付费硬上限≠无限免费。
- 内容与大对象、个人数据与公开资源彻底分离；有真实的S3兼容迁移测试计划。
- 接口包含学习事件及游戏积分幂等保真、版本引用/媒体去重、访问权限/签名URL、安全缓存。
- 给出未来数据量增百倍或千倍时的路线，优先改变配置/扩容而不是重做学科模块。
- 所有未测试云端能力均标为 `NOT_TESTED`；不宣称 Cloudflare 架构已通过生产验证。
- 文档提交至 GitHub，留PR/分支URL、准确SHA、变更清单和待决项，**停止等待 ChatGPT 复审，不自动开始云端合成部署、不合并旧PR**。
