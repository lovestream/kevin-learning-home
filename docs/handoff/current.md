# 当前交接：探索与创造第一批

用户授权按#25路线图执行，最新覆盖要求：孩子无需注册/登录/密码，家长查看学习情况才登录，密码用户亲设；不另设儿童或二次PIN。现有生产权限/HTTPS/CSRF回归不削弱，正式个人数据与家庭设备授权由#24实现。

- 当前分支`codex/explore-01-preview`，base为PR22 `2207fcb`，原18→21→22仍Draft；本批也建独立Draft PR，不擅自合并。
- #26领域合同与#27公开示例内存流程已实现，正在归档CI/NAS发布证据。#28/#29/#32/#34正式闭环未完成；#30规则/#31课堂/#33候选只是子集。
- 真实数据和原项目未读写；此前数学只读保全已完成，来源已确认，不再要求用户找路径。不得把合成仓库闸门删掉当正式存储。
- 页面/契约/新测试见`apps/preview/explore`、`packages/explore`、`tests/explore`，具体证据与状态见[本批报告](../explore/IMPLEMENTATION-REPORT.md)。本次父母密码尚未设置，无默认真实凭据。
- NAS仅复用既有38444公开体验受控release；最终runtime SHA/image/回退与11服务不变回执在发布后更新。手机/iPad/Safari实体设备未测保持NEEDS_USER_ACTION。

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
