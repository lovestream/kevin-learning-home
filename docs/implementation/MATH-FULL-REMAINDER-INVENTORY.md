# 数学剩余范围与可运行能力审计

本批对应 [Issue #17](https://github.com/lovestream/kevin-learning-home/issues/17)，冻结原仓库 `a7c05aaa8d9c5eabae4f3453807f830da1cbf279`。只读 tracked Git blobs，未启动旧服务器、执行旧写文件脚本、读取 inbox/reviewed 私密案卷、用户 DB、账户或备份。旧数学、英语网站继续独立运行。

用户最新授权要求在 R3/849 题后连续实际迁入成熟数学能力。本批不是只写清单：在同一工作副本、同一内容进程和学习家园导航接入 17 思维卡、14 模拟侦探、54 高年级旧课、方法/复习/索引/打印。实现与 NAS 状态见 [执行报告](MATH-FULL-03-REPORT.md)，不能把研发代码或本地截图称为 NAS 已更新。

## 完整范围对照

| 原入口/能力 | 冻结证据 | 本批处理 | 当前边界 |
| --- | --- | --- | --- |
| `?view=today` 个性化每日路线 | `src/App.tsx`, `src/learningMap.ts` | 新家园以真实课本目录与自由探索进入 | 不伪造每日目标、学习进度、完成百分比或个性化推荐记录 |
| `?view=map` 三年级 70 稿件课 | `content/pilot/lessons.json`, `src/learningMap.ts`, `src/UnitLearningMap.tsx` | PR18 已迁 17 教材单元/63 课与 7 衔接、原知识点/顺序/教具 | 64 原交互/6 静态，不冒充全部均可拖动 |
| 70 课内五组练习 | 同上、`shared/pilot-math.mjs` | PR21 已实际 NAS 交付 849 题，原 ID/文案/版本/顺序不变 | 335 解释题只人审，零真实成绩/积分 |
| 三年级旧版 50 关 | `content/grade-3/legacy-seed.json`, `src/learningMap.ts` | 原站 `hasCompleteGrade3` 也会隐藏这些旧关，已由 70 稿件课替代 | 不再次堆 50 个重复入口，不把它们加进 70 数量 |
| 四至六年级旧版课程 | `scripts/build-upper-primary-catalog.mjs`, `scripts/course-framework.mjs`, `src/MathLab.tsx` | 各 18 课，共 **54 课/432 题**，按原六类主题与年级接入；七类真实通用教具 | 是可生成、可运行的旧版内容，不是新审定教材课；原通用模型仍需逐课教学适配验收 |
| 168 个制作容器 | `content/Kevin_数学课程结构清单.json.coursePlans` | 只核实数量/来源 hash，未作为运行课程或标题占位发布 | 蓝图不是已完成课堂，不计入 54/70 |
| 17 已审思维卡 | `grade-3-thinking.json`, `thinking-source.mjs`, `thinking-hints.mjs`, `thinking-publication.mjs` | 严格通过原 publication fingerprint 的 **17** 张，原条件图、两级提示/参考过程、三种原教具；文字只人审 | 这是 editorial-reviewed-awaiting-parent-trial，不代表 Kevin 已掌握 |
| 43 暂缓思维卡 | 同上 | 保持未开放；公开接口和导航均不提供题文 | 不能把 17+43 说成 60 张可用 |
| 思维卡家长批阅/延迟变式链 | `src/thinking/ParentThinkingReview.tsx`, `server/thinking-store.mjs`, `content/pilot/thinking-variants.mjs` | 原基题可临时探索；正式批阅、辅助证据、1/3/7/21 天链及受控变式复习不迁 | 依赖身份和学习记录；不把未独立核准的变式假冒本批已审基题 |
| `?view=detective` 数学小侦探 | `content/detective/seed-cases.mjs`, `shared/detective-model.mjs`, `src/detective/DetectiveFigure.tsx` | **14** 个原匿名模拟案卷，观察→判断/首错→理由→改正→反查，自查后临时核对 | 模拟不冒充真实作业；保留数值/选择/排序；不授勋或写案卷 |
| 私密案卷/上传箱/家长审核 | `server/detective-store.mjs`, `server/detective-inbox-store.mjs`, `src/detective/ParentDetectiveCases.tsx` | 不读取文件，不复制后端或授权界面，不提供这些 API | `DET-G3-PENDING-015` 和 tracked reviewed 私密文件也不导入；原站继续运行 |
| `?view=review` 自由复习 | `src/LearningReviewView.tsx`、原 taskSets.review | 三年级 **244** 道原复习题，按原单元/衔接自由选课 | 个人到期日/间隔复习历史/家长批阅结果不伪造 |
| 逆向思考索引 | `shared/inverse-index.mjs`, `src/InversePracticeIndex.tsx` | **11** 个原题索引直达原课/原组/原题；原逆推课堂链接 | 不新建题、不换 ID、不另计入 849 或奖励 |
| `?view=methods` 方法工具箱 | `content/pilot/methods.json`, `src/MethodsView.tsx` | **28** 条目，**6** 份完整条件/例子/反例；搜索/完整讲解筛选/空态及已有课堂链接 | 其余 **22** 只保留原应用说明，明确讲解待补充 |
| 教学说明/复述/教具 | 70 稿件的 childClassroom/已投影例题及旧课 enrichLesson/MathLab | 既有 70 六步保留；54 旧课提供原本质、现实需要、发明、模型、分层练习与临时复述 | 不复制个人阅读标记、笔记或复述档案；不宣称所有旧文章的独立阅读面板均逐像素复制 |
| 折纸/打印 | `public/math-paper-folding`, 已迁 4 SVG | 同一网站已有模板路由，从探索页面直达 | 不复制教材 PDF、扫描页或私密图片附件 |
| `?view=mistakes` 个人错题/统计 | `src/ArticleMistakesPanel.tsx`, `src/learningMap.ts` | 本次不导入；临时题目允许本页订正 | 原学习事件/错误历史不是模拟案卷，不能冒名展示 |
| `?view=parent` 导入导出/教学设置/审核 | `src/App.tsx`, 原 store/parent-access | 不迁旧账户、PIN、备份导入、真实记录和审批 API | 正式新家园权限底座完整保留，此内容体验不放宽它 |
| `?view=pets` 积分/蛋仔/勋章 | 原 pet-care、wallet/store | 不迁账本、宠物状态或素材，不拼接旧站 | 未来数学/英语统一事件与奖励另审，不能用匿名点击刷积分 |

## 复用与修正

旧站的高年级 catalog 是由源脚本生成的产物，不能把未 tracked 的运行数据当审计来源。导入器提取新临时目录中的纯 `G4/G5/G6` 和 `enrichLesson` 函数，删除所有旧 I/O 尾部，再构造 54/432；不是运行旧脚本去写旧目录。17 卡还通过原审批指纹，14 案例只取 `seedCases`，明确切掉 pending 导出。只复制纯 `matchesResponse / orderedReasons / matchesReason`，不复制 inbox/record 验证或 store。

发现原 MathLab 的位值分支只计算百/十/个，但四年级课传入 `306040`；会显示不相等的展开式，且十位按钮会夹到 999。新副本仅对该分支使用多位值适配器，支持到亿位、保留每列单位、按十增减并验证展开和守恒；原旧仓库不变，其余原模型算法保留。来源与目标 hash、该例外在 [source.json](evidence/math-full-remainder/source.json) 单列，不能声称所有模型字节未改。

本批使用原仓库所有者明确授权范围内的自有代码/题文/程序生成矢量图，保留冻结来源；无新外部图片或教材扫描件。原仓库无通用 LICENSE，不将本次家庭项目复用扩写成对外通用再分发许可。

## 交付与后续

成熟公开内容共用 `/subjects/math` 壳，新增 `/subjects/math/library?kind=thinking|detective|legacy|review|methods`；课堂内复用同一临时练习组件，无 iframe/独立登录/新长期服务。原 849 题 bank 不变；新增 432 旧课题和 17 卡解释适配不伪装成新增三年级题量。

单一独立 Draft PR 叠加 PR21，审查顺序建议 PR18→PR21→本批，均由 ChatGPT 独立复审后决定；Codex 不合并。NAS 必须同一 HTTP 38444、精确通过双 CI 的源码镜像、真实网页/回退/11 服务与合成文件不变才算交付。本清单不将 43 暂缓卡、168 蓝图、真实身份/成绩/账本/私密案卷或正式生产部署称为完成。
