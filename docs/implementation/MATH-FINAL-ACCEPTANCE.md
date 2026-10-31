# MATH-ONEPASS-FINAL · 数学整站交付验收

> **当前进度（2026-10-30 R3）**：用户已否定上一轮视觉，正在按原数学站风格修正全站显示。NAS暂保持e7b4302，待新提交完整CI成功再受控更新。下方为上一轮工程交付记录；不代表视觉获得用户认可。最新整改见 [MATH-VISUAL-R3](MATH-VISUAL-R3.md)。


**访问：[http://192.168.2.100:38444/](http://192.168.2.100:38444/)**。同一局域网直接打开，免登录、HTTP，无需Mac服务或证书。新版已经实际运行，不是本地演示。

Issue #23 在原 `codex/math-full-03-capabilities` / Draft PR #22 连续执行。PR18→21→22仍为堆叠Draft，不合并，不进入英语、正式身份/真实学习记录或积分蛋仔。此报告的完成范围是原站成熟的匿名数学教学体验，以及受正式闸门保护、仅在合成环境验证的私人机制。用户审美与实体设备验收不由自动测试替代。

## 发布与复审定位

|项目|实际结果|
|---|---|
|NAS运行源码|`e7b4302889da7b07fc081ae68447cba404a76ad3`|
|镜像|`sha256:6933c4d0689b2ab75ca8bde1b2c2cdf280102402ee647bfad151874c6aee322b`，linux/amd64|
|容器|`31abf393647d616fa4c9bee80e93b0daaa55892c592c942e8fbdbf2cbaee6c31`|
|专用目录|`/volume2/homes/admin/klh-math-preview-20261025-c6ae9e7f`，沿用本次owner与版本化发布工具|
|源码push完整CI|[40977114435](https://github.com/lovestream/kevin-learning-home/actions/runs/40977114435)，成功|
|源码PR完整CI|[40977118591](https://github.com/lovestream/kevin-learning-home/actions/runs/40977118591)，成功|
|最终归档HEAD|最终文档提交的精确HEAD与两套完整CI链接记录在[PR #22正文](https://github.com/lovestream/kevin-learning-home/pull/22)，仅在其均成功后交独立审查|
|源码与最终文档关系|后续只归档证据/文档，并加强五尺寸已完成反馈统计的测试；[276项输入](evidence/math-onepass/release-inputs.json)保持不变，不将文档HEAD冒充NAS运行SHA|

[交付回执](evidence/math-onepass/delivery.json) · [13组NAS验收](evidence/math-onepass/nas-suite.json) · [实际回退](evidence/math-onepass/rollback.json) · [源CI状态](evidence/math-onepass/source-ci.json) · [镜像校验](evidence/math-onepass/image.json)。

## 来源审计与原站—NAS完整差异

原数学main停在9月，不能作为最新来源。实际对照活跃Draft PR1固定 `8292de85b40d6b2b5fba0f8b2dca359f5b2f821d` 与原冻结 `a7c05aaa8d9c5eabae4f3453807f830da1cbf279`，核实19个运行文件变化、84份定向源码/任务/测试材料、10包30宗明确匿名示例。另对50旧关种子清单做了逐关去向核对。每份按Git blob及SHA256校验；没有机械导入2130文件、私密投稿箱或学习数据库。执行期间再次核实原PR1仍为同一SHA。

[164项逐控件对照](MATH-COMPLETE-PARITY-MATRIX.md)与[机器清单](evidence/math-onepass/source-to-target.json)区分108项NAS实测、49项隔离合成私有机制和7项明确排除；包含sourceGitRef/blob/SHA256、原路径/动作、目标路由、数据依赖和逐项证据。来源证据：[source-audit](evidence/math-onepass/source-audit.json)、[source-import](evidence/math-onepass/source-import.json)、[study-source](evidence/math-onepass/study-source.json)、[reading-source](evidence/math-onepass/reading-source.json)。

|原站入口/能力|新NAS的实际落点与变化|边界与验收|
|---|---|---|
|今天/学习地图|统一首页六条路径；按上下册→真实教材单元→知识点→课堂，而非平铺70卡|个性化下一课、继续未完成、到期和错题选择器复用在合成私有机制；匿名首页不假造私人推荐|
|教材与首课|17单元63教材课+7衔接，共70课；搜索、空态、相邻课和返回单元；保留原六步/3D等教具|64交互、6原静态声明；210课堂与30代表检查实测|
|CourseReader/课堂阅读|补回全部70份原完整文章、例题/步骤原因、对照、方法、口述、本页手记与打印|18选择+52解释检查真实前后端；文章与原图逐字段投影，来源hash留档|
|原849题五组五型|题目/图→不可变首答→自查→终答；分级帮助、错因、单位与等价；保留每题原ID|全部HTTP及三尺寸849目录/84完整作答；335解释题待人审，不给假掌握或积分|
|11组撤教具测验|保留原P01/P02/P07/P05/P08五题ID与首答/自查/终答，撤去图和直接提示|真实浏览器11组通过，不另编一套替代题|
|四至六年级54旧课/432题|每课专属“问题—模型—式—反查”与参数操作、原8题、完整主题阅读|54独立数学不变量、五尺寸270模型视图、54逐课看图；保留原旧课来源身份，不冒充新审定教材章节|
|17已审思维卡|原条件图、专属教具、撤销/重置、提示/支架、首答与证据自查、解释人审和12原变式/卡|43暂缓卡仍不公开；解释不自动判掌握|
|数学侦探V2|63宗=14旧匿名+30包内+3过程反例+16题族示例；10模板、18对照组、8题族×256参数|L1判断、L2首错、L3变式/正确对照/逆向、L4独立首答/真实反查；与原judge/evidence/repair/verify四步骤分开|
|原14模拟案|保留旧匿名兼容接口和路由，主导航统一进入新的V2|旧14兼容回归仍保留，不把14误称整个新侦探|
|方法工具箱|28项都有条件、原理、例子、反例和已安装课堂链接；6原完整指南保留，22补成教学适配|22明确标“本次教学适配”，不是伪称原站已有完整已审指南；28真实浏览器检查|
|自由复习/逆向索引|244原复习题、11原题精确深链、原折纸打印入口；按教材分组|不生成虚假跨日到期任务；原成熟入口实际可用|
|错题/阅读记录|本页阅读标记、笔记与首答/订正；错题回到原题且保留第一回答|同一文档SPA导航保留，刷新清空；不把订正算成独立掌握|
|私人历史/家长/延迟复测|共享规则+隔离SQLite/WAL/flock仓库，现有身份/实时授权/CSRF/家长二次解锁；事务、幂等、并发与逻辑恢复|只接受test+loopback合成服务，正式main不注入；匿名NAS无家长审核/私人历史/时钟/恢复API|
|原奖励、钱包、蛋仔/PIN|保留清楚的未来接口边界，去掉数学核心对奖励副作用的耦合|paid/completionPaid固定0；不激活正式身份、不合并两钱包、不搬真实资料|

侦探每题族256个可生成参数，其中240训练、16保留；正确对照与过程不足都必须真实判断。公开ID为不带答案含义的opaque ID，8个原教师标题的答案暗示改成中性公开标题，原版本/规则留在服务端。排序题复用原整列值并支持拖动/上下移，口述明确待家长核对。首答、实际反查算式/结果、帮助证据、统计分母、1/3/7/14延迟复测、401/403/409/幂等均有独立测试；匿名只体验本次流程。原普通复习1/3/7/21安排复用在合成私有机制，不与侦探周期混淆。

数学证据分层：[全部849原评分golden](evidence/math-full-02/golden.json)与[原449拓展golden](evidence/math-full-remainder/golden.json)验证行为一致；[独立编辑审计](evidence/math-onepass/849-math-audit.json)中84题可从题干/图独立推导，294题为解法内部一致性，不能说849题均已独立数学证明。54模型另做独立不变量；8×256侦探参数、错误反查、纯常量伪检验等另做规则测试。

## 工程与隐私

`packages/math-training` 提取复用原共享数学规则，`study.mjs`复用原学习选择器/阅读/首答自查/思维/家长复核等机制，接口由共享严格schema约束。隔离仓库只允许专用OS临时目录、排除软链接/外来文件，并以flock、WAL/FULL、事务化状态和事件回执保护；每日计划持久化、跨学习者隔离、SIGKILL恢复、同事件重试和scope一致的逻辑备份均实测。

NAS的PageTraining是有容量/TTL限制的匿名RAM能力：256位随机token，最多64页、约24MiB状态、30分钟TTL，离页释放；不设Cookie/localStorage/sessionStorage，不落学习库。LAN HTTP用getRandomValues，不依赖secure-context才有的randomUUID/subtle。父母审批/跨日复测等受限动作在匿名入口直接拒绝。镜像只带纯数学与作者题库，不带AuthService、正式server、SQLite仓库或native addon；零挂载、只读根、非root1024:100、256MiB、cpuset0、cap-drop ALL、no-new-privileges、unless-stopped，仅192.168.2.100:38444。

[旧项目只读核对](evidence/math-onepass/old-projects-readonly.json)确认数学HEAD8292de...及英语HEADd0b42a...和工作区状态hash前后一致；英语原有一个未跟踪条目未读取或改动。没有创建新worktree/项目根目录，没有修改旧站、DSM、Docker权限/daemon、证书或Tailscale。11受保护容器及旧合成/TLS文件hash不变；未读取或导入Kevin学习记录。

## 完整验收与实际性能

|检查|结果/证据|
|---|---|
|原基础回归|60 Node、18 UI、12数学Node、9数学浏览器，精确源码CI全部通过；[foundation-ci](evidence/math-onepass/foundation-ci.json)|
|新机制|167 Node，JUnit零失败；授权/隐私/反例/恢复/模型独立测试；[node-ci.xml](evidence/math-onepass/node-ci.xml)|
|Docker/Compose|原Compose1.28.5解析、容器writer竞争、SIGKILL/重建、自动重启、备份恢复完整保留；[容器摘要](evidence/math-onepass/container-ci-summary.json)、[恢复摘要](evidence/math-onepass/recovery-ci-summary.json)、源码两套CI|
|NAS全课程|70×3=210、代表30、教材导航；[classrooms](evidence/math-onepass/classrooms-nas.json)、[checkpoint](evidence/math-onepass/checkpoint-nas.json)、[navigation](evidence/math-onepass/navigation-nas.json)|
|NAS练习|849×3目录、84完整流程、原255拓展流程，全部通过；[practice](evidence/math-onepass/practice-nas.json)、[compatibility](evidence/math-onepass/compatibility-nas.json)|
|NAS业务HTTP|1298题完整首答/自查/终答，共352人审解释题；另保留849及449+14旧兼容HTTP；[business](evidence/math-onepass/business-http.json)|
|NAS侦探|全部63宗分阶段表单、18组对照/迁移、真实服务提交后丢响应并以原事件重试，均通过；[cases](evidence/math-onepass/cases-browser.json)|
|NAS五尺寸|1440/1280/768/390/360；270模型视图、124完整文章、28方法、11撤教具检查、错题订正/本页记录、移动菜单键盘和焦点、CSP/零浏览器持久化均通过；[experience](evidence/math-onepass/experience-results.json)、[models](evidence/math-onepass/models-results.json)|
|已完成反馈统计|五尺寸等待实际后台统计返回后核对首答0/1、自查1/1、自主纠错1/1、迁移无样本，再截图；[training](evidence/math-onepass/training-results.json)|
|教案打印|六份真实PDF，共20页，Poppler核对全部必需正文/折叠例题/原因/对照/选项，关闭状态恢复；[print](evidence/math-onepass/print-nas.json)、[六份PDF](evidence/math-onepass/prints)|
|实际回退|新e7→原52e7814→新e7，同一HTTP入口实际访问通过；原容器/镜像保留；[rollback](evidence/math-onepass/rollback.json)|
|资源与原生浏览器|19密封构建资源一致，276项构建/验证输入不变；普通Mac Chrome实际打开、首课拍照与故障案卷焦点复核；[seal](evidence/math-onepass/static-seal.json)、[native](evidence/math-onepass/native-chrome.json)|

NAS实机DS918+，DSM7.1.1-42962 Update6，Linux4.4.180+，Docker20.10.3，Node24.15.0/x64。两独立测试客户端下：1298题业务管道57.68秒；210课堂132.56秒；84练习流程159.23秒；255拓展流程444.99秒；270模型视图295.79秒。原兼容评分API：849题p50/p95为7.29/14.23ms，拓展为6.06/8.59ms。回退重启后的空闲瞬时内存64.65MiB/256MiB；这是测量点，不是峰值或长期容量承诺。详见[nas-suite](evidence/math-onepass/nas-suite.json)、[环境](evidence/math-onepass/nas-environment.json)、[stats](evidence/math-onepass/runtime-stats.json)。

## 三轮视觉与自修记录

[设计系统](MATH-ONEPASS-DESIGN-SYSTEM.md)和[完整视觉复盘](VISUAL-REVIEW.md)区分R0旧NAS、R1实装/逐课模型与打印、R2最终NAS。已归档[124张当前NAS截图](evidence/math-onepass/screenshots.json)、54份原模型观察及6份实际教案PDF；不是只检查首页或只跑DOM。全页布局总览与原分辨率关键区域分开，长文不冒称逐字二次编辑。

内部发现并自修：原角课误用面积网格、分数标签遮挡、位值重叠、立方体开放薄片误觉、单位显示、教师标题暗示答案、排序表单错误、原选项ID不适合儿童阅读、移动页头/卡片密度、打印遗漏折叠例题和隐藏标题。首轮CI的异步对照测试与旧归档hash也已真实重测修正，保留全部断言。

254d44d的PDF CI失败经下载实际PDF确认是Poppler默认字体基线排序将Kevin移到中文段末；用内容流顺序提取后完整20项必需文字及六PDF通过，不删内容检查。

首个新NAS版本4fc8ad7的13组检查中12组通过，案卷标题焦点失败。真实诊断hasFocus=true、activeElement=body、新标题已出现：requestAnimationFrame先聚焦旧keyed节点，再被React替换。e7改为在DOM提交后按attempt.id聚焦，后台请求完成后仍保持；全部63案/18组在最新CI和NAS重测通过，普通Chrome对故障案卷也实际复核。保留[原失败诊断](evidence/math-onepass/focus-r2-failure.json)，不把失败试验标为完成。

最终截图还增强了等待统计稳定的断言，避免将反馈已经出现、统计请求尚未结束的中间帧当最终证据；五尺寸真实NAS重测通过，未再改运行代码。

## 明确排除与停止点

仅排除原43暂缓卡、168蓝图、被70课替代的旧三年级50重复课；真实身份/个人历史/跨日持久记录/正式家长审批启用、积分钱包蛋仔、英语及系统/网络配置变更。[50旧关逐关去向](evidence/math-onepass/grade3-legacy-supersession.json)记录原站hasCompleteGrade3隐藏规则与现有70课/思维卡/高年级专题的概念关联，不伪称原50关题目或年级逐一等价复制。其余成熟匿名数学能力已纳入本轮，不推给“后续补内容”。

335原练习解释及17思维解释需要人工核对，不认证自动掌握。54旧课与22新增教学适配保留来源与审核身份。实体手机/iPad：NEEDS_USER_ACTION；实体打印机未测试；用户最终审美判断与ChatGPT独立代码审查均未代做。

保持PR18/21/22 Draft、不合并，最终归档HEAD完整双CI成功后暂停，等待一次集中独立审查。不进入英语、正式数据或奖励阶段。
