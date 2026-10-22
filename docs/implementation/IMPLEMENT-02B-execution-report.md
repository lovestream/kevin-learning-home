# IMPLEMENT-02B 执行与验收报告

2026-10-22。已核对PR6 merged，最新main `f2c42c2475d0ae85c1688b13e437bc4332d12315`，[真正main push CI 39765830063](https://github.com/lovestream/kevin-learning-home/actions/runs/39765830063) completed/success。从该SHA新建`codex/implement-02b-shell`，不复用已合并的02A分支。任务原文来自`chatgpt/klh-implement-02b-start@aaf8fe6936f780b94f6aa55b7bbf3c1768bc52a9`、blob `f2fd44b8c5b8cde0fd7caa0d575119acfb2e2728`，原字节归档[任务书](../tasks/KLH-IMPLEMENT-02B-UI-SHELL.md)。

交付统一中文登录、真实会话恢复/退出、孩子首页/今日计划/科目/复习/成长空态、家长二次解锁/授权选择/报告占位、390/768/1280/1440px响应式布局、版本化SubjectModule类型与静态路由安全边界。数学/英语仍disabled待迁入，未来科目仅结构契约，不含课程、记录、积分或宠物逻辑。

从[UI架构](IMPLEMENT-02B-ui-architecture.md)、[安全评估](IMPLEMENT-02B-security-review.md)、[证据与截图](evidence/02b/README.md)、[交接](../handoff/IMPLEMENT-02B.md)审查。ADR0001继续Proposed，不把本轮批准扩大成后续整合或生产部署许可。

## B01～B15验收

PASS_LOCAL表示Mac实际运行，PASS_CI只用于实际Actions现代Linux结果；NOT_RUN不算通过。首次本地完整运行60项Node、旧3视口、13条真实React/Node场景通过，执行时worktreeDirty=true，不将基线SHA冒充实现提交。CI待实现提交后归档；最后精确HEAD与完整push/PR checks以Draft PR正文核对。

| ID | 当前结果 | 证据/实际范围 |
| --- | --- | --- |
| B01 | PASS_LOCAL | PR6合并与main CI同SHA成功；新worktree从f2c42c2建立；旧项目只读Git元数据 |
| B02 | PASS_LOCAL；CI待归档 | 真实表单/cookie登录、刷新、退出、旧cookie重放401、后退/直接URL重新验证 |
| B03 | PASS_LOCAL；CI待归档 | 孩子只读本人元数据，无家长导航；伪造Role/Tailscale头、直接家长URL拒绝 |
| B04 | PASS_LOCAL；CI待归档 | 锁定parent无ID/label/grants；登录后仅二次验证表单 |
| B05 | PASS_LOCAL；CI待归档 | 真unlock/选择/撤销、lock/rotate/刷新、5分钟到期及Node重启后回收缓存；迟到响应不闪现旧资料 |
| B06 | PASS_LOCAL；CI待归档 | 正常POST Origin/内存CSRF；故意剥离CSRF真实403；原02A生产TLS/loopback拒降级测试保留 |
| B07 | PASS_LOCAL；CI待归档 | 实际401/422/429/503、离线恢复、CSRF403、失败退出意图、取消/8秒超时、旧响应与重置/idle401 |
| B08 | PASS_LOCAL；CI待归档 | 各空页面明确无课程/任务/成绩/余额；13场景逐表核对旧学习表不变 |
| B09 | PASS_LOCAL；CI待归档 | disabled registry/contentVersion=null，坏/缺失科目隔离；未来科学条目无auth/wallet改动 |
| B10 | PASS_LOCAL；CI待归档 | 明确deep link刷新、API/health/assets不被覆盖、穿越/NUL/未知路径反例；CSP无放宽 |
| B11 | PASS_LOCAL；CI待归档 | Chromium390/768/1280/1440、Tab/Enter、可控密码显示、焦点和label、触控目标≥44px、无横向溢出；14幅合成截图 |
| B12 | PASS_LOCAL；CI待归档 | 原55项名称全部保留，加5项Node=60；旧3视口，加13条真实前后端场景 |
| B13 | Linux容器/Compose待CI | 延用正式non-root/readonly镜像/auth恢复/媒体卷；新增UI夹具不入镜像断言；无NAS |
| B14 | CI待归档 | main/开发push及PR完整job；必须检查实现和最后归档提交各自真实SHA/全部绿灯 |
| B15 | PASS_LOCAL | 随机合成账户、临时目录/context finally清理；不读取真实库、不访问旧站/NAS、不部署生产 |

浏览器范围是Chromium视口模拟，不冒充实体iPad、Safari或NAS。正向认证全用真实后端；网络/模块故障注入范围及其边界见安全评估。

## 实现差异、保留范围

没有schema v3、依赖升级、课程复制、旧站请求、云资源或新服务。新增后端修改仅静态SPA路径匹配，身份端点和学习写入开关不变。SubjectRegistration增加版本/contentVersion/展示标记；SubjectModule只有未来接口类型。前端Zod jitless是CSP兼容设置，不改变服务端认证策略。

原55项Node保留全部名称与核心断言；workflow用例仅增加02B已授权开发分支，并允许显式YAML数组换行，仍严格核对main、原分支、完整无条件job及精确event HEAD。auth镜像用例保留并加强为同时排除新的tests/shell。旧3视口基础浏览器代码不改，依旧验证原公开科目占位、无学习写入/存储。

新文档刷新主动通过真实parent-lock收紧UI权限，未改变02A普通Node/容器重启可延续有效会话的底座语义。后端撤销即时，UI选择/切换现查及解锁期间5秒复核，不宣称无网络的服务器推送；待确认退出不跨刷新持久化，必须收到真实成功才可认为已退出。

## 失败历史

早期typecheck发现RequestError使用不符合erasableSyntaxOnly的参数属性，改为显式字段。一次基础浏览器与build并发造成首页等待超时，改为顺序完成构建后再跑，原3视口通过。初次严格CSP监听捕获Zod eval可用性探测，改为schema导入前jitless，CSP保持原样；定向复测零违规。

首次12条完整UI功能链到达末尾，但请求头审计用headers()省略Origin，12条均以POST_ORIGIN_CSRF_MISSING失败；改用allHeaders()读取并仅保存布尔值，原失败JSON单独归档history/，不伪造为产品权限通过。随后完整验证11/12通过，剩余重启场景在证据比对时访问了夹具旧Store，改为动态getter；定向通过。再增加迟到私有响应越过到期的真实测试，最终完整13条通过。退出后的后退检查和生产镜像排除UI夹具也加强，最终CI应完整覆盖。

不归档凭据/原始网络trace/数据库/私钥，只保存安全摘要与清空输入后的界面。没有通过删除原55项、跳过TLS、关闭CSP或mock所有认证来获得绿灯。

## CI与交接

本段在首轮CI后更新。CI扩展既有完整job，不执行NAS SSH或站点探测；CI安装中文系统字体仅用于同源页面截图。实现提交CI与证据归档提交必须分别核对，文档不能包含自己的提交SHA，最终归档HEAD/最后CI URL由Draft PR正文提供，artifact executedHeadSha应一致且worktreeDirty=false。保持原02A/历史报告与CI证据不变。

完成后停止：不合并02B、不进入学科迁移/下一阶段、不创建真实家庭身份、不配置生产HTTPS/Tailscale、不部署NAS。下一动作由ChatGPT独立复审；真实设备、加密备份与生产入口均需后续独立授权与验收。
