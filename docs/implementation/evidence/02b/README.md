# IMPLEMENT-02B 证据与界面索引

2026-10-22；全部为随机合成账户/数据。没有数据库、口令、cookie、CSRF值、原始请求头、trace/HAR或真实学习记录。截图在密码输入清空后拍摄；英文Synthetic learner也是合成夹具显示名。

[来源与基线](provenance.json)、[旧项目之前](protected-repositories-before.json)/[之后](protected-repositories-after.json)只记录Git元数据摘要；HEAD和status摘要完全一致。word-request之前已有一个未提交条目，本轮未动。

## 本地完整验证

`local/verification.json`如实记录基线HEAD及worktreeDirty=true，代表提交前工作区验证，不冒充实现SHA。Node24.15.0/macOS arm64：60项Node（原55保留+5）、原浏览器3视口、新界面13场景通过。随后增加后退清空断言、登录后main焦点及镜像排除夹具断言；child390定向通过。最终精确源码由完整Linux CI验证。

- [完整命令与环境](local/verification.json)
- [60项测试清单](local/test-cases.json)
- [13项真实前后端场景](local/shell-browser.json)：含Origin/CSRF布尔审计、零CSP违规/外部请求、零浏览器持久化、旧学习表不变。
- [原3视口](local/browser.json)、[迁移](local/auth-migration.json)、[备份恢复](local/recovery.json)、[flock恢复](local/r1-ownership.json)、[readiness](local/r1-readiness.json)
- [首次完整UI审计失败](history/ui-first-audit-failure.json)：headers()不含Origin导致审计误报，改为allHeaders()，没有删除审计。其他失败及修复见[执行报告](../../IMPLEMENT-02B-execution-report.md)。

## 截图

390/768/1280/1440为Chromium CSS视口，不是实体手机/iPad/Safari验收。Mac本地14幅为首次完整成功记录；CI截图为提交源码在Linux中文字体环境中的记录。没有修改旧站。

| 页面 | 本地截图 |
| --- | --- |
| 欢迎1280 | [welcome](local/screenshots/welcome-1280.png) |
| 登录390（未填凭据） | [login](local/screenshots/login-390.png) |
| 孩子首页390 / 768 / 1280 / 1440 | [390](local/screenshots/home-390.png) · [768](local/screenshots/home-768.png) · [1280](local/screenshots/home-1280.png) · [1440](local/screenshots/home-1440.png) |
| 家长锁定390 / 768 / 1280 | [390](local/screenshots/parent-locked-390.png) · [768](local/screenshots/parent-locked-768.png) · [1280](local/screenshots/parent-locked-1280.png) |
| 家长解锁390 / 768 / 1280 | [390](local/screenshots/parent-unlocked-390.png) · [768](local/screenshots/parent-unlocked-768.png) · [1280](local/screenshots/parent-unlocked-1280.png) |
| 离线 / 缺失模块1280 | [offline](local/screenshots/offline-1280.png) · [missing subject](local/screenshots/missing-subject-1280.png) |

## CI归档协议

实现提交先完成完整push/PR CI，再将安全结果和14幅CI截图归档至`ci/`。归档提交本身仍须完整push/PR CI，最终exact HEAD/Actions链接由Draft PR正文提供。人工不得把PR绿灯等同于未来main合并后CI；本轮不合并。CI artifact保留14天，仓库内安全证据长期保留。NAS/实体设备/生产HTTPS均NOT_RUN。
