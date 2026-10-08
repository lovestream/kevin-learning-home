# 06 · 分阶段小 PR 计划与验收

状态：仅计划。**本轮只同步文档，不创建实现PR、不启动开发、不合并旧仓库。** 后续开发写入目标仅kevin-learning-home；原仓库作为只读来源。来源SHA、测试用例和教学结果必须可追溯。

## 阶段与批准门槛

| 阶段 | 进入条件 | 完成后仍不代表什么 |
| --- | --- | --- |
| Phase0文档审查 | 本轮用户授权 | 不代表真实数据已备份、NAS已可上线或已批准开发 |
| Phase0保护补齐 | 真实运行目录/浏览器origin已确认，私有备份可取得 | 不把备份放Git，不执行导入 |
| Phase1运行验证 | 用户审查确认进入开发；有权执行NAS隔离探针；确认Node24风险处理 | 不开始真实学习切换 |
| Phase2平台/数学 | Phase1有可解释结果，选定执行环境、基线和auth方案 | 不删旧测试、不重新编写课程 |
| Phase3英语 | contracts/auth/数学保真稳定，匿名迁移预览与冲突策略就绪 | 不靠重放英语事件补币，不宣称历史首答都可信 |
| Phase4奖励/家园 | **家长独立批准历史积分与开账规则** | 仍须Phase6真实切换和恢复验收 |
| Phase5扩科 | 平台科目边界稳定，有人工审稿的真实新课 | 不上AI自动生成课程、不改已有科目钱包 |
| Phase6生产 | 私有真实备份、逐字段预览、恢复演练、权限/双设备测试全通过并批准切换 | 不立即归档原仓库，需观察期及可恢复证据 |

任务书将英语切换放在Phase3描述中；本计划建议先在匿名/合成环境完成该阶段，真实切换统一受Phase6门槛控制。这样在中央奖励策略尚未批准时，不会出现新旧两套生产数据各自继续写入的事实源冲突。这是**流程提案**，需用户审查，尚未实施。

## PR 拆分

| ID / 阶段 | 范围与文件候选 | 验收与交付 | 回退与禁止事项 |
| --- | --- | --- | --- |
| DOC-0 / Phase0 | docs/phase-0、docs/ADR、原任务书参考与README | 本轮文档同步；明确已验证/未知/提案，来源SHA和测试记录 | 文档提交可恢复；无应用代码/真实记录 |
| PR-1A / Phase1 | infra隔离探针、scripts/nas-preflight、runbook；固定linux/amd64镜像 | daemon/Compose核验、Node24/node:sqlite/WAL/事务/卷持久化合成验证；记录内核支持差距及选定路径 | 删除探针容器与合成卷；不升级NAS/授予app docker.sock |
| PR-1B / Phase1 | 新repo的数学过渡副本/英语静态容器、loopback proxy与健康检查 | 只用合成数据；最小必要监听/Origin/session/parent保护；Serve私网与备份恢复探针 | 停过渡服务；不改原repo、不导入真实数据；英语不声称跨设备同步 |
| PR-2A / Phase2 | npm workspaces、packages/contracts、schema与平台迁移器、单writer | 04类型落地；schema未知字段/错误版本；SQL唯一约束/回滚；公开API稳定 | 空演练库可重建；生产迁移必须版本化，不删真实库 |
| PR-2B / Phase2 | auth_sessions、parent grants、CSRF、PUBLIC_ORIGIN、受信代理 | 登录/配对、父母引导/恢复、限频、Secure cookie；学生不能导入/批阅/发布/改奖励 | 可撤会话、回滚服务；不导出旧PIN/cookie |
| PR-2C / Phase2 | React shell、URL导航、subject registry、全科planner与基础report | 今天/学习岛/复习/错题收藏/家园/成长；全科预算30–40分钟；已有任务保护与延期 | 按feature flag撤新shell；不替换学科复习算法 |
| PR-2D / Phase2 | math Adapter、content/source归属、原工作台与宠物兼容UI | 使用8e91154候选源；132既有测试与原浏览器CI继续执行；完整math payload匿名往返对照 | 新模块可停用，原站继续；不把models/开放题改成选择题 |
| PR-3A / Phase3 | 从app.js提取英语纯model/判分/调度，保留DOM版回归fixture | 原4组JS回归、启动器/响应式基线保留；词形/变体/线索保护、日程确定性测试 | 仍可回到来源逻辑；不加FSRS、不改词库生成文件而跳过builder |
| PR-3B / Phase3 | English server Adapter、V1/V2 preview/receipt、source_snapshots、冲突处理 | 03清单全部字段覆盖；同file/event幂等、同ID不同payload拒绝、未知词/字段隔离；无奖励重放 | 演练事务回滚；raw来源保留；不以sanitize成功代替差异报告 |
| PR-3C / Phase3 | 英语React Learn/Practice/My Words/原书/weekly checks/sprint UI | 四词库/custom/成熟词/复习/内嵌图/阅读来源/归档恢复；390px与Safari/iPad；跨设备合成进度 | English feature flag回退；不写原浏览器真实localStorage |
| PR-4A / Phase4 | reward policy、wallet_accounts/ledger、经过批准的开账迁移 | XP/coins/bond-growth独立；数学旧账本对账、英语一次性规则；重复请求/重新导出不增币，日上限 | 迁移前一致性备份；追加冲正/显式版本回退，不删除交易历史 |
| PR-4B / Phase4 | PetService、Inventory、Memory、GameTheme、共享消费 | 购买/消费/成长与wallet同事务；并发不透支/重复喂；数学旧拥有、礼包、claims、receipts保真，换皮仍可恢复 | 停新主题/交互；状态不清零，不因缺课扣成长 |
| PR-5 / Phase5 | 一个新学科模板、3节人工审稿可用课程、内容草稿→发布→回滚 | 只注册subject、renderer、rubric、review/report；不改wallet或shell；旧课程保持原样 | 撤内容版本/停模块；历史版本、来源与证据保留 |
| PR-6A / Phase6 | NAS正式部署、私有备份/恢复、Mac+iPad多端E2E、运维手册 | 同origin竞争写/重复event/断网重试、父母权限、卷重建与空目录恢复；版本回滚演练 | 停写保护并备份新库；按版本兼容路线回退，不能丢新事件 |
| PR-6B / Phase6 | 私有正式迁移运行记录、脱敏验收摘要、旧站停写与30–60天观察 | 最终快照/逐字段对账/经批准钱包开账/单一生产事实源；报告未迁移范围 | 旧源保留只读；观察与恢复完成再讨论归档，不自动归档 |

