# MATH-FULL 来源与范围台账

2026-10-25，Issue #15。冻结来源 `lovestream/math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279`，只读 Git tracked blobs；旧数学/英语工作区、真实数据和 NAS 不写入。复用当前工作目录，新分支 `codex/math-full-01-70-lessons`，不新增 worktree。

本批完成冻结三年级现有入口 70 课（包含原有基础衔接课；全部 draft，64 原 verified、6 static-visual）的六步教学和对应教具；不是整站迁移完成。849 题（五组/五型）留给 Issue #16 的独立练习 PR，正式账号、学习记录、积分/蛋仔暂停。

先验证覆盖各教具族的代表课，再在同一分支完成全部 70 课，不逐课等待审查。独立 preview/content-only 服务不导入 AuthService、MathService 或 SQLite；显式启用、仅 Mac 回环地址，免登录，不持久化。正式服务的 session/grant/CSRF 原保护保留。NAS 新版本 NOT_DEPLOYED，不覆盖 38443/38444。

## 全站剩余范围

| 范围 | 本批状态 |
| --- | --- |
| 70 课教学/教具 | 本分支 70/70、三视口 210 场景通过；Draft PR 待独立审查，尚未部署 NAS |
| 849 题及首答/自查/终答 | Issue #16，尚未接入；335 解释题必须人工核对 |
| 数学小侦探及家长案卷 | 未迁入；Issue #17 单独审计，不读私密案卷 |
| 17 已审思维卡 / 43 暂缓卡 | 未迁入；不能把暂缓卡标为已审 |
| 四至六年级旧课程 / 168 蓝图容器 | 未迁入；后续区分可运行内容与仅规划 |
| 真实身份/学习记录/钱包/蛋仔/长期部署 | 暂停，不属于免账号体验模式 |

## 本批实际来源和投影

[origins.json](evidence/math-full-01/origins.json) 逐项记录 145 个目标的冻结 commit、原 Git blob、SHA256、目标 hash、改造与许可理由。其中为 57 份运行时教学依赖闭包及必要声明/类型/样式、4 份代码生成折纸 SVG、70 份严格教学 DTO。这里是必要教具依赖闭包，未复制旧站入口、旧 API/store、完整课程生成器或练习系统。

[field-mappings.json](evidence/math-full-01/field-mappings.json) 逐课记录 **5,003 项字段投影**的源 JSON pointer、目标 pointer 和原值 hash；本地导入同时比较源/目标的规范化值，CI 离线独立核对目标值与已归档 hash。完整原 `lessons.json` SHA256 为 `0a1c23b8904eb328a029a1d4dec0fda480defb1596325121b9cb7cb19ff70afa`；没有将其 1.33MB 整包放入预览，70 份漂亮格式 DTO 合计 392,541 字节，最大单课 8,173 字节。公开字段包括原版本/draft/单元/先修、childClassroom、已知条件图、教具参数及独立教学 workedExamples；排除整份 taskSets、articleBlocks 原对象及 expected/hint/solution/referenceAnswer/expectedExplanation/expectedEvidence/旧 PIN/奖励字段。

| 原主教具 | 课程数 | 实际复用 |
| --- | ---: | --- |
| conceptLab | 52 | 原空间、质量、运算扩展、教材教具与 6 静态关系图；包含 16 个概念族，按模型注册共 51 种 renderer 模式 |
| mixedOperations | 6 | 原运算 AST、已知量情境图、首步选择/中间量与逐步操作 |
| lengthWorkbench | 5 | 原断尺/路线/板材搭接/链环/点段关系、相应量纲与几何 |
| fraction / area / substitution / balance / quantity / addition / subtraction | 各 1 | 原彩带、地垫/外圈、整盒替换、等量糖袋及基础数量教具 |

`scripts/math-full-01/import.mjs` 必须显式指定本机冻结仓库；只读 tracked Git blobs，先核验 HEAD/原整包 hash，前后状态指纹一致。它不调用旧 build/pretest/source.mjs，也不打开旧工作区生成物、DB、备份或词包。[source-boundary.json](evidence/math-full-01/source-boundary.json) 是 Git 元数据边界证明，不冒充对旧站正常学习事件的数据库监测。字面 import 闭包扫描是审计辅助，不宣称是完整 JS AST 证明；独立 Vite 编译验证实际运行依赖解析，新增非字面/外部来源不得静默放行。

## 适配边界与许可

原几何、计量、教材与运算纯模型保留；原教学 React 片段保留语义、键盘/指针/运动控制，通过外层 registry 按族装配。仅做 import 扩展名、教学类型裁剪、内存提示及禁止隐藏答案读取的必要改造：移除 validateTask；运算示范结果由公开 AST 计算，不读取 scene.expected；静态说明使用公开 observableChange；原保存提示改为临时内存。完整步骤 UI 沿用已认可的 KLH 六步风格，不引入 iframe。

未知 schema/模型、内容/hash 漂移、缺失或篡改构建资源均 fail closed。原无根 LICENSE，复用是用户对本人项目的授权，不授予无关素材的通用再分发许可。仅使用受审代码生成几何 SVG，不含游戏、教材截图或音视频。React/ReactDOM MIT 与 lucide-react 0.468.0 ISC 许可证全文保留在 [THIRD-PARTY-NOTICES.txt](../../apps/preview/public/THIRD-PARTY-NOTICES.txt)；lucide 只作预览构建依赖，不进入正式容器的生产依赖。原声明中的 64 verified 是来源交互标记，不代表教材内容已正式审定。

Issue #16 可依赖本批稳定的 lessonId/contentVersion/editorialRevision、目录 hash 与教学 DTO，另在指定练习分支审查 849 题与校验流程。当前没有正式答卷或临时判题端点，335 解释题未来仍须标人工核对。
