# Kevin Learning Home · 探索与创造开始实施

本轮按总任务#25和路线图推进。用户最新决定：**Kevin日常学习不需要账号密码；家长查看学习情况时才登录，唯一家长密码由用户亲设**。数学/英语/探索共用内部学习者与未来家庭设备会话，不分科设账号、不另加家长PIN。

分支`codex/explore-01-preview`基于现有PR22，而非从滞后main覆盖数学；没有新增Mac项目/worktree。第一批已交付#26合同、#27同壳四栏目/内存工作台至NAS，附离线引导与70课堂往返；真实项目保存、媒体、家长报告尚未开启。当前代码/本地测试与NAS发布、精确HEAD双CI进度分开记录，见[实施报告](docs/explore/IMPLEMENTATION-REPORT.md)、[产品与账号修订](docs/explore/00-PRODUCT-AND-ARCHITECTURE.md)、[领域合同](docs/explore/01-DOMAIN-CONTRACT.md)。

访问 **[探索与创造](http://192.168.2.100:38444/explore)**；数学原入口 **http://192.168.2.100:38444/**。运行源码`b7a2d23e25027b59e9a64cadfd41f5e9931db9b1`，同一NAS入口已实际验证探索五视口和14组数学回归，新旧实际回退成功，11个受保护容器不变。源码双完整CI通过；最终归档HEAD双CI以[Draft PR35](https://github.com/lovestream/kevin-learning-home/pull/35)为准。旧数学/英语与真实数据不改，不申请证书、不修改DSM/Tailscale、不启用外部AI或钱包。后续依赖和九项实际状态见实施报告；不能将本批当整个工程完成。

## 之前的数学交付（历史，运行版本以本轮最新回执为准）

**访问：[http://192.168.2.100:38444/](http://192.168.2.100:38444/)**，局域网HTTP、免登录，刷新获取新版。

用户否定上一轮视觉后，已按原数学站风格修正青绿导航、薄荷背景、中文字体、教材入口与六步课堂布局。视觉改版涉及5份前端文件，同时接入数字编码G3-UP02-B01 v2026-11-01.2的9份纯教具模块及12题，其他69课/837题保持原样；判分、鉴权、持久化源不变。显示效果是否满意仍由用户判断。

运行源码`d0dfd026a238a328743468cb5fba924ecde67526`，镜像`sha256:f85abefc6e5984f3fd416c3d9fc03882a043b170ecca7e835423b71ed3accd41`。源码push/PR完整CI成功，14组NAS回归全部成功，新版→8242475→新版实际回退成功。最终归档HEAD及完整双CI链接见[Draft PR22](https://github.com/lovestream/kevin-learning-home/pull/22)。

[本轮报告](docs/implementation/MATH-VISUAL-R3.md) · [新NAS回执](docs/implementation/evidence/math-onepass/ui-r3/delivery.json) · [154张新截图](docs/implementation/evidence/math-onepass/ui-r3/screenshots.json) · [交接](docs/handoff/current.md)。原e7报告/截图保留为历史，不代表用户视觉认可。

数学仍为70课/849题、54专题模型/432题、17思维卡、63宗四层侦探、28方法及原复习索引。本页RAM刷新清空；不启用真实账户、长期成绩、钱包或蛋仔。旧数学/英语、11受保护NAS服务与真实数据未改。实体手机/iPad仍NEEDS_USER_ACTION。

PR18→21→22保持堆叠Draft、不合并；本轮最终CI成功后暂停，不进入下一阶段。没有新建worktree或项目根目录。

用户2026-11-02要求迁移真实数学记录，并已明确原math-learning目录。正确SQLite/WAL已找到；只读一致性备份、恢复逐字节核对和私有逐字段清单已通过，真实记录尚未导入匿名入口。不要再让用户查副本。详见[迁移准备方案](docs/plans/MATH-RECORDS-01-PREPARATION.md)。当前仅测试的存储闸门不得移除，正式存储/访问模式需作为记录阶段明确实现并审查，不擅自改证书或系统权限。