PR-1B的安全与监听适配不是后门；若最小权限方案未完成，保持服务仅在隔离环境测试，不能先让孩子在tailnet上使用裸API。正式app权限由PR-2B完成并回归。

依赖顺序：1A→部署路径决策→1B→2A/2B→2C/2D→3A→3B→3C→家长奖励规则批准→4A→4B→5→6A→真实切换批准→6B。可以在隔离环境做独立内容盘点，但不能跳过数据和权限依赖。PR-2A/2B可逻辑拆分，合并上线仍必须满足完整权限门槛。

## 原任务书 14 项验收的对应关系

| # | 验收关注点 | 对应PR与证据 |
| --- | --- | --- |
| 1 | 数学课程/草稿/复习/首答/钱包/宠物/背包不丢 | 2D、4A/B、6B；03全字段报告 |
| 2 | 英语V1/V2各词库/复习/My Words/weekly/事件不丢 | 3B/C、6B；raw与规范化差异、未知字段去向 |
| 3 | 两设备同event只保留一证据一奖励 | 2A、3B、4A、6A；相同/不同payload冲突测试 |
| 4 | 唯一生产金币余额 | 4A、6B；确认无第二生产币池写入，旧钱包只读档案 |
| 5 | 拒直接改币和伪造成绩 | 2A/B、3A/B、4A；schema与server判分/授权 |
| 6 | NAS重启/容器重建/空目录恢复 | 1A、6A；全库+内容+媒体+配置对照 |
| 7 | 外部iPad读取Mac最新进度 | 6A；真实tailnet同URL与服务器revision |
| 8 | 内容版本不反改首答和质量 | 2D、3B、5；不可变原题快照/追加判分 |
| 9 | 缺科目内容只暂停该模块 | 2C、3B/C、5；orphan/unresolved保留 |
| 10 | 换主题不改余额成长拥有关系 | 4B；Theme与资产身份分离及round-trip |
| 11 | 子女不能导入恢复/发布/改奖励 | 2B、5、6A；API服务端拒绝 |
| 12 | 390px无溢出、弹窗可操作 | 2C、3C、4B、6A；原responsive+新E2E |
| 13 | 原测试不减少，新增迁移/钱包/E2E | 各迁移PR；原CI用例列表+新平台矩阵 |
| 14 | main CI全绿、回退可还原版本和数据 | 每PR与6A/B；精确head SHA运行证据，不复用旧截图 |

## 每个后续 PR 的完成标准

描述具体行为变化与来源SHA；写明迁移范围和未迁移范围；新增测试只覆盖改变的实际风险。共享schema、writer、auth、wallet改动在最终验收跑完整相关矩阵，小改动先针对性验证。旧测试不能通过删用例、弱化断言或只跑新壳获得“全绿”。

真实数据报告只在私有存储保留，Git仅放匿名fixture、schema、源代码和脱敏汇总；不可上传孩子答案、金币余额、词包来源私有文本、PIN、cookie、NAS私有域名/peer配置或凭证文件。

## 下一个可审查范围

建议先确认数学来源采用8e91154、NAS兼容性路径和接口/保真原则；批准后第一个开发PR仅PR-1A合成运行探针。历史积分策略等到Phase4单独决定。本轮停在设计审查处。
