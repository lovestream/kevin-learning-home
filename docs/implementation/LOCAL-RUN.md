# 本机后台运行与验收

2026-11-18。用户明确说明 NAS 已不可用，改为直接在当前 Mac 运行。沿用原工作目录、分支与 Draft PR38，不创建另一套网站，不接入或改写真实学习数据。

## 使用入口

入口：**http://127.0.0.1:38444/**；数学 `/subjects/math`，英语 `/subjects/english`。

项目根目录的 `启动学习家园.command` 启动并打开网页，`停止学习家园.command` 停止。也可执行：

|命令|行为|
|---|---|
|`node scripts/local/service.mjs start`|首次构建/安装/启动；已运行的同版本不会重启|
|`node scripts/local/service.mjs open`|启动并打开默认浏览器|
|`node scripts/local/service.mjs status --json`|核对任务、端口PID、版本和课程完整性|
|`node scripts/local/service.mjs restart`|明确结束匿名会话，重新构建更新并启动|
|`node scripts/local/service.mjs stop`|只撤下本项目后台任务，禁止下次登录自动启动；不删文件|
|`node scripts/local/service.mjs build`|只在服务停止且端口空闲时构建|

关闭网页、终端或 Codex 工具进程不会停止网站。启动后由当前用户 macOS LaunchAgent 管理，并在下次登录运行。关机/休眠/退出当前 macOS 用户会中断访问；本次仅监听127.0.0.1，不是局域网或远程分享服务。

## 运行边界与可恢复性

- LaunchAgent标签 `com.lovestream.kevin-learning-home.local`；配置在当前用户 `~/Library/LaunchAgents/`，无需root。只有当前目录、Node可执行文件和所有配置精确匹配时才允许接管。
- 已加载任务的程序/工作目录、监听端口PID与HTTP完整性均需匹配。其他程序占用38444时拒绝启动；不运行泛用kill，不停止其他程序。
- 构建使用当前Git HEAD封印；启动检查70课堂、849题、6631英语卡/665组/1861媒体。服务已运行旧版时报告需显式restart，不暗中清除正在使用的匿名会话。
- 日志 `.local-runtime/build.log`、`stdout.log`、`stderr.log` 均本机忽略；后台配置和日志不包含私人词包、数据库密码或NAS连接。
- 依赖Node24与当前目录；移动/删除目录或升级Node路径前应先stop。在原目录重新start可恢复。素材缺失/构建失败会明确报错，不自动从私人资料导入。
- **当前仍RAM，刷新/离开页面或服务重启会失去本次状态。**记录持久化、正式日期复习、统一积分与蛋仔仍按原交付队列接续；不能把本地后台运行说成真实进度已经永久保存。

## 实际验收

本批未改 `apps/preview`、`packages`、数学内容或已冻结英语素材；原运行源码为 `f059d0f5df32d927ddd473722fd8e0e3bfe81725`，最终发布封印以本机 `/preview-api/v1/runtime` 的 `buildSha` 及PR当前head为准。

|验证|结果与证据|
|---|---|
|启动器单元测试|3项：精确所有权、配置转义、完整版本/内容就绪条件|
|macOS真实生命周期|启动→幂等启动PID不变→重启新PID→停止→再启动；后台父进程为launchd/PID1|
|无关端口保护|临时无关HTTP服务占用38444，start拒绝；stop不关闭它；原HTTP响应保留|
|真实本机网页|70课HTTP、第一课六步、四词库首答错误与订正、实际图片解码、冲刺、PK实际服务提交；零浏览器异常|
|存储边界|HTTP报告database=false，浏览器local/sessionStorage均空；未读取/改动真实记录，正式奖励0|
|自动化|CI运行启动器单元与语法检查；macOS生命周期/家庭素材浏览器只在本机显式验收，不能冒称Linux CI运行了LaunchAgent|

可复现命令：

```sh
node --test tests/local/service.test.mjs
# 以下生命周期测试会结束匿名会话；不要在Kevin正在学习时运行。
node tests/local/lifecycle.mjs --confirm-reset-preview
node --import ./tests/english/mac-browser.mjs tests/local/browser.mjs
```

生命周期报告、实际网页报告、4张截图与trace位于本机忽略目录 `.evidence/local/`；涉及家庭教材的截图不上传公开GitHub。它们记录实际buildSha，不能以较早截图冒称更新后的提交通过。最终运行与CI精确SHA回执补在PR正文，避免为记录自身SHA反复创建新提交。

## 未完成范围

实体iPad、远程访问和真实孩子本轮试学未进行；网站无需NAS即可在本机使用。正式跨日存档/复习、统一可信记录、真实历史保真导入、统一积分和蛋仔仍未开放，不因更换运行位置跳过核验步骤。
