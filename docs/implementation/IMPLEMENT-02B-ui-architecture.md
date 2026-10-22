# IMPLEMENT-02B 页面与状态设计

2026-10-23 R1补充：正常5秒后台复核现在保留已确认页面与焦点；只有主动操作/切页、发现权限变化或异常时清空/遮蔽。定时器不因DTO对象更新重置。组件Link/SubjectLinks/Empty在模块级定义，通过props传状态，页面render函数不作为内部JSX组件。实际边界与有界快照取舍见[整改报告](IMPLEMENT-02B-review-R1.md)。以下为首轮设计记录，R1处理优先适用。

2026-10-22；基线 main `f2c42c2475d0ae85c1688b13e437bc4332d12315`，已核对PR6合并及main CI 39765830063成功。任务分支 `chatgpt/klh-implement-02b-start@aaf8fe6936f780b94f6aa55b7bbf3c1768bc52a9`，原任务blob `f2fd44b8c5b8cde0fd7caa0d575119acfb2e2728`。本轮只实现外壳，原站独立、不复制课程、不导入真实资料。

## 设计计划与取舍

沿用既有“蓝色学习手册”，不是展示成绩的仪表盘。纸白 #ffffff、晨蓝 #f4f8fc、墨蓝 #17384c、书签蓝 #2f6985、叶绿 #3d745e、暖黄 #e8bd67。字体采用本机 Avenir Next / PingFang SC / Microsoft YaHei；标题32～44px、正文16px、说明14px；无外部字体或追踪。左对齐阅读，桌面用窄导航栏加宽阅读区，手机导航换行，触控目标至少44px。

初步比较了“多张等宽统计卡”和“学习手册”。统计卡在没有课程时容易暗示虚构指标，因此采用一块主阅读区、数学/英语两枚有区别的科目书签和明确空态。唯一突出的视觉是一幅自绘线条小屋与路径，呼应学习家园，不表示已拥有宠物或成长进度；不使用版权课件、图床或图片生成服务。

```text
欢迎页：品牌/登录 ─────────────────
        简短欢迎语/登录按钮 | 线条小屋
        数学待迁入          英语待迁入

已登录：品牌 ───────────────── 角色/退出
        今日学习 | 标题/当前状态
        科目     | 一块主阅读区/空态
        复习     | 科目书签或授权后列表
        成长     |
```

## 实现边界

React读取真实cookie会话，CSRF、授权名单和当前学习者仅留内存；无localStorage身份、假余额或本地学习账本。公开欢迎与学科可用性说明不含学习者资料；学习区域和家长路由按真实角色处理。模块契约只定义未来接口，math/english保持disabled、contentVersion为空。后端仅增量调整明确SPA路由allowlist，不改数据库、认证算法或学习写入开关。

## 页面与模块

| 路径 | 内容与范围 |
| --- | --- |
| /、/login | 公开欢迎和统一登录；没有默认凭据、注册或HTTP重置 |
| /home、/today | 需真实session；孩子自己的首页及空计划，不创建任务 |
| /subjects | 需session的科目中心，从真实config读取registry |
| /subjects/:subjectId | 公开的通用可用性说明；不含学习者、课程或记录。保留旧基础浏览器回归，未知/disabled科目安全空态 |
| /review、/growth | 需session，只做复习/成长空态，无排程、余额或蛋仔 |
| /parent、/parent/report | child显示无权限；parent锁定只显示二次验证；解锁后当前有效grant名单及报告占位 |

`packages/contracts/routes.ts`的明确路径表同时供浏览器和Node静态服务器使用；没有包揽API或任意文件的wildcard fallback。SPA的200 HTML只有静态应用代码，不代表获得家长数据；后端身份/learner API仍独立校验cookie、Origin、CSRF、角色和grant。

