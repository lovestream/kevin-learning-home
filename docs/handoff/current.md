# 当前交接：英语冲刺和本次生词本CI通过，NAS发布待恢复

2026-11-17。沿用 `codex/english-full` 和 Draft PR38；本批运行源码 `47f077339be9aa1088163aa833851c037d1f380c`，五组完整CI全部success。没有合并main。

- 已补齐原考试冲刺四阶段、224批覆盖6631词，以及本次My Words自建/编辑/归档/来源筛选/批量候选/本地训练/词包加入。21项英语Node、三尺寸浏览器、整库核验与数学回归见 [增量报告](../english/EXTRAS-IMPLEMENTATION-REPORT.md)。当前仍RAM，刷新清空，无真实积分。
- **本批未发布到NAS。**11月17日SSH认证成功后命令无返回，原网站38444拒绝连接；当前远端状态未核实。最后已知运行e96、未对外候选fbb。47f的CI镜像已校验下载，待NAS恢复后暂存、家庭叠层、激活、全套实际回归与回退恢复。
- [固定SHA及部署阻碍证据](../english/evidence-20261117-extras-ci/manifest.json)。不把旧e96通过记录称为本批已上线；不修改真实学习记录、DSM、网络或其他容器。
- 剩余原本机PK、正式日期复习/周检/持久报告、My Words词形备注/外链图片仍明确未完成。随后继续受信统一记录、真实保真导入、核验积分和蛋仔；不伪造跨天数据或学习奖励。

以下保留历史交接，不能据此断言当前在线状态。

# 当前交接：英语核心内容已部署，同站NAS回归通过

2026-11-16复核（2026-11-15部署）。继续用户“数学之后英语、统一记录/积分、蛋仔家园，一个个来”的要求；复用当前工作目录与 Draft PR38，未合并main。

- 入口 **http://192.168.2.100:38444/subjects/english**，仍是原学习家园端口；运行源码 `e96ebd29424c20564dc53e014b0399cfd585b691`，家庭镜像 `sha256:3dae615252a885bfe4d00a3d8a4db34b6fa03c8bc1782824f18462b41086bb20`。CI公共基础镜像不含家庭教材素材；家庭叠层经固定来源哈希和实际256MiB资源探针验证。
- 四个push/PR完整CI通过；6631词卡、665组、128教材练习页/1275槽、1861配图，词卡/主动发音/补空/完整拼写/首答订正/本次收藏回顾/本地V1词包已同站接入。原许可待核对状态保留，素材不进公共镜像或Git。
- 真实NAS英语三尺寸12流程、首页/探索各五尺寸、回退4a75并恢复e96通过，11个受保护服务不变。数学14组NAS回归全部通过，结论见 [本批报告](../english/IMPLEMENTATION-REPORT.md) 与 [NAS证据](../english/evidence-20261115)。
- 当前仍是无数据库、无真实挂载的匿名RAM模式，刷新清空；没有迁入真实数学/英语记录、私人词包、旧钱包或蛋仔，没有改旧站、证书、DSM或Tailscale。
- **英语尚未全部等价迁完**：原按词表分日的考试冲刺、周检/正式日期复习、完整My Words编辑归档/本机PK及持久报告仍需接续。之后按统一受信记录读写→真实历史保真导入→核验事件积分→蛋仔的顺序完成。[模块台账](../english/MODULE-MATRIX.md) · [交付队列](../implementation/LEARNING-HOME-DELIVERY-QUEUE.md)。

以下为历史交接，不代表当前NAS版本。

# 进行中：统一记录底座与英语来源准备

2026-11-09。接续用户“英语、统一学习记录/积分、蛋仔家园，一个个来”的要求。

- 工作分支 `codex/explore-02-records`，沿用现有目录并合入完整 PR36 `463030c`；本批运行/测试代码 `4dcfadedc4292fa2b4dfef0369d3858fece79db4`。
- 本批完成私有记录合成回归、复习索引/旧英语格式/家长概况/跨学习者事件作用域修正，新增关键 CI；英语固定来源与素材哈希清单准备完成。详见 [记录报告](../records/IMPLEMENTATION-REPORT.md)、[交付队列](../implementation/LEARNING-HOME-DELIVERY-QUEUE.md)、[英语来源](../english/SOURCE-AUDIT.md)。最终 CI 状态以该分支 PR 检查为准。
- NAS 实际运行仍为下方 PR36 的匿名无数据库版本；不把模拟验证冒称已部署。未改真实记录/旧服务/私人词包/证书/DSM/Tailscale。
- 完整数学 UI 私有保存、正式受信入口与维护流程、真实数据导入、英语页面、统一积分/蛋仔仍需继续；孩子无密码，家长只有一个自己设置的密码，不移除现有安全闸门。

