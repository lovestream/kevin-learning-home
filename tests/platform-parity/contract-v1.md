# KLH platform parity contract v1 (frozen synthetic benchmark)

固定日期2026-10-13。来源任务分支SHA `086139adddcf3027a8ba4d128e9ac8ea86d92ccb`。本契约不替换Phase0正式接口，只约束两条隔离原型；任何断言改变必须版本化并重跑双方。

## 来源与业务语义

数学来源 `8e9115442b3978eee0d4821750ce04f47954bd26`，完整pilot-store及18个依赖文件逐字节归档；执行模块只提取原函数/闭包的精确源码片段，排除不相关的文件系统内容加载，保留原判分/宠物/调度依赖；真正调用selfCheckTask/revealHelp/submitTask/validateTask。冻结的合成choice题支持首答、提示、自查、最终提交；不冒充全部数学课程迁移。英语来源 `d0b42a8872a7e87433b96770519203630223b6f2`，原函数文本提取及constants冻结，复用normalizeAnswer/spellingAnswersFor/damerauDistanceOne/nextReviewSchedule。适配的HTTP与attempt流程是新代码，不声称完整DOM流程保真；复习日期的days分支依赖运行时本地时区，Node固定Asia/Shanghai，Workers实际远端时区/DST另验。

原数学仓库当前HEAD `e3b6344eba35d336640d9d9556380aa771cb5fe1` 与冻结来源不同，不能混用。未读取旧数据/凭证；共享源码与测试只包含公开源码及合成输入。expected输出为fixture字面量，不能以运行时计算出的结果代替期望。

## API与不可变约束

`POST /api/session`仅在显式local/ci实验环境接受合成账号密码；创建随机不透明持久会话，cookie HttpOnly/SameSite=Strict，生产部署禁用这个夹具入口。`GET /api/session`恢复会话并给CSRF。写入要求配置固定Origin、cookie/服务端角色、CSRF及JSON；不信任role/X-Forwarded身份头。

`GET /api/v1/learners/:learner/subjects/:subject/state`返回revision+完整分片复原状态。`POST .../commands`只接受schema-v1中字段；Idempotency-Key必须等于commandId。客户端correct/coins/trustLevel/usedHint/未知字段一律400。contentVersion固定；学生只能操作自己learner，父母scope用于review/restore/upload/content publish。过期/无效会话401，越权403，SQL不可达503。

作答attemptId由服务端登记签发，未签发/跨科目ID拒绝。数学action依次math.first→可选math.help→math.evidence→math.submit；首答由原引擎持久记录，订正/提示后正确不是独立首答。英语english.answer记录原始首答及近似辅助，不把订正正确当独立首答。每条命令成功后科目revision增加1。server-verified标记只针对这些新合成请求，不升级任何历史来源。

receipt唯一(learner,commandId)，hash覆盖subject、全部业务body；同key+同body返回同result/committedRevision并另给currentRevision、duplicate=true；同key异body409 IDEMPOTENCY_CONFLICT。不同key同expectedRevision竞争只成功一个，另一409 STALE_REVISION。收据、状态分片、事件及synthetic reward同一事务，任何SQL失败全部回滚。每个逻辑(learner,subject,contentVersion,taskId)最多一份synthetic奖，换attemptId不能再奖，不存在中央钱包/历史兑换。

媒体assetId+version+sha256+bytes+mime+visibility+providerAlias；课程只引用assetId/version。公开仅合成public-licensed，private-learner必须session+learner匹配、no-store，不以URL秘密作权限。对象由独立local mock服务签名直传，非业务API大文件缓冲；本地协议不冒充R2/S3远端实现。

## 固定验收与公平性

P01原Math判分/首答；P02原English拼写/近似/调度；P03事件及revision；P04同命令100并发；P05异body409；P06旧revision竞争及显式重试；P07内部SQL失败全回滚；P08两科来源奖去重隔离；P09学生/跨learner/CSRF/Origin/伪造头反例；P10断网草稿及跨浏览器会话；P11版本化动态内容/媒体权限/provider切换；P12重启+空环境DB/对象恢复；P13桌面及iPad viewport真实操作；P14三轮资源/HTTP性能；P15增长设计演练；P16进程故障及草稿保护。每项报告LOCAL/CI/REMOTE/NAS分别列出，未执行不得PASS。

S=1 learner/2设备/2学科/100事件/500媒资引用；M=3 learners/10学科/100000事件/100000媒资引用；L=十年15学科/100万～1000万事件/10TB对象容量模型，禁止把模型当实测。固定seed20261013、每轮恢复同基准、预热20、每轮200 HTTP采样、并发2/50/100、各3轮；负载测试和正确性测试分开。同一Mac/串行平台测试，不同CI runner不作严谨跨平台排名。百分位nearest-rank，失败单列，http elapsed不等于点击体验/云CPU。

合成媒体32KiB/1MiB/5MiB，只有少量对象，500/100000为引用数。大状态超过2MB拆成有序64Ki UTF16字符分片（最多256KiB UTF8），各chunk hash+全体hash逐字段复原，禁止截断。D1远端10ms CPU、复制读取、真实R2、NAS服务/UPS/长期稳定性不在本地证据中。

源与fixture摘要见source-lock.json、fixture-lock.json。云远端BLOCKED_APPROVAL；NAS因用户安排延后NOT_RUN，既有PR1A权限结论为BLOCKED_PERMISSION，非当前新预检。没有自动部署/订阅/提权/合并。
