# IMPLEMENT-02B R1 整改报告

2026-10-23。直接继续原`codex/implement-02b-shell` / [Draft PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)，整改前HEAD `147a3143dd5dca09fcb8aa70fd4d6b083597a4ab`，main仍为`f2c42c2475d0ae85c1688b13e437bc4332d12315`。审查原文来自`chatgpt/klh-implement-02b-review-r1@13326112698137527f392491541c82259912ee76`，blob `641768101d13a78a11b74e3df19d74faa5d9be3d`，原字节归档于[任务书](../reviews/KLH-IMPLEMENT-02B-R1-REVIEW.md)。

## R1-01：后台复核保持页面在位

原先5秒轮询调用普通sync，先清空Identity、进入checking并卸载页面。现在定时器只调用独立`revalidateInBackground()`：正常复核开始时不修改已确认状态、busy、privacy或焦点；成功后提交新的真实session/learner DTO。主动登录、解锁、选择、切页、锁定、退出与恢复确认仍使用阻塞式流程。

背景请求沿用同一generation、AbortController、当前CSRF与提交前期限检查。单个请求未完成时下一次轮询跳过，不能每5秒重启而永远到不了8秒截止；主动操作可立即中断背景请求。后台请求不能抢占正在进行的主动操作。定时器依赖实际期限/角色等标量，正常DTO对象更新不重置5秒间隔或解锁到期计时。

发现actor/role/grant/锁定状态或提升期限改变时，在读取下一份learner元数据前同步mask并清空可渲染身份，再按真实响应收紧范围。401、403、503、格式异常、断网、隐藏/失焦、取消、超时和乱序响应仍fail-closed。超时回调本身会同步遮蔽并增加generation，即使网络迟到也不能恢复旧私有信息。原本5分钟本地期限与服务端grant检查保持，不自动解锁、不延长期限、不持久化身份。

**显示边界**：正常背景请求期间保留上次已确认的资料，以避免每5秒闪烁。服务器撤销对实际请求立即生效，页面不是实时推送：空闲时最多等待下一次5秒复核及有界8秒请求；一旦收到变化/错误立即隐藏，本地已知到期、离线/失焦不等待请求。选择学习者或导航依旧重新验证，不凭旧列表授权。与每次遮蔽名字相比，本轮选择有界的已确认快照，安全边界由后端、期限与竞态屏障共同维持。

## R1-02：稳定React组件身份

`Link`、`SubjectLinks`、`Empty`提取至模块级，路由、catalog、加载回调经props传递。传入回调对象更新可以触发正常render，但不再产生新组件类型；不需要靠memo维持节点。App中的页面分支明确命名为普通`render*`函数并直接调用，没有在render内创建JSX组件类型。实际导航仍将焦点移交main，主动切换允许重建内容。

## 测试与实际状态

原60项Node及13条界面案例全部保留；新增5条，完整验证器必须收到未过滤的18条报告。原3视口、390/768/1280/1440布局、CSP、CSRF、锁定/撤销、Docker/Compose回归保留。新增：

| 场景 | 实际验证 |
| --- | --- |
| r1-parent-continuous-two-polls | 真实墙钟12秒，至少两次真实session/learners 200；连续MutationObserver检查无gate/pending/privacy闪烁，导航链接/选择按钮保持同一DOM与焦点；提升期限不变，最后Enter导航与main焦点 |
| r1-config-refresh-stable-link | 延迟真实config响应，Shift+Tab聚焦侧栏；配置落地引发App更新后仍是同一节点/焦点，Enter可导航 |
| r1-background-revoke-503-offline | 真实revoke，在元数据响应仍受控延迟时已隐藏旧资料；实际SQLite权限控制故障503及断网/恢复 |
| r1-background-timeout-and-action-race | 延迟真实session响应；8秒超时隐藏，下一轮不重启请求；主动lock胜过迟到背景响应 |
| r1-background-expiry-and-reset | 后端合成时钟使提升过期，由后台复核发现；真实credential reset使下一轮401并清掉界面 |

只有故障/延迟与后端合成时钟受控，正向登录、session、grant、cookie、CSRF均使用编译React→Node AuthService→SQLite。12秒持续场景不用快进时钟、不mock认证；其他期限负例使用Playwright时钟。只补一幅R1焦点截图；既有14幅与失败历史不覆盖。证据见[索引](evidence/02b-r1/README.md)。

首次新增连续测试在修复前失败（基线147a314、dirty工作区），历史JSON保留。初次修复后的5场景4条通过；连续场景使用正向Tab绕出文档，真实blur保护隐藏页面，随后找不到导航；改为在文档内Shift+Tab到目标，不删除blur保护，连续场景定向通过。完整本地验证已通过：Node24.15.0/macOS arm64，60项Node、18项UI、原3视口；连续场景真实墙钟12秒且至少两次复核。工作区dirty证据如实记录原HEAD，精确提交由CI验证。实现提交`f940fc1943180e7b518640a16d1ed600b335bd42`的[完整PR CI39874571245](https://github.com/lovestream/kevin-learning-home/actions/runs/39874571245)已成功；artifact为同SHA、clean工作区，完整60/18/3、Docker与Compose通过。CI持续场景真实12068ms、两轮自动复核、稳定DOM/焦点及期限不变。见[CI归档](evidence/02b-r1/ci/README.md)，最终HEAD及push/PR永久链接以PR7正文核对，不能拿父提交绿灯代替。

## 保留范围与停止线

只调整前端身份控制、组件声明和专项测试/完整验证计数；未改AuthService、SQLite v1/v2、scrypt、flock、生产Origin/Cookie/CSP、Docker权限或基础镜像。旧数学/英语不改、不调用内部API，不迁入课程、真实账户/记录、积分或蛋仔。本轮不连接NAS、不部署生产；实体Safari/iPad、NAS02B和生产HTTPS仍NOT_RUN。

最终同一PR的精确HEAD双事件完整CI通过后暂停，等待ChatGPT重新审查；保持Draft、不合并、不进入下一阶段。

本地完整初版计数字段在随后主动导航后才保存，因此总数含一次主动确认；至少两次自动复核的断言本来就在导航前执行。现将归档计数也固定在导航前，[定向复测](evidence/02b-r1/local/continuity-followup.json)记录两次自动复核、真实12秒通过；最终完整CI采用该计数修正。

## R1验收归档状态

| 项目 | 结果与证据 |
| --- | --- |
| R1-01 正常背景连续操作 | PASS_LOCAL + PASS_CI；真实12秒/两轮、无loading gate/遮蔽/DOM卸载，期限不变 |
| R1-01 失效与竞态 | PASS_LOCAL + PASS_CI；实际撤销/503/离线/重置，过期、8秒截止、前台锁定/迟到回应 |
| R1-02 组件/键盘 | PASS_LOCAL + PASS_CI；模块级组件，真实config/复核更新前后同一导航节点与焦点，Enter/main焦点 |
| 原回归 | PASS_LOCAL + PASS_CI；原60 Node和13 UI保留，合计60/18/3，原四种视口与全部安全断言 |
| Docker/Compose | PASS_CI；正式非root/readonly、flock/SIGKILL、自动重启计数1、auth恢复、媒体/哈希及1.28.5解析 |
| 最终归档HEAD | 准确SHA及push/PR完整CI以PR7正文核对；实现绿灯不替代最终HEAD |
| NAS/真实数据/生产 | NOT_RUN；不在本轮范围，未创建服务或真实身份 |