`packages/subjects`保留math/english稳定ID、enabled=false、status=awaiting-migration、contractVersion=1、contentVersion=null。SubjectModule仅定义未来服务端listCourses/getDue/getParentReport接口、版本和资源引用，没有运行时课程引擎或奖励实现。SubjectSlot允许未安装module。registry的坏条目单独过滤，缺失/不可用模块显示空态，不影响身份和其他页面；未来科目按registry和独立module扩展，不把规则写进auth/wallet或全站subjectId分支。

## 真实会话状态机

`checking → anonymous / authenticated / unconfirmed`。只有通过SessionDTO和learner DTO校验的服务端响应才能建立authenticated；父母锁定DTO必须learnerIds=[]，孩子只允许自身唯一ID，越界或重复learner响应失败关闭。账号、CSRF、名单和选择仅留React内存；cookie由浏览器同源收发，前端不读取bearer。

首次加载、刷新、popstate、重新聚焦、切回可见页面和网络恢复均现查。路由/选择学习者先遮蔽旧内容，查询session及名单，再对选中的ID执行真实单项GET；不把路径或上次选择当授权。登录后按后端角色进入孩子首页或家长中心，支持键盘和焦点移交；退出成功才显示已退出，失败/超时只显示待确认。

家长短时解锁有效时每5秒重新校验，切换学习者每次立即现查；后端撤销对请求即时生效，UI不是服务器推送，不承诺后台撤销零延迟。到期本地计时器先遮蔽，再现查/按需要调用parent-lock，绝不自动解锁或延长期限；响应落地前再次检查绝对/提升期限，防止延迟响应闪现已过期资料。每个请求有8秒截止时间，generation+AbortSignal拒绝取消/并发后的旧响应。

离线、隐藏页面、pagehide、家长窗口失焦、401/403或网络错误会清掉可渲染身份/名单/选择并同步设置privacy遮蔽，随后只在新后端确认后显示。pageshow/bfcache和浏览器后退重新校验。退出/锁定失败的待确认意图保存在当前页面内存，恢复时先获取新CSRF完成该意图，避免先展示旧资料；没有把停止等待误写成服务器撤销成功。

**设计差异与限制**：02A原来允许有效短时权限跨Node/容器重启延续，本轮不改该后端语义。02B新文档/刷新通过真实parent-lock主动收紧家长权限后才展示界面；单纯Node重启由下一次请求重新验证，过期/撤销不会从前端缓存复活。无操作30分钟时前端遮蔽而不宣称后台已经注销；普通锁定/孩子页面不持续心跳，避免无限延长闲置会话。待确认退出意图不跨页面持久化：未收到成功前若关闭/刷新，cookie可能仍有效，重新打开显示实际服务器状态，家长仍先锁定。

## 合成本地运行与维护

无新增依赖或schema v3，001/002、Store、flock、scrypt、checkpoint和生产传输配置不变。认证默认关闭，不能仅凭登录页认为已启用正式账号。仅在本repo新合成目录、停服务后使用已验收交互CLI；不提供默认用户名/口令：

```sh
npm ci
npm run build
node scripts/maintenance.ts migrate --root .foundation-work
node scripts/auth-admin.ts bootstrap-parent --root .foundation-work --synthetic
node scripts/auth-admin.ts create-learner --root .foundation-work --synthetic
NODE_ENV=development KLH_AUTH_MODE=loopback-development KLH_AUTH_ORIGIN=http://127.0.0.1:4177 npm start
```

仅回环4177开发模式；生产仍须明确HTTPS origin和独立批准的TLS入口，不能公开无TLS上游。`npm run verify`顺序运行typecheck/build、完整Node、旧3视口及13条真实React E2E；Linux另跑Compose与正式镜像。新UI测试、随机账户和故障控制仅在tests/shell，不进入正式镜像。

依据：[React状态与组件位置](https://react.dev/learn/preserving-and-resetting-state)、[Playwright Clock](https://playwright.dev/docs/clock)。浏览器时钟和后台合成时钟只用于测试期限，不构成正式身份来源。实体iPad/Safari、NAS与生产TLS入口仍NOT_RUN。