下面保留上一批 NAS 交付基线，供核对运行与回退。

# 当前交接：家园首页已交付至NAS

2026-11-06，`codex/home-navigation`，Draft PR36基于PR35，未合并任何PR。

- 实际访问 **http://192.168.2.100:38444/**；数学 `/subjects/math`，探索 `/explore`。运行源码 `4a75d88c139cba5a216d553dc944c20d3a02a67d`，镜像 `sha256:3d1e47269a19750ee045d4206ce0bf5fcf6295bdcf40022632d393093f98d14f`。原URL保留，没有另开Mac演示入口或新项目副本。
- 真正首页、真实搜索、教材书架、固定导航与统一抽屉已交付，新增课程不增加顶部标签。英语/成长清楚标记准备中，无虚构进度。
- 源码两套完整CI成功；NAS首页/探索各五视口、14组数学回归、回退、23资源hash和11受保护容器不变通过。最终归档HEAD双CI见[PR36正文](https://github.com/lovestream/kevin-learning-home/pull/36)。[报告](../home/IMPLEMENTATION-REPORT.md) · [证据](../home/evidence/manifest.json)。
- 150来源文件/5001字段投影、210课堂、849题/84完整作答、255旧功能流程及完整综合体验均重测；真实重测修复旧证据拦截，没有删除安全断言。
- 匿名38444无SQLite/AuthService、零挂载、非root只读根、1逻辑CPU/256MiB；操作刷新清空。旧站和真实记录未修改，无证书/DSM/Tailscale/权限调整。手机/iPad实体与用户视觉验收仍NEEDS_USER_ACTION。
- 孩子无需账号密码；唯一家长密码由用户亲设，无额外PIN。私人保存实现仅保存在本地 `codex/explore-02-records@af7c92f`，未推送/部署，不冒称其完成。本轮没有迁入真实数据。
- 总任务#25仍有保存、媒体、家长报告闭环未完成。保持堆叠PR为Draft，交集中独立审查，不擅自合并。无新checkout/worktree。

## 前一轮交接（历史背景）

入口 **http://192.168.2.100:38444/**，局域网HTTP、免登录；刷新获取新版。

- 原分支`codex/math-full-03-capabilities`、Draft PR22、base PR21；堆叠PR18→21→22均不合并，无新项目或worktree。
- 当前运行源码`d0dfd026a238a328743468cb5fba924ecde67526`、镜像`sha256:f85abefc6e5984f3fd416c3d9fc03882a043b170ecca7e835423b71ed3accd41`、容器`3ac7bc5f2c5735c75e9a64c5d9e5fe4895cc868c36ddbdde49582cb0db0ebf72`。已回退8242475并恢复当前版本；原52e也保留，不删其他资源。
- 源码push CI 41448504055、PR CI 41448510870完整成功；14组NAS回归成功、19静态资源核对成功、11受保护服务及旧文件hash不变。旧数学/英语与真实数据未改。
- 21项视觉/编码运行或来源输入变化，260项不变；69课/837题指纹不变。最终文档/证据HEAD与完整双CI链接以PR22正文为准；归档不再改变运行源。

[本轮报告](../implementation/MATH-VISUAL-R3.md) · [当前NAS回执](../implementation/evidence/math-onepass/ui-r3/delivery.json) · [截图](../implementation/evidence/math-onepass/ui-r3/screenshots.json) · [回归](../implementation/evidence/math-onepass/ui-r3/nas-suite.json)。旧e7证据是历史记录，不能当作当前用户审美认可。

保留70课堂/849题、54模型/432题、17卡、63案/18对照/8题族、28方法与复习索引。NAS无AuthService/SQLite/真实挂载，匿名RAM刷新清空；合成私有机制不启用正式账号、不迁真实历史、不并钱包或蛋仔。

用户视觉认可与实体手机/iPad仍待实际反馈。完整最终双CI成功后暂停，交ChatGPT集中独立复审，不自行合并，不进入下一阶段。

用户2026-11-02要求迁移真实数学记录，并已明确原math-learning目录。正确SQLite/WAL已找到；只读一致性备份、恢复逐字节核对和私有逐字段清单已通过，真实记录尚未导入匿名入口。不要再让用户查副本。详见[迁移准备方案](../plans/MATH-RECORDS-01-PREPARATION.md)。当前仅测试的存储闸门不得移除，正式存储/访问模式需作为记录阶段明确实现并审查，不擅自改证书或系统权限。
