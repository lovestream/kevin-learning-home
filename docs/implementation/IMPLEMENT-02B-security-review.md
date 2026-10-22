# IMPLEMENT-02B 安全评估

2026-10-23 R1补充：正常后台复核不再每5秒mask整页；保留最后已确认资料，正常请求有8秒硬截止，发现权限改变在元数据读取前立即mask；离线/失焦/已知到期仍同步遮蔽。前台操作优先中断背景，下一轮不重启未完请求，提交前期限与generation/AbortSignal屏障保留。最大轮询/请求可见性窗口、真实12秒与撤销/503/超时/迟到回应证据见[整改报告](IMPLEMENT-02B-review-R1.md)。下列首轮历史说明不再将后台happy-path视为阻塞清空操作。

2026-10-22。范围是已验收02A上新增的网页、只读科目契约和明确SPA路径，不涉及真实账号/记录、课程复制、NAS或生产入口。数据库仍为v2；未修改001/002、scrypt、kernel flock、WAL/FULL/FK、恢复撤销、会话期限与有界readiness。原55项用例保留，当前新增Node契约和真实浏览器测试。

## 权威与最小暴露

React只消费真实login/session/learner响应；没有isAdmin环境变量、localStorage身份、query role、假cookie或测试header注入。cookie由浏览器以credentials=same-origin收发；CSRF只留内存，POST使用当次验证后的token，Origin由浏览器产生。家长登录默认锁定、learnerIds=[]；UI还拒绝“锁定家长却返回ID”、孩子多ID/提升权限、名单越界/重复等矛盾DTO。孩子直接打开家长URL也无法读取父母数据。

锁定页面不渲染学习者ID/名字/grant名单；解锁后只读真实有效授权，选择时现查，不把当前ID写入URL/存储。报告仍是明确空态，不调用假成功的家长报告/批阅API。features.parent/learning/media/wallet仍false，已有禁用业务继续403；UI里的家长导航不意味着这些业务已开放。所有label/title按React文本渲染，不插入HTML。

退出/锁定/rotate会立即遮蔽，再等后端确认；401/403、离线/隐藏、网络异常和取消清空可渲染缓存。同步privacy属性在React提交前先隐藏，防止浏览器历史页和页面切换短暂出现旧资料。8秒请求截止、generation及AbortSignal检查阻止乱序/取消后的快照恢复权限；落地前再检查expiresAt和parentUnlockExpiresAt，专门测试元数据在解锁到期后才抵达时不能出现一帧旧资料。

家长解锁有效期间5秒轮询只做重新验证，不调用unlock；自动期限动作只收紧锁定。后台撤销由后端即时拒绝，前端以选择/切换/聚焦和5秒验证收敛，不宣称WebSocket式实时通知。浏览器若报告断网立即遮蔽；若未报告，下一次家长验证开始时遮蔽，8秒后给出连接反馈。孩子/锁定页面不无限轮询；后台重置、闲置到期在下一次服务器请求时拒绝，另有前端无操作/绝对到期遮蔽。时钟偏差可能让UI更早锁定，不能扩大服务器授权。

失败退出/锁定仅在当前页面保留待确认意图；恢复后先取新CSRF并完成意图，不先恢复旧资料。刷新/关闭不能被宣称为已退出，新文档仍要读取实际cookie状态并先收紧家长权限。02A本身允许有效会话跨普通Node重启延续，UI没有篡改这项底座契约。

## CSP、路由和依赖

既有CSP完全保留：同源script/style/connect，禁止object、base及iframe嵌入；不加unsafe-inline/unsafe-eval、第三方字体、追踪或跨域权限。自绘SVG为装饰，字体来自设备；CI只安装系统中文字体便于截图，不在网页发字体请求。

真实CSP监听发现Zod默认进行new Function可用性探测，即使捕获异常仍会产生违规事件。现在浏览器validation.ts在任何schema导入前设置jitless，使用普通校验；**没有放宽CSP或更换依赖**。真实UI测试收集securitypolicyviolation、脚本错误和外部请求，要求全部为0。[Zod官方说明](https://zod.dev/compile)及锁定版本源码说明该限制。

静态fallback仅共享的明确页面列表和受限subjectId路径，API/health优先处理、assets仍按真实文件和realpath边界处理。目录穿越、NUL、未知路径、缺失asset及API覆盖负例有真实HTTP验证。公开subject页面只说明可用性，不含学习者或课程数据。没有复制旧站、iframe、旧私有API调用或NAS地址。

## 凭据、证据与测试隔离

所有账户由测试进程随机产生，只写专用临时合成SQLite；不读取旧学习库。密码提交前清空表单状态，不写URL/日志；错误映射只给稳定中文说明，不展示后端正文、堆栈或秘密。没有在线注册/重置/真实账号初始化。

浏览器证据只存静态case名、计数、HTTP路径及Origin/CSRF是否正确的布尔值；不存header值、Cookie、密码、csrf、单行慢哈希、HAR、trace或数据库。截图在输入凭据前或已清空后获取；故障诊断只输出首行且替换合成凭据/长token，诊断截图先清空所有input。正式审查图来自明确allowlist，失败记录单独保留。

13条浏览器场景使用编译后的React与真实Node AuthService/SQLite，正向认证没有mock。负例包括实际错密码401、格式422、限频429、隔离库auth_controls故障503、剥离CSRF后真实后端403；离线、丢包、延迟与坏registry是明确的传输/模块故障注入，不负责授予角色。Node/浏览器时钟只在test fixture控制，没有正式HTTP调时/授予parent接口。每个fixture及浏览器context finally清理，正式镜像额外断言tests/auth和tests/shell均不存在。

XSS/宿主失陷仍在可信设备边界之外，HttpOnly不能阻止恶意同源代码代发操作；本轮不声称已解决生产TLS、加密备份或家庭恢复托管。只有合成证据可以公开，未来真实checkpoint含慢哈希和关系必须私有并另做加密验收。实体Safari/iPad、DS918+ 02B、真实TLS反代与账号均NOT_RUN，旧Linux4.4/Node24支持风险保留。
