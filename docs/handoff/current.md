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
