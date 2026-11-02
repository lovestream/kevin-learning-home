# 当前交接：数学界面R3及数字编码更新

入口 **http://192.168.2.100:38444/**，局域网HTTP、免登录；刷新获取新版。

- 原分支`codex/math-full-03-capabilities`、Draft PR22、base PR21；堆叠PR18→21→22均不合并，无新项目或worktree。
- 当前运行源码`d0dfd026a238a328743468cb5fba924ecde67526`、镜像`sha256:f85abefc6e5984f3fd416c3d9fc03882a043b170ecca7e835423b71ed3accd41`、容器`3ac7bc5f2c5735c75e9a64c5d9e5fe4895cc868c36ddbdde49582cb0db0ebf72`。已回退8242475并恢复当前版本；原52e也保留，不删其他资源。
- 源码push CI 41448504055、PR CI 41448510870完整成功；14组NAS回归成功、19静态资源核对成功、11受保护服务及旧文件hash不变。旧数学/英语与真实数据未改。
- 21项视觉/编码运行或来源输入变化，260项不变；69课/837题指纹不变。最终文档/证据HEAD与完整双CI链接以PR22正文为准；归档不再改变运行源。

[本轮报告](../implementation/MATH-VISUAL-R3.md) · [当前NAS回执](../implementation/evidence/math-onepass/ui-r3/delivery.json) · [截图](../implementation/evidence/math-onepass/ui-r3/screenshots.json) · [回归](../implementation/evidence/math-onepass/ui-r3/nas-suite.json)。旧e7证据是历史记录，不能当作当前用户审美认可。

保留70课堂/849题、54模型/432题、17卡、63案/18对照/8题族、28方法与复习索引。NAS无AuthService/SQLite/真实挂载，匿名RAM刷新清空；合成私有机制不启用正式账号、不迁真实历史、不并钱包或蛋仔。

用户视觉认可与实体手机/iPad仍待实际反馈。完整最终双CI成功后暂停，交ChatGPT集中独立复审，不自行合并，不进入下一阶段。


用户2026-11-02要求迁移真实数学记录，并已明确原math-learning目录。正确SQLite/WAL已找到；只读一致性备份、恢复逐字节核对和私有逐字段清单已通过，真实记录尚未导入匿名入口。不要再让用户查副本。详见[迁移准备方案](../plans/MATH-RECORDS-01-PREPARATION.md)。当前仅测试的存储闸门不得移除，正式存储/访问模式需作为记录阶段明确实现并审查，不擅自改证书或系统权限。
