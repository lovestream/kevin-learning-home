# MATH-01：G3-U01-B01 可视化只读接入任务书（提案，尚未实施）

2026-10-24，下一阶段提案。前置条件：MATH-00 Draft PR经ChatGPT审查、用户明确允许进入MATH-01。本文件不是本轮开发授权；MATH-00不得照此提前写生产代码、复制课件或部署NAS。[Issue9](https://github.com/lovestream/kevin-learning-home/issues/9)、[来源审计](MATH-00-SOURCE-AUDIT.md)、[结构化合同](evidence/math-00/readonly-contract.json)共同定义边界；矛盾应先裁定，不能自行扩大范围。

## 目标与复制边界

在学习家园内只显示冻结的`G3-U01-B01`可视化课堂，复用原玩具盒/相机/三面投影算法和教学顺序，允许**本页内存中的**相机旋转、方向切换、临时照片及六步切换。刷新后回初始视角/步骤，不读写课程进度，不把探索判成掌握。原两个网站继续独立、真实学习资料不动。

数学来源严格为`a7c05aaa8d9c5eabae4f3453807f830da1cbf279`，首课contentVersion=`2026-10-07.2`、editorialRevision=`2026-10-09.4`，status仍draft；不能给原课换ID/题目/教具图/教学文本或悄悄升为published。首课12个taskId保留来源审计，但本阶段不复制/返回任何taskSets或练习题。

只从inventory的9个selectedSourcePaths中选择**已审的必要片段**：`lessons.json`只投影这一课；视觉只取BoxCamera、SolidView、observe/Projection及其纯几何/运动/CSS依赖。不得复制完整ChildClassroom/TeachingDiagrams/ConceptWorkbench/Practice、70课作者源、旧store/HTTP/PIN/API、其它模式和素材。新仓库内适配，原仓不反向改动。每个实际落地文件新增origin→target→修改理由→原hash/目标hash清单；不能把133个审计节点当作批准复制清单。

建议目标职责：`packages/subjects/math/`存受审来源manifest与**只包含本课的服务端公开数据**；`apps/web`下新增作用域明确的math只读视图；现有Node受控GET分派负责身份/内容核验。目录最终以MATH-01 PR声明为准，不要求重构现有auth/全局路由。复用KLH React19.3.1等依赖，不复制旧package/lock。没有SQLite v3迁移，没有新subject_state/attempt/event写入。

## 精确HTTP与鉴权合同

唯一新增课程读接口：

```text
GET /api/v1/learners/{learnerId}/subjects/math/lessons/G3-U01-B01
```

页面路径：`/subjects/math/lessons/G3-U01-B01`。拟增加显式flag `KLH_MATH_READONLY=1`，默认false；不是本轮已存在配置。默认关闭时数学仍保持待迁入入口/FEATURE_DISABLED，不改变英语和wallet开关。只读试点启用时需要为subject registration定义明确的`readonly-preview`状态，并配套严格schema/界面契约；不能仅将原enabled=true却仍允许任何数学写API，也不以testContext绕过生产身份。

1. 使用既有精确Origin/Host及same-site策略；不信任X-Forwarded/Tailscale头。课程接口只允许GET，HEAD/POST/PUT/PATCH/DELETE返回405；flag关闭仍按既有FEATURE_DISABLED 403处理。URL不接受query、encoded slash、路径穿越、任意contentVersion/learnerId覆盖；结构非法400 REQUEST_INVALID。
2. flag启用时，先验证正式Cookie会话（缺失/过期/撤销401 SESSION_REQUIRED），然后验证learner范围。孩子路径learnerId只能等于actor绑定的learner_id；家长必须二次解锁未过期，并实时检查该learner非撤销grant。家长锁定403 PARENT_ACCESS_REQUIRED；其它孩子/授权撤销403 LEARNER_FORBIDDEN。先做身份/范围检查，再判断lesson是否存在，防止未授权探测元数据。
3. 有权限但其它lessonId返回404 LESSON_NOT_FOUND；只允许首课精确内容版本与manifest；hash/schema不符返回503 CONTENT_UNAVAILABLE，不fallback到latest/缓存旧内容。
4. 响应使用既有JSON错误格式`{error:{code}}`，不回显凭据/内部路径/答案。全响应`Cache-Control: no-store`；不新增CDN、Service Worker、local/sessionStorage或IndexedDB缓存。登录/退出/解锁继续走原auth API，原CSRF规则不减；课程GET不发学习写请求。
5. 页面始终绑定当前已核验身份与活动learner。父母切换learner、grant变化、锁定/失焦/会话异常时沿用当前fail-closed遮蔽与复核；不允许把先前成功的某个课DTO当另一个孩子的授权。课程公共教学内容相同也必须有此边界。

## 公开DTO白名单与类型

所有object严格禁止额外属性；只逐字段创建，不能spread整课再delete敏感字段。[JSON合同](evidence/math-00/readonly-contract.json)是字段列表的机器版本，下列类型/限制补充其语义。

| 对象 | 精确字段与约束 |
| --- | --- |
| response | schemaVersion=1、learnerId（服务端绑定、非空≤120）、subjectId=`math`、lessonId=`G3-U01-B01`、contentVersion/编辑revision精确冻结、sourceStatus=`draft`、mode=`readonly`、manifest、lesson |
| manifest | sourceCommit=完整冻结SHA、sourceArtifactSha256=原lessons.json完整blob的SHA256、publicDtoSha256、visualSources、externalAssets=[]、visualArtifactSha256。digest均64位小写hex；visualSources精确8项，无用户路径或可任意请求的URL |
| lesson | title（≤160）、question（≤2000）、subtitle（≤1000）、objectives、classroom、intro、predictionIntro、spatial；仅本课，无profile、完整articleBlocks/conceptScenes/taskSets或其它课 |
| objectives | ≤16项，每项{id（≤120）,action（≤2000）,scope（≤2000）}；保持原文、不新增评测数据 |
| classroom | story、mission、predictQuestion、retell、observedEvidence、whyQuestion、counterexamplePrompt为≤2000字符串；predictionOptions≤8项/每项≤240；discovery、symbols各≤16项/每项≤2000。以上首课字段均必需并来自childClassroom对应原字段，不透传其它key |
| intro / predictionIntro | 分别来自childClassroom.storyVisual与predictionVisual，保留各自title/caption，不合并或改写猜想标题；type=`box-camera`，title≤160、caption≤1000，values=[]、labels=[]。仅原故事/猜想条件图；猜想页不提前显示“新照片”结果，不渲染其它type |
| spatial | sceneId=`G3-U01-B01-MODEL1`、type=`spatial`、mode=`observe`、version=`spatial.v2`、dimensions严格为原[2.4,1.5,1.2]，不含expectedExplanation/guidance/requiredEvidence/结果轨迹 |
| visualSources[i] | {path,sha256}，path仅取inventory的8个视觉来源固定相对路径，sha256必须等于冻结blob；不支持客户端指定path。此字段是来源摘要，不是文件下载接口 |

`publicDtoSha256=SHA256(canonical({lessonId,contentVersion,editorialRevision,sourceStatus,lesson}))`，排除manifest自身与learner信封避免循环/身份混用。`visualArtifactSha256`为本次受审构建输出的首课JS/CSS文件`{path,sha256,sizeBytes}`排序清单的canonical SHA256；由构建manifest关联真实文件，不能拿源hash假装适配后bundle的hash。原8个来源hash、原课件blobhash、适配输出的hash关系都记录；MATH-01实现时才产生实际DTO/build digest，本轮没有伪造这些未来值。

任何深度禁止taskSets/tasks、expected/expectedEvidence/expectedExplanation/referenceAnswer/answer(s)、hint/solution/diagnostic、rewardRuleId/validatorIds/masteryRuleId/reviewRecord、wallet/pets/progress/auth/csrfToken。原articleBlocks的referenceAnswer与conceptScenes.expectedExplanation尤其不能漏；MATH-01根本不传这两组原对象。教学discovery/symbols是知识说明，可以保留；不能因此顺带透传正式任务题干、标准答案或当前题判断结果。未知字段、超界、版本/hash不符均拒绝，不“尽量显示”。

## 图形、路径、许可与CSP

- 本课inline SVG由受审JSX和纯几何函数产生，不读取SVG字符串、不用innerHTML/foreignObject/脚本型SVG，不新增`.svg`/`.html`资源路由或MIME许可。无教材截图、打印模板、PDF、游戏图片/音频、远程字体/图片、data:URL、iframe。
- 保留main现有CSP：`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`；不得为其它课分支、全文件复制或开发方便加unsafe-inline/unsafe-eval。首课observe/BoxCamera以SVG presentation attributes与受编译CSS工作，排除fold和其它分支inline-style。
- 数学CSS限定在math根；不得改变现有登录/侧栏/家长按钮样式/焦点/DOM。SolidView的局部gradient/clip ID必须多实例唯一，url(#id)同文档；保留pointer cancel、四向箭头、Tab/Enter、reduced-motion与RAF取消。
- 相机/按钮/临时照片仅component memory，不含请求、写库或旧useHandsOn保存轨迹；不能显示“操作会保存”。可说明“本页探索，刷新后重置”；不改原教学结论。六步顺序保留，第6步是未接入练习的可访问说明，无提交按钮或假完成徽章。
- 源根无统一LICENSE，私人来源/用户审查结论和第三方notice须记录；不能推断第三方素材授权。React/ReactDOM冻结lock为MIT，lucide为ISC，复用KLH现有依赖；不把官方游戏素材或本地教材材料带入。若后续审查发现本课实需未列外部资产，停止该复制并补审，不默默扩大资源闭包。

## 回归fixture与验收（下一轮必须实现）

本轮inventory提供taskId/field-path/内容版本与hash基线，**没有复制正式题目或答案作为fixture**。MATH-01使用两个虚构孩子/两个虚构家长+真实正式会话建立流程；另造包含嵌套答案哨兵和未知key的合成课程对象测试投影，不把原课程答案塞入浏览器fixture。实际首课教学投影与冻结SHA的公开字段逐项比较；几何输出用原boxFaces/composeSolid的受审合成数值case做特征对比，不重写算法。

| ID | 必须交付的验收与证据 |
| --- | --- |
| A01 | 两个旧repo HEAD/status前后一致、全部来源/目标hash可追溯；只复制首课批准片段。data/inbox/.env/备份/私有词包读取0，无NAS操作 |
| A02 | 首课精确ID/版本/revision/draft，公开文本与几何一致，manifest资源/source/build hash一致；wrong-version/损坏hash/缺失资源503，不fallback |
| A03 | 真实HTTP：未登录/过期/撤销401；孩子A路径孩子B403；不相信客户端learnerId或query；授权前无课标题/资源/孩子信息；不提供testContext身份捷径 |
| A04 | 家长未解锁403且IDs不泄漏；解锁且有grant可读；另家长/撤销/到期/锁定即时拒绝并清空已选课私人上下文；沿用已有fail-closed与两轮复核行为 |
| A05 | DTO严格schema；嵌套expectedEvidence/referenceAnswer/expectedExplanation、未知key、超界输入的哨兵fixture不进入response/HTML/JS预载。扫描network与emitted client bundle，不能以删除UI按钮掩盖题库被打包 |
| A06 | 每个数学写接口、旧`/api/studio/*`、`/api/attempt`、PIN/奖励/导入/恢复均关闭（既有403 FEATURE_DISABLED）；新课程路由非GET405。导航/旋转/照片/刷新/所有尝试后11项旧学习表count/hash不变，事件/receipt/wallet/积分/蛋仔无新增；既有认证last_seen维护可按原规则变化，不虚称整个DB零写入 |
| A07 | 原核心算法的合成几何特征fixture、相机正/右/上投影与标记关系，SolidView多实例SVG ID和箭头键、pointer cancel；无重新设计图形/题目 |
| A08 | 真实前后端浏览器390×900、768×1024、1280×900：完整登录→首课五步可视化/第六步说明→刷新/退出；无横向溢出、空白、控制台错误；五步/六步顺序与教学原文不改。截图无口令/cookie |
| A09 | 仅键盘可完成方向切换/临时照片/上一步下一步；焦点可见、不跳回页面头，Tab/Enter/箭头工作，reduced-motion开启/关闭正确，组件离开时清理动画 |
| A10 | 实际CSP无违例、外部请求0、无iframe/raw SVG/innerHTML/data URL、无本地持久化；math CSS不影响原家长页面，未弱化Host/Origin/CSRF/Cookie规则 |
| A11 | 原60 Node/18 UI/原3视口和Docker/Compose保留并完整成功；新增课程/鉴权/投影/只读状态测试单列。两套最终HEAD push/PR CI有明确URL、环境/源码SHA和下载核验；不是仅单元绿灯 |
| A12 | 执行/来源/许可/fixture/截图/交接归档，独立Draft PR后停止；未迁真实账户/历史记录、未合并钱包/蛋仔、未部署NAS或清理现有试用。实体设备验收若未新测须NOT_RUN，旧02B登录通过不代替数学验收 |

MATH-01测试可以在新repo合成临时目录构造身份/课程，只使用正式HTTP、真实Node/React和SQLite认证；不调用旧服务或原pretest，不挂旧站DB，不上线NAS。若要后续NAS单课试用，另行获得该部署授权，不能沿用02B容器批准覆盖新课程。

## MATH-02/03仅规划

后续阅读状态按learner+math+contentVersion隔离，统一commandId/expectedRevision/serverAttemptId和规范化payload，在同一SQLite事务中做授权复核、旧纯转换、revision条件更新、receipt与event提交。旧eventId/JSON.stringify去重只作语义对照，不能替代跨重启/学习者隔离协议。练习/帮助/首答/人工复核/奖励应单独分阶段恢复特征，数学钱包与宠物耦合需要专门审查；不触及英语余额。本任务不实现上述写命令，不启用统一积分。
