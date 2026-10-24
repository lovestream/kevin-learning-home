# MATH-00执行报告

2026-10-24，任务为[Issue #9](https://github.com/lovestream/kevin-learning-home/issues/9)。基线main `5ccd196`，独立分支`codex/math-00-source-audit`。目标是审计和下一轮准备，**不是数学课程迁移或页面开发**。最终review目标提交、两套完整CI链接/结果以本Draft PR正文与Checks的精确HEAD为准；本报告不写引用自身提交的循环SHA。

## 逐条交付验收

| Issue9要求 | 本轮事实/证据 | 状态 |
| --- | --- | --- |
| 冻结数学/英语点 | 数学a7c05aaa、英语d0b42a88；源HEAD不符时读blob前立即FAIL，英文blob读取0 | PASS_LOCAL，见[边界](evidence/math-00/source-boundaries.json) |
| 原17仅为候选，补齐逐文件闭包 | 133路径/273依赖边，116项新增明确列名/hash；15 allow/90 adapt/28 exclude，每项用途/目标/许可/首课selector | PASS_LOCAL，见[清单](evidence/math-00/source-inventory.json)/[逐文件表](MATH-00-SOURCE-AUDIT.md) |
| 70课与首课元数据 | 70唯一lessonId/4内容版本/70 draft；首课G3-U01-B01、2026-10-07.2、2026-10-09.4；12个taskId/8 blockId仅记录元数据 | PASS_LOCAL，inventory.lessonInventory/firstLesson |
| 构建/运行/资源审计 | 静态import+人工filesystem补边，源/构建/生成物/首课图形链；不执行生成器，未打开gitignored catalog | PASS_LOCAL，来源审计的Mermaid及edges |
| 业务纯函数/状态耦合 | pilot-math候选纯算法与pilot-store原地状态、wallet/pets/复习/PIN/HTTP区分，不把所有函数当纯函数 | 已审，见耦合表 |
| 首课视觉/素材/授权 | observe/box-camera内联SVG；首课不需外部图片、折纸模板/HTML、游戏音视频或教材图；无root统一license，第三方notice/私人来源待下一轮复制审查 | 已审；没有以素材公开可见推断再分发权 |
| 下一轮精确合同/验收 | 正式会话绑定learner的单课GET、家长实时grant/解锁、strict DTO/嵌套答案剥离、source/DTO/visual build digest、CSP/键盘/390-768-1280，A01–A12 | [任务书](MATH-01-READONLY-ACCEPTANCE.md)/[机器合同](evidence/math-00/readonly-contract.json)已交付，接口NOT_IMPLEMENTED |
| 新旧状态差异/未来写入 | 单行JSON SQLite→多学习者v2、旧revision/eventId/奖励原子性差异逐项列出；MATH-02/03只规划 | 已交付，无迁移或写命令 |
| 旧仓库不修改/真实数据不读 | 只git show固定tracked blob，前后HEAD/status指纹一致；未运行旧build/pretest；真实data/backup/inbox/.env/私有词包0读取 | PASS_LOCAL，边界证据；不对旧站独立运行产生的数据做内容比对 |
| KLH运行代码不改/NAS不动 | apps、packages/auth及全部packages、正式Docker/package/lock与base差异0；NAS零连接、无新容器/清理/证书/权限操作 | PASS_BOUNDARY |
| 自检与完整CI不弱化 | 新12项Python审计测试+offline checker；仅给push显式加本分支，同时原workflow guard期待清单加该项，所有main/PR/禁止skip/完整job断言保留 | 本机目标测试PASS；完整60/18/3/Docker/Compose由最终HEAD双事件CI核验 |
| 交付后停止 | Draft PR等待ChatGPT审查；不合并、不执行MATH-01、不提前写入/练习/钱包 | 交接停止线 |

## 本机验证与问题处理

[local-checks.json](evidence/math-00/local-checks.json)记录环境、目标命令和exit0。12项审计测试覆盖冻结漂移、依赖/FS资源漏边、旧17hash变化、危险服务误allow、禁止路径/符号链接mode、源状态变化、HEAD错位读前FAIL、draft误升级、嵌套答案误公开和import方法辨别。重生成inventory与先前字节完全一致。完整回归没有在每次编辑后反复运行，本机目标验证通过后在最终提交的Actions一次完整验证。

审计工具开发中遇到Git默认引用Unicode路径，首次按换行解析会找不到中文蓝图名；已改为`ls-tree -rz`/NUL UTF-8解析，不读取工作区文件兜底。初版import扫描把旧对象`.import()`/URL正则误识别为导入，已修正并有回归，不用其假依赖扩大白名单。最初17来源扩展到依赖闭包的过程中，grade3 JSON、思维JSON、生成输入/打印资源都显式补边，最终无未裁定nonliteral imports。

本轮未运行旧JS来证明作者source与提交生成物字节等价；此限制已明确，未伪造构建复现结论。CI离线验证metadata/合同/文档一致性及安全规则，不把它称为对所有原blob的独立网络再取证；可在已冻结本地repo用生成工具复核。

## 未实施与下一步

尚未复制任何课程源码/素材/真实记录；没有MATH-01页面、GET/API、几何浏览器测试或NAS单课部署。手机/iPad当前通过的是02B登录，不能代替数学验收。正式家长身份、持续HTTPS、加密备份与新卷恢复、外部Tailscale、Node24在DSM4.4支持、统一钱包/蛋仔均不在本轮。

源根无统一LICENSE，复用范围与第三方notice仍需MATH-01逐文件origin→target记录和独立审查；尤其不引入游戏素材/原教材。现有7天CA到期需另行处理，不能因本轮审计自动换证书或放宽校验。

MATH-00通过后才由用户批准首课只读开发；下一轮按A01–A12交付小范围单课，旧站独立。当前Draft PR完成后停止，交给ChatGPT审查，不自行合并或推进。
