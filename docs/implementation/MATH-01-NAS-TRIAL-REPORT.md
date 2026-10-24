# MATH-NAS-01 数学首课 NAS 隔离试用报告

2026-10-24；任务：[Issue #13](https://github.com/lovestream/kevin-learning-home/issues/13)；工具分支 `codex/math-01-nas-trial`，交付 [Draft PR #14](https://github.com/lovestream/kevin-learning-home/pull/14)。

**NAS 技术验收完成：全量 4/4 场景通过，新数学只读试用保留运行于 `https://192.168.2.100:38444/`；原 `38443` 仍是独立的旧 02B。这里只是合成账户隔离试用，不是生产上线。** 手机/iPad 实体课堂体验及旧账号登录仍为 `NEEDS_USER_ACTION`。MATH-02 未开始。

## 运行源和构建的可追溯性

| 项目 | 已核实事实 |
| --- | --- |
| 工具起点 | 最新 main `ffde6d5ed50de470e160ee56a0b3ef0e2782110f`；相对冻结运行源仅状态/交接文档变化 |
| 正式镜像源 | `e594b3e6db0563f6a6b56bc2b0724f1bcd8c961e` |
| 源 main CI | [40085571114](https://github.com/lovestream/kevin-learning-home/actions/runs/40085571114)：main push、该 SHA、completed/success；不拿 PR CI 冒充 main |
| 构建 | [40099510393](https://github.com/lovestream/kevin-learning-home/actions/runs/40099510393)，工具 HEAD `8bbe64c475a049af6d2cdb265354b8d83941cdf7`；`git archive` 精确源 SHA → 未修改正式 Dockerfile → linux/amd64 |
| 工具链 | Node 24.15.0、构建 npm 11.12.1、固定 lock；不使用开发 harness |
| Artifact | `12562685287` / `klh-math-trial-bundle`，一天保留；90,368,734 字节 ZIP；仅 Actions artifact，无公开 registry、无 runner SSH |
| Image ID | `sha256:b7d952cb310aab5a52d7efadf1b38417df17f121e2a172140b84e2cda944fdd5` |
| 归档 SHA-256 | `5e2d24fe8712b3903bb199d00b95d34a397e2192793a2de54cd5aca77b9f279f` |
| publicDtoSha256 | `7397a9c3140e6f6afd2c928a094e5dfbf5641f3903e9ec042561ce12965746cc` |
| visualArtifactSha256 | `4075f790b25ee9a6e37561b3fedb7a1bc9b0c4a3a654963f29ad7d05cb415c2e` |

归档 SHA、docker-save 配置计算出的 imageID、标签、平台、镜像内真实 DTO/manifest/JS/CSS 逐项核对；同一只读 probe 在 Actions 与 NAS 的输出相等，Node 原生 fs-ext 可加载。正式 app 与离线 CLI 实际打开 SQLite 并取得 writer 锁。未重新开发或修改正式数学、身份或存储逻辑。

## NAS 预检和本次专用资源

先只读采集原 8 服务和旧 02B 两容器的 ID/State/StartedAt/RestartCount，比较初始快照；原 10 个均 running。NAS 为 DS918+、Linux `4.4.180+ x86_64`、Docker `20.10.3`、Compose `1.28.5`。专用父目录的真实路径、UID/GID `1024:100`、写权限、ext4/rw 已验证；新 root 不存在、38444 可绑定；可用空间 `2419062931456` 字节、可用内存 `4862701568` 字节。部署前再次核查全部条件及容器/网络/镜像名称空闲。

本次前缀 `klh-math-trial-20261024-8f228391`，独立 root `/volume2/homes/admin/klh-math-trial-20261024-8f228391`、owner marker、内部 bridge、独立 edge bridge、app/tls 容器、专用镜像标签和新 7 天证书。新 root/subdirs 0700，凭据/状态/密钥 0600。仅新 app 设置 `KLH_MATH_READONLY=1`、生产身份模式、`KLH_AUTH_ORIGIN=https://192.168.2.100:38444`。

约束：非 root `1024:100`，只读 rootfs，cap-drop ALL，no-new-privileges，CPU 绑定逻辑核 0，app 512MiB / TLS 128MiB，日志 5MiB × 2，restart=no。不使用该旧内核不支持的 NanoCPUs/PIDs limit 来冒充已限制。app 无宿主端口，仅连新 internal 网络；TLS 连接 internal 与 edge，仅发布 NAS LAN-IP:38444。所有数据挂载都在新 root，TLS 不挂旧 CA，app 不挂 TLS 私钥。未扫描旧卷。

新证书只在全新测试 Chromium profile 中信任，正常验证 CA 链、有效期、IP SAN；未知 CA、错误 SAN、过期证书、另一 profile 的负向测试均通过。没有全局安装 CA、忽略 TLS 错误、调整系统时间或分享私钥。合成家长/孩子由正式离线 `auth-admin --synthetic` 交互 TTY 建立；秘密仅在本地 `.trial-private` 与新 NAS 私有 root，GitHub 不含密码、tokens、Cookie、SQLite、HAR、trace 或浏览器配置。

## 真实 LAN 验收与不变性

Mac Chromium 经新 NAS TLS 代理访问正式 Node/SQLite；没有身份 mock、拦截 API 或伪造课程响应。

| 验收 | 当前证据 |
| --- | --- |
| 匿名深链 | 仅登录门禁，无课程内容 |
| 孩子首页 | 数学 readonly-preview、英语 awaiting-migration；新入口的可见标签分别为只读课堂/待迁入 |
| 首课与 390/768/1280 | 3 组真实 LAN 场景通过；故事、六步、键盘旋转、三视图、临时照片、投影尺寸 |
| 刷新/退出 | 回到第 1 步，照片清空、相机复位；退出后匿名课件接口 401 |
| 家长权限 | 未解锁 learnerIds 为空且课件 403；解锁+grant 200；撤销 403、私密 DOM 消失，正式 CLI 恢复 grant |
| 连续复核 | 已测 最终 12134ms、2 次 auth + 2 次 math 请求，12 次逐秒断言 DOM/焦点稳定；首轮脚本测量起点有误，见下文 |
| 其它课/学习者 | 其它 lesson 404、其它学习者 403 |
| 所有写入口 | lesson POST 405；math commands/state 与钱包写入口 403；无业务写入 |
| 边界/完整性 | Host/Origin/缺 CSRF 拒绝；每次成功课件 DTO 与 manifest、实际 JS/CSS 与镜像 hash 比较 |
| 浏览器安全 | 正常响应 CSP/no-store、无外站请求、无脚本错误、无秘密日志、无学习内容 localStorage/sessionStorage/IndexedDB/Cache Storage |
| 11 学习表 | 最终未筛选全量测试前后逐表 count/hash 相同；只读统计仅本次合成 DB；认证审计/会话/限速必要写入单列 |
| 旧服务 | 原 8 + 旧 02B 两容器 ID/状态/StartedAt/RestartCount 与初始快照相同；旧公开 CA/叶证书 hash 相同，旧 readiness/匿名登录页 HTTPS 200 |
| 最终全量复验 | **PASS，未筛选的 4/4：390、768、1280 孩子场景与家长权限完整场景；11 表 hash 相同** |
| 手机/iPad | `NEEDS_USER_ACTION`：没有实体设备反馈；虚拟视口不代替实体触控/照片/退出验收 |
| 旧账号登录 | `NEEDS_USER_ACTION`：任务同时禁止读取旧密码/Cookie/DB，保留用户手工验收；匿名 200 不代表旧账号登录已测 |

已实际查看 NAS 截图：390 的实验页、768 的实验页、1280 的故事页、家长连续复核页面。文字、相机投影、照片架、按钮和焦点轮廓可辨，没有观察到水平溢出或内容遮挡。这是执行代理的截图视觉检查，不能冒充用户实体设备验收。

## 失败、诊断和修正

完整历史摘要：[failure-history.json](evidence/math-nas-01/failure-history.json)。每次失败均停止新容器并保留诊断；没有动旧服务或放宽安全规则。

1. 本地 headless Chromium 的证书管理原生文件对话框没有触发 Playwright filechooser，探针超时并关闭独立 profile。采用 Chromium 公开的 profile `ServerCertificate` v1 存储，仅加入新 CA；四类 TLS 反向测试确认不是关闭验证。系统 Keychain 未改。
2. 新代理严格 TLS 单测初版将恶意 HTTP Host 同时当作 SNI，先被 SAN 拒绝。固定实际连接的 TLS 身份，再验证独立 HTTP Host 403；不改正式代理、不降低验证。
3. 只读比较器初版将历史 `{rows,sha256}` 对象误当数组，已修正；没有 NAS 写入。
4. 第一次实际浏览器运行 3 组孩子通过，家长焦点检查失败。新脚本未等课堂切步的焦点 effect 结束便聚焦相机按钮。对齐已通过的正式 MATH-01 测试，先确认 observe 模型和 stage 焦点稳定再开始计时；下一次测得 12 秒、2+2 次复核、DOM/焦点稳定。
5. 第二次定向测试已验证撤销 HTTP 403、隐私遮蔽和 grant 恢复，随后退出导航未完成。脚本在 `docker start` 后立即导航，缺少恢复就绪等待；补上严格 TLS readiness 以及导航 HTTP 200 断言。离线 CLI 必须先停新 app 以释放 writer 锁；维护窗口的代理 503 仅允许固定无内容正文 `Trial service unavailable` 和 no-store，不能把正常业务的安全断言整体忽略。
6. 多次重试耗尽正式合成家长凭据 5 次/15 分钟额度，第三次停在登录。新合成数据的只读限速统计确认 attempts=5；没有删除计数、改时间、换身份绕过或改 auth。新增额度预检，为全量运行预留孩子 3 次、家长登录+两次离线验证共 3 次、家长解锁 2 次，并等待自然窗口 `2026-10-24T14:14:36.914Z` 到期后复验；没有改限速数据或认证代码。
7. 第四次全量在 768 孩子键盘旋转失败，同为切步后 `requestAnimationFrame` 将焦点交还 stage 的脚本竞争；孩子脚本也补齐原测试已有的 stage 焦点等待。随后未筛选全量 4/4 通过，不把早期 3 项通过或定向运行充当最终结果。

最终三组孩子耗时 12008/9686/9371ms，家长 47645ms；正常响应 CSP 校验 49/49/49/46 次、实际资源/课件 hash 校验 14/14/14/12 次。四组均 0 外站请求、0 CSP violation、0 页面异常、0 秘密日志。离线撤销/恢复维护窗口观测到 3 次固定 no-store 503，均不含课堂数据，恢复后严格 readiness 与导航 200、权限 403/200 断言通过。

原始安全证据：[browser-results.json](evidence/math-nas-01/browser-results.json)、[image-build.json](evidence/math-nas-01/image-build.json)、[nas-status.json](evidence/math-nas-01/nas-status.json)、[owned-resources.json](evidence/math-nas-01/owned-resources.json)、[old-services-invariance.json](evidence/math-nas-01/old-services-invariance.json)、[auth-budget-evidence.json](evidence/math-nas-01/auth-budget-evidence.json)。截图在同目录，无口令字段。NAS 全量验证在最终提交前的工作区执行，不能冒充为干净的 `8d41cf3` 运行；[harness-files.json](evidence/math-nas-01/harness-files.json) 明确记录当时 HEAD/dirty 状态及运行期间未改动的 7 个实际工具源码 SHA-256。最终 CI 的独立离线测试逐项核对这些哈希与审查 HEAD 一致。公开摘要使用两种明确的 JSON 序列化 fingerprint：旧比较器 allSha256 与控制器 existingServices.sha256 各自前后一致，不能跨格式比较两者字符串。

## 回归、CI 与交付边界

本地完整基线：原 60 Node、18 UI、3 基础视口、新 12 数学 Node、9 数学浏览器、typecheck/build 全通过（执行代码点 `4895468f5dc75d0be415282665bd8d68e97197ae`）。新工具 15 Python 安全测试，TLS 代理、独立 profile 信任、登录额度两项单测共 4 Node 测试。CI 保留原源审计、Docker/Compose 1.28.5 与容器恢复等全部步骤，无 skip/continue-on-error；只向 push 分支白名单和对应 guard 加入新分支。

代码点 `8d41cf3fe03c4204744bda6ebe8f116c106a94de` 的 [push CI 40101046343](https://github.com/lovestream/kevin-learning-home/actions/runs/40101046343) 与 [PR CI 40101050324](https://github.com/lovestream/kevin-learning-home/actions/runs/40101050324) 已 completed/success，包含全部基线与新工具测试。最终交付前仍必须确认同一最终 HEAD 的 push 与 pull_request 两套完整 CI，精确 SHA/run 链接写在 [PR #14 正文](https://github.com/lovestream/kevin-learning-home/pull/14)，不把早期成功冒充最终通过。镜像 build run 另行记录，不与工具分支 HEAD 混同。

本轮不修改旧 math-learning/word-request，不改正式应用、Dockerfile/Compose/旧试用配置，不迁移真实记录，不开放练习、阅读记录、积分或蛋仔，不部署生产、不合并 PR、不进入 MATH-02。新实例已按任务保留给用户试用；七天测试证书和 restart=no 均不具备长期上线保障。手机/iPad 若无法在应用内独立信任 CA，应记录证书阻碍并停止该设备试用，另行审查受信任域名证书方案，不让用户跳过警告或全局安装信任。
