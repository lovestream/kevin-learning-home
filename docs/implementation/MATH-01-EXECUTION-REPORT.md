# MATH-01：首课可视化只读接入执行报告

2026-10-24。[Issue #11](https://github.com/lovestream/kevin-learning-home/issues/11) 授权的单课本地/CI实现。基线 main `a40d97495d0065cd4f9ce2e8706372de122f2179`；开发分支 `codex/math-01-readonly-lesson`。本文件随代码归档；精确最终 HEAD、push/PR 双事件 CI URL 和下载核验见本 Draft PR 描述，避免在提交内容中引用它自身的 SHA。

## 交付行为与默认配置

- 课程页面 `/subjects/math/lessons/G3-U01-B01`；唯一新业务接口 `GET /api/v1/learners/{learnerId}/subjects/math/lessons/G3-U01-B01`。启用 `KLH_MATH_READONLY=1` 且正式 auth 已配置时，数学注册为 `readonly-preview`。默认关闭；非法开关拒绝启动，英语/钱包保持原开关。
- 首课 `G3-U01-B01`，contentVersion `2026-10-07.2`，editorialRevision `2026-10-09.4`，**draft**。六步顺序：真实问题、先猜一猜、亲手实验、说出发现、写成数学、自己验证。第六步只有“练习尚未接入”，无提交、成绩、完成或掌握状态。
- 原教学公开文本、玩具盒尺寸 `[2.4,1.5,1.2]`、相机和三面投影保留。猜想、相机、最多六张临时照片、步骤仅保存在组件内存，刷新/离开/身份失效即丢弃；没有进度接口或后台保存。
- 只有本课的白名单 JSON 存于服务端 `packages/subjects/math/public-lesson.json`。客户端 bundle 不包含 authored 首课标题/题干、70课作者源、taskSets、答案或旧网站服务端代码。教学可视化组件固有的标记/方向/说明文字仍在编译 JS 中；它们不是练习题库。

## 来源、等价性与许可

固定 `lovestream/math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279`。仅读取批准的9个 tracked author/code blob，不运行原 build/pretest、不加载旧模块、数据库、备份、inbox、.env 或私有词包。英语 blob 读取0，NAS连接0。

- [9项原始blob复核](evidence/math-01/source-verification.json)：每项 commit/path/Git blob/SHA256；原 `lessons.json` 完整 SHA256 `0a1c23b8904eb328a029a1d4dec0fda480defb1596325121b9cb7cb19ff70afa`。
- [来源→8个目标文件/目标hash/所取符号/适配理由](evidence/math-01/origins.json)：两份纯几何合并为一份；两份所需 CSS 归于 math 根；没有整文件复制133节点或全部9源文件。原 auth/store/API/PIN/useHandsOn、fold/hidden/其它教具、其它课程和素材均未接入。
- [公开字段逐项等价](evidence/math-01/public-projection-check.json)：用生产投影器对原冻结单课投影，与落地 JSON canonical 全量比较。未知原字段从未加入投影，不是 spread 后删除。手工导入器与生产投影器是分别实现的显式 picks。
- [原仓前后边界](evidence/math-01/source-boundaries.json)：两仓 HEAD/status 指纹一致；英语原有未跟踪私有词包仅被 Git status 元数据计入指纹，未打开。两个旧站继续独立，未变更任何 tracked/untracked 文件。
- [几何数值fixture](../../tests/math01/geometry-golden.json)：从冻结纯几何必要声明在隔离 VM 中计算四组合成视角，不执行旧模块或读取其它文件；新端数值逐项比较到1e-9。颜色、面标记和正/右/上投影矩形保持原关系。
- 原来源根无统一 LICENSE；本次是仓库所有者明确授权的必要片段私有复用，不推断公开再分发许可。无新增第三方素材或依赖；复用 KLH 冻结 React/ReactDOM MIT，已有其它依赖遵循原 notice。无教材截图、游戏素材、音频/PDF/打印模板/远程字体。

`scripts/math01/extract.mjs` 是人工本机导入工具；`verify-source.ts` 是显式本机复核工具。两者不在 CI 执行，也不在最终容器中。CI 的 `seal.ts` **只检查**已提交的9来源与目标hash；只有显式 `--seal` 才刷新目标映射，构建不自动修复篡改。

## 接口与内容完整性

沿用正式 Cookie 会话、精确 Host/Origin、same-site、CSRF 和父母解锁/实时 grant；没有测试身份头、客户端身份代入或旧 PIN。孩子只能读绑定 learner；家长必须二次解锁且有实时授权。鉴权和范围检查先于 lesson 存在性判断；未登录/过期/撤销401，家长未解锁403 PARENT_ACCESS_REQUIRED，跨孩子/撤销grant403 LEARNER_FORBIDDEN，其它课404。新读接口非 GET（含 HEAD）405；关闭flag为既有403 FEATURE_DISABLED；query/编码斜杠/穿越拒绝。

公开 DTO 的所有对象均 strict schema，完整白名单见 `packages/contracts/math-readonly.ts`。源投影显式逐字段选择。合成 fixture 注入深层 `expectedEvidence`/`referenceAnswer`/`expectedExplanation`/taskSets/solution 等哨兵，验证不会进入 DTO；公开对象未知key、版本/大小越界直接失败，不删掉后继续展示。浏览器还用篡改的真实 HTTP 响应测试 schema 和 public hash，明确属于**故障注入**，不是授权模拟。

构建检查公开 canonical hash，枚举**实际产出的 JS/CSS 文件**及大小/hash、计算排序清单摘要，输出 `math-integrity.json`，将摘要置入构建 HTML meta。服务端每次读取核对 JSON/schema/public hash、固定8来源摘要、文件路径/普通文件/非符号链接/大小/hash、manifest 与 HTML 摘要；失败503 CONTENT_UNAVAILABLE，不读 latest、不回退旧缓存。浏览器核对 learner、schema、当前 HTML 构建摘要及 WebCrypto public hash后才显示。构建证据见 CI artifact `math-01/build-integrity.json` 和归档的同名文件。

边界：原完整70课 blob 的 SHA 在**本机来源导入**时核验；运行时只有已审常量和单课投影，不把整源放进镜像重新读取。自托管文件 hash 是版本/损坏检测，不宣称可防止攻击者同时替换整个应用与信任锚。每次轮询约检查当前4份 JS/CSS，不改 readiness、不运行数据库完整性扫描。

## 身份与界面安全

新增深课程路由排除于原公开科目分类分支，在身份门后处理。未登录只显示通用登录门，不加载课程 lazy chunk 或 authored 文本。匿名数学分类入口只有通用名称；最终课程 DTO 受会话保护。家长选中的 learner、解锁时间与 actor 构成组件 key，正常后台复核不重建课堂；切换 learner、锁定、失焦、授权撤销、会话/网络异常清空课程及本页记忆。原02B fail-closed遮蔽、两轮复核逻辑保留。

每5秒复核课程权限；同一时刻仅一个请求、8秒超时，卸载 abort，错误立即清空DTO、步骤、猜想及照片并停止轮询，401/403才要求全局身份复核。普通成功复核保留原 DTO 对象、DOM、步骤、相机和键盘焦点，不转整页 loading。未知/损坏 DTO 不显示任何哨兵。

测试用两孩子、两家长都通过正式 HTTP 登录。原 AuthService 尚无第二家长创建 API；**仅合成 fixture** 通过真实 scrypt password record 在隔离 SQLite 增加第二 actor，再调用现有 provision/grant。未新增生产家长创建接口、绕过密码、testContext、虚构身份cookie或修改真实账户。

## 可视化与任务书勘误

保留原几何/lighting、相机位置图、三个标记与投影；新增 CSS 全部 `.math-lesson` 作用域。SolidView 的局部 SVG ID 用 React useId，支持多实例；指针归属、pointer cancel/lost capture、箭头、Tab/Enter、可见焦点、reduced-motion 与动画卸载清理均验收。没有 raw SVG/HTML/MIME开放、innerHTML、iframe、data URL、外部请求或本地持久化；CSP完全保持 main。

两处明确勘误/适配：

1. MATH-00 认为 BoxCamera observe 无需处理 inline style；实读发现三个 `<span style={{color:...}}>`。本次换为作用域色彩类，保留原色/文案，不放宽 CSP。历史审计文件未重写。
2. 真实快速连续箭头测试暴露：动画中间值可能覆盖前一按方向。渲染仍使用原 motion hook，控制输入单独使用最新目标方向，避免丢键；几何算法不变，加入快速连续两键断言。

原科目分类页面公开与新深路由保护的差别、第二家长 fixture 的离线创建限制已在上文说明，均采用最小调整，不重构全局 auth。

## A01–A12 验收矩阵

| ID | 交付与证据 |
|---|---|
| A01 | 原仓 HEAD/status 前后不变、9来源/8目标hash、真实数据零读、NAS零连接；source-boundaries / source-verification / origins。 |
| A02 | 精确首课元数据、逐字段公开投影比对、4角度几何fixture；源/public/build核验、损坏/缺文件/清单缺项/HTML不符503，真实HTTP无fallback。 |
| A03 | 两孩子、HTTPS Secure/HttpOnly/Strict真实cookie、401/跨范围403/query拒绝/标题不泄漏；Node HTTP与匿名深链浏览器测试。 |
| A04 | 两家长、解锁前IDs空、解锁/grant/另家长/撤销/5分钟到期/主动锁定/失焦/选人切换；浏览器12秒两轮auth+lesson复核焦点稳定，失败清空。 |
| A05 | strict深层白名单与合成答案哨兵；实际bundle不含题库/authored首课题干；真实响应schema/hash故障注入不渲染，原始作者库不静态提供。 |
| A06 | HEAD/POST/PUT/PATCH/DELETE405；旧数学/导入/奖励等API403。所有操作前后11学习表count/hash一致，认证last_seen/audit/session必要写入按原规则发生。 |
| A07 | 冻结纯算法4视角、三投影96×60/48×60/96×48与标记、唯一SVG ID/连续箭头/pointer取消。 |
| A08 | 编译React→Node→SQLite真实390×900/768×1024/1280×900；登录、六步、照片、刷新重置、退出、无溢出/小触控目标/脚本异常；9张课堂+1张家长稳定截图。 |
| A09 | 键盘登录/步骤/方向/照片/上下步、舞台焦点、正常动画与reduced-motion、卸载取消RAF；浏览器自动化。 |
| A10 | 实际CSP零违例，外部请求0，本地/sessionStorage/IndexedDB/CacheStorage/ServiceWorker0；math前后家长按钮computed style相等；原Host/Origin/CSRF/Cookie回归保留。 |
| A11 | 原60 Node、18 UI、3旧视口及Docker/Compose完整验证；新增12 Node、9浏览器独立核对，另增flag-on真实生产镜像/恢复/隔离检查。最终HEAD双事件CI与artifact核验见PR。 |
| A12 | 本报告、逐文件来源/许可、fixture、截图、失败与修复、handoff及Draft PR归档；未部署NAS、不合并、不进入MATH-02/03。 |

上述自动化项目的最终结果由 CI artifact 和 PR 精确 HEAD 核验记录决定；不能用本机目标测试代替整套 CI。实体 Mac/手机/iPad/Android 的**数学课程**人工验收全部 `NOT_RUN`，旧02B登录反馈不计入数学验收。当前NAS试用仍是原02B，不包含本次数学代码。

## 测试与复现

```sh
npm ci
npx playwright install chromium
npm run verify
npm run test:container  # Linux amd64 CI；不会访问NAS
```

`verify` 保留原全部验证，另产出 `.evidence/math-01/unit.xml`（12）、`browser.json`（9，无filter）、编译资产清单。容器使用原固定 Node24.15.0/Linux-amd64/fs-ext 镜像流程，重复原 auth 回归并额外开启flag：真实家长登录/解锁/课程200、默认/锁定拒绝、所有写接口关闭、restart/recreate后可读、备份恢复先撤销会话再登录解锁方可读，11表不变，非root/只读rootfs，源码导入工具/测试harness不在最终镜像。TLS真实Cookie用本机HTTPS fixture验证；CI容器内回环HTTP仍模拟原有TLS终结，不宣称生产HTTPS已部署。

本机完整 `npm run verify` 最终 PASS_LOCAL（候选工作区，worktreeDirty=true；最终提交以CI精确SHA为准），原60/18/3、新增12/9全部成功；最后的损坏内容fixture另加有效基线断言并定向复核通过。

本机证据：[汇总](evidence/math-01/local/verification.json)、[数学浏览器9场景](evidence/math-01/local/browser.json)、[12项Node JUnit](evidence/math-01/local/unit.xml)。截图：[390相机/临时照片](evidence/math-01/local/screenshots/experiment-390.png)、[768课堂](evidence/math-01/local/screenshots/story-768.png)、[1280课堂](evidence/math-01/local/screenshots/story-1280.png)、[两轮复核后家长页](evidence/math-01/local/screenshots/parent-stable-after-two-polls.png)。CI下载后可用 `python3 scripts/math01/check-ci.py ARTIFACT_DIR HEAD_SHA` 独立重验原60/18/3、Docker/Compose与新增12/9及所有hash/计数证据。

本机 Node24.15.0/npm11.12.1，macOS arm64；Linux amd64、Docker/Compose1.28.5与完整CI环境由artifact记录。截图不含输入口令/cookie；无HAR/trace/数据库/凭据进入证据。

### 原始失败与处理记录

| 阶段 | 可复核的错误/症状 | 处理 |
|---|---|---|
| 损坏内容fixture复核 | macOS临时路径含系统symlink可能让负例提前拒绝 | 先realpath规范化临时根、断言有效内容200，再逐项损坏，避免假阳性；生产容器/app路径不变。 |
| 来源工具 | execFileSync 默认1MiB输出上限 ENOBUFS | 批准的作者源使用16MiB有界buffer，只输出摘要，不运行旧程序。 |
| 来源工具 | TypeScript7无 createSourceFile 编译器API | 选取冻结顶层必要声明的明确范围，核对来源blob与几何fixture。 |
| HTTP测试 | HEAD响应无body导致fixture JSON/null访问错误 | fixture接受空body并安全读取csrfToken；真实405未改变。 |
| 浏览器定位 | 分类卡含状态，名称不等于“数学”；步骤按钮可访问名包含序号分隔 | 定位真实href/六步导航索引，不改页面语义规避。 |
| 浏览器键盘 | 连续Right/Up偶发丢失Right视角 | 分离控制目标方向和动画绘制值，增加连续键回归。 |
| 浏览器指针 | 原始完整回归出现移动端取消后旧/新渲染读数竞态 | 先等待已知移动方向落到DOM，再取消、再验证后续移动不再旋转；不把待渲染值当取消失败。 |
| 浏览器fixture | 假定UUID排序等于孩子顺序、整页跳转丢失家长内存选择、summary按button定位 | 按合成标签选人并断言目标learner；保持SPA选人流程，定位原summary，不改旧auth。 |
| 浏览器焦点 | 测试抢在步骤RAF焦点完成前设置焦点；Tab绕过浏览器chrome触发真实遮蔽 | 等待步骤焦点到位，按DOM前后方向Tab/Shift+Tab，在文档内验证可见焦点，不关闭fail-closed。 |
| 代码复核 | 单独课堂网络错误只清DTO可能保留临时步骤/照片 | 同时重置组件内存，并新增失败→重试回第一步/无照片回归。 |
| 浏览器退出 | 导航与未完成logout请求竞态影响证据headers收集 | 等待真实logout响应及匿名身份门后再打开深链，避免把未完成退出判成功。 |

历史 `math-00/check.json` 的 `courseFilesCopied=0` 表示 MATH-00 冻结审计阶段，不是本阶段无复制的声明；本阶段单课公开投影和必要视觉片段见 origins。现有 Compose 默认不透传新flag；未来NAS如需启用，须在另获授权后审查配置覆盖，本轮只在Linux隔离Docker用显式环境变量测试。

中途定向失败不当作验收通过；最终完整无filter重跑结果单独归档。无凭据或旧源大段输出归档。

## 停止线与后续审查

仅提交独立 Draft PR，等待 ChatGPT 对公开字段、片段适配、鉴权、图形及全部证据独立审查。不要合并/部署、自动关闭 Issue #11、迁移真实账户/历史、启用阅读保存/练习/钱包/蛋仔，或开始MATH-02。后续NAS课程试用需要单独部署授权及实体设备验收。
