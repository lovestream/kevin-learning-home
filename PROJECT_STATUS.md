# Kevin Learning Home · 家园首页与探索

2026-11-06：家园首页已实际更新到 **[http://192.168.2.100:38444/](http://192.168.2.100:38444/)**。不再用顶部学科标签切换；首页有学习空间、真实搜索、教材书架；数学 `/subjects/math`，探索 `/explore`。桌面固定导航，手机统一抽屉。运行源码 `4a75d88c139cba5a216d553dc944c20d3a02a67d`，镜像 `sha256:3d1e47269a19750ee045d4206ce0bf5fcf6295bdcf40022632d393093f98d14f`。

源码push/PR完整CI成功；NAS首页/探索各五视口、14组数学回归、新→旧→新回退及23项资源hash通过；11受保护容器与旧项目Git指纹不变。最终归档HEAD双CI见[Draft PR36](https://github.com/lovestream/kevin-learning-home/pull/36)。[报告](docs/home/IMPLEMENTATION-REPORT.md) · [证据](docs/home/evidence/manifest.json)。实体手机/iPad和用户视觉认可待实际反馈。

用户账号要求保持：**孩子免登录；家长查看情况时才登录，唯一密码由用户亲设，不另加PIN。** 38444仍是匿名内容/RAM体验，刷新清空。私人记录与媒体底座未完成实现保存在本地 `codex/explore-02-records@af7c92f`，未混入此次镜像，不声称真实保存、迁移或家长报告已交付。原数学/英语独立运行、真实资料不改，无证书/DSM/Tailscale/权限调整。

总任务#25尚未全部完成：合同与公开探索已交付，保存、媒体、家长报告等闭环仍需完成。无新Mac checkout/worktree。PR18→21→22→35→36保持Draft堆叠，不自行合并。[探索前批报告](docs/explore/IMPLEMENTATION-REPORT.md)为历史，当前运行版本以上述回执为准。

## 之前的数学交付（历史，运行版本以本轮最新回执为准）

**访问：[http://192.168.2.100:38444/](http://192.168.2.100:38444/)**，局域网HTTP、免登录，刷新获取新版。

用户否定上一轮视觉后，已按原数学站风格修正青绿导航、薄荷背景、中文字体、教材入口与六步课堂布局。视觉改版涉及5份前端文件，同时接入数字编码G3-UP02-B01 v2026-11-01.2的9份纯教具模块及12题，其他69课/837题保持原样；判分、鉴权、持久化源不变。显示效果是否满意仍由用户判断。

运行源码`d0dfd026a238a328743468cb5fba924ecde67526`，镜像`sha256:f85abefc6e5984f3fd416c3d9fc03882a043b170ecca7e835423b71ed3accd41`。源码push/PR完整CI成功，14组NAS回归全部成功，新版→8242475→新版实际回退成功。最终归档HEAD及完整双CI链接见[Draft PR22](https://github.com/lovestream/kevin-learning-home/pull/22)。

[本轮报告](docs/implementation/MATH-VISUAL-R3.md) · [新NAS回执](docs/implementation/evidence/math-onepass/ui-r3/delivery.json) · [154张新截图](docs/implementation/evidence/math-onepass/ui-r3/screenshots.json) · [交接](docs/handoff/current.md)。原e7报告/截图保留为历史，不代表用户视觉认可。

数学仍为70课/849题、54专题模型/432题、17思维卡、63宗四层侦探、28方法及原复习索引。本页RAM刷新清空；不启用真实账户、长期成绩、钱包或蛋仔。旧数学/英语、11受保护NAS服务与真实数据未改。实体手机/iPad仍NEEDS_USER_ACTION。

PR18→21→22保持堆叠Draft、不合并；本轮最终CI成功后暂停，不进入下一阶段。没有新建worktree或项目根目录。

用户2026-11-02要求迁移真实数学记录，并已明确原math-learning目录。正确SQLite/WAL已找到；只读一致性备份、恢复逐字节核对和私有逐字段清单已通过，真实记录尚未导入匿名入口。不要再让用户查副本。详见[迁移准备方案](docs/plans/MATH-RECORDS-01-PREPARATION.md)。当前仅测试的存储闸门不得移除，正式存储/访问模式需作为记录阶段明确实现并审查，不擅自改证书或系统权限。
