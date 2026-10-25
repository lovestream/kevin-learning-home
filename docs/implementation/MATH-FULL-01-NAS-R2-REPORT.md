# MATH-FULL-01 NAS R2：局域网直接交付

## 当前执行状态

用户在 2026-10-25 明确要求“不用 HTTPS，在本地 NAS 用”。此最新指令覆盖 R2 原文的证书前置要求：采用 **http://192.168.2.100:38444/**，无账号、无证书、无真实数据、无成绩持久化。此前 Tailscale 证书方案停止，没有申请证书或更改 Tailscale/DSM/DNS/权限。70 课现有代码继续复用，不重做课程。

最终状态：`PASS_NAS_HTTP_DELIVERY_70_TEACHING_ONLY`。**[打开 NAS 学习家园](http://192.168.2.100:38444/)**，直接进入数学目录，无需登录、证书或 Mac 本地服务器。真实 NAS 测试、普通浏览器和回退已完成，实体手机/iPad 仍待用户体验。最终证据提交的精确 HEAD 双 CI 在 PR 正文核实，不能沿用旧 R1 或部署源码 CI 当作最终 HEAD 通过。

## 运行与切换设计

专用 `infra/math-preview/Dockerfile` 构建 Linux/amd64 Node.js 24.15.0 内容镜像，最终层只有 70 课 DTO、真实静态 bundle、Zod 及内容服务器，不含 AuthService、MathService、SQLite、fs-ext 或正式账户工具。独立 owned 网络与一个非 root、只读根、256 MiB、单 CPU 容器；无数据挂载。显式启用容器模式，绑定实际分配的私网 IP，通过精确 Host/Origin 和 LAN/本网络网关白名单提供内容。宿主机只发布 `192.168.2.100:38444`，不绑定公网、默认所有网卡或新建互联网服务。

`/` 直接显示学习家园→数学→70课教材单元目录，`/subjects/math` 为同一目录，`/subjects/math/lessons/:id` 为同一六步课堂；保留单元筛选、相邻课及返回目录。英语显示待迁入，849 题/侦探/卡片等未迁功能明确说明。无登录/解锁/密码；GET/HEAD 之外 405，正式 `/api/v1/*` 404，浏览器不写 storage/cookie。

原页面 SHA-256 校验使用仅安全上下文可用的 WebCrypto；已改用固定 `@noble/hashes@2.4.0` 的纯 JS SHA-256，在 LAN HTTP 下继续逐课校验，**没有跳过 hash 或关闭 CSP**。与 Node 独立 SHA-256 对比 Unicode 与全部 70 DTO；许可证纳入 notices，npm audit 为零问题。该库只用于预览浏览器构建，不进入正式服务运行依赖。[官方用法](https://github.com/paulmillr/noble-hashes#usage)。

`infra/math-preview/controller.py` 先只读确认原 owner marker、旧 38444 两容器/镜像/挂载/证书目录及合成数据 hash，记录另外 11 个受保护容器（原 8 服务、38443 两容器及旧数学 app）。不读真实数据库。新镜像通过 CI 生成的 archive hash 和 image ID 校验，经 SSH 加载专用 NAS root，先在无宿主端口的容器内核验；再只停原 owned TLS 容器让出 38444。旧 app、合成卷、证书/密钥与旧 TLS 容器不删除或覆盖。任何新入口失败会尝试恢复原 TLS；回退命令仅操作本轮 app 与已核实的原 TLS ID。

## 验证门禁

- 70 课/64 交互/6 静态、30 代表课、210 场景保留；补数学路径、科目导航和无密码输入验证。
- 原 16 项 Node，加 2 项 LAN HTTP/独立 SHA-256 测试、6 项部署保护测试；原全部 Node/UI/数学/Compose/生产容器恢复门禁完整保留。
- 新 preview-only Docker 真容器检查实际 70 DTO/页面、Host/Origin/写/API 阴性、镜像不含正式服务、零学习挂载、非 root 与只读根；push 导出可复核镜像，PR 同样执行测试。
- 真 NAS 浏览器仅允许 `--nas` 明确指定该 LAN HTTP 地址和预期构建 SHA，不忽略 TLS、不假装 localhost 是 NAS；断言不安全上下文下所有课仍校验并展示，触摸/键盘/刷新及零持久化保持原门禁。Mac 可见浏览器另做实际访问；实体 iPad/Safari 未实际操作不能标 PASS。

## 回退与边界

`python3 infra/math-preview/controller.py rollback` 恢复原 38444 合成单课 HTTPS；`switch` 切回新 HTTP 数学目录。仅在本轮实际完成来回切换并核对旧入口与新入口后，才能标回退 PASS。此回退不是修改旧真实服务，也不重建原数据库。用户无需运行这些管理员命令。

本批是 70 课教学上线，**不是完整数学网站迁移完成**。849 题属于 Issue #16，其他可用数学能力属于 Issue #17；后续都需进入同一 NAS 学习家园，不另交 Mac 演示。PR #18 保持 Draft、不合并；不迁真实记录或放宽正式身份保护。

只读工具初次对比发现 Docker 返回的 Mounts 顺序不稳定。现按挂载目的路径排序，保留全部来源/读写等字段后比较；新增回归确保重新排序不误报警、权限变化仍失败。原服务身份、镜像、启动时间与挂载内容实际未变。

首次 R2 CI 的专用镜像已构建成功，随后 CI 容器启动因自动分配的网络未声明子网而拒绝固定 IP；NAS 工具本来就显式指定子网，尚未执行任何 NAS 写入。已为 CI 使用同样的显式专用子网。镜像门禁提前执行并单独归档，方便传输；原全部回归、全课浏览器、Compose/正式容器恢复仍完整执行，未删减或忽略失败。首次失败 [push](https://github.com/lovestream/kevin-learning-home/actions/runs/40205872734) / [PR](https://github.com/lovestream/kevin-learning-home/actions/runs/40205876513) 留档。

第二次 CI 显示新版 Docker 在无容器的网络 inspect 中未给出默认 Gateway；进一步显式指定网关（与 NAS 规划一致），不再依赖此隐式值。该失败仍发生在 CI，不曾停止 NAS 旧入口。

进一步的真实镜像启动门禁发现，严格裁剪最终镜像时遗漏了 schema 运行时所需的 `intro-visuals.mjs` 常量模块；已仅补入该冻结模块，并在网络启动前增加实际镜像 Node import 闭包门禁，保留零身份/零 SQLite。就绪失败会归档最后响应与无账号容器日志，便于精确定位，不再只给超时。

镜像 HTTP 启动及全 70 DTO/页面、Host/Origin/写 API 阴性已通过；最后的文件系统探针误把 Debian 基础镜像自带的空 `/media` 目录判作学习数据。已改为校验该目录为空，同时仍严格要求零 Docker 挂载、没有 `/data`/`/content`、正式服务和账户工具。没有移除数据隔离门禁。

## 实际部署版本与证据链

| 项目 | 实测值 |
| --- | --- |
| NAS / Docker / Compose | DS918+ x86_64 / 20.10.3 / 1.28.5 |
| 源码发布提交 | `974fdee8134c833d718b574d79e18d96756a73e0` |
| Node / 容器用户 | 24.15.0 linux x64 / 1024:100 |
| 镜像 ID | `sha256:03fc82b25c501c8e8f71ef92ea66c3e5d14e1f0cc2fee7be8b0c1cb90b60d521` |
| SSH 传输归档 | 81,593,184 bytes；SHA-256 `9880c1d474987ab02440c5e6b3f84bae24f5b04c29c84979a059c2aa750f2034` |
| 独占资源 | `/volume2/homes/admin/klh-math-preview-20261025-c6ae9e7f`；同前缀 app / network |
| 限制 | 256 MiB / cpuset 0 / 只读根 / cap-drop ALL / no-new-privileges / 零挂载 |
| 实际发布 | `192.168.2.100:38444 → 4179/tcp`；内容服务只监听专用网络 IP |
| 代表课 / 全量 | 30 / 210 PASS；18,085 ms / 131,649 ms（总运行时间，非单请求性能指标） |
| 普通 Mac Chrome | 根目录显示 70 课，G3-U01-B03 六步课堂可用；折叠 0%→100%，返回目录及回退后刷新成功 |
| 实体手机 / iPad | `NEEDS_USER_ACTION`，自动化 390/768/1280 视口不是实体设备验收 |

部署源码的 [push CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40207392981) 与 [pull_request CI](https://github.com/lovestream/kevin-learning-home/actions/runs/40207396436) 均完整成功，导出同一镜像并校验 archive/image/revision。NAS 先运行无宿主端口的 staging 容器，内部版本检查通过，才停止原 owned TLS 让出 38444；最终新 app ID 是 `ed08a3afdf924f1c349f4c0bcdd13e38f9b1bc55f87f6057a3ba4a7384ca79fc`。

NAS 浏览器测量脚本提交 `eb59d3fc04dedca89a693d9e6e04f3dfb6245808`，开始时 working tree clean；测试预期运行版本始终明确为上述 `974fdee`，不是伪称 NAS 部署了测量脚本提交。后续仅补测试、目录守卫、归档工具和报告，**166 个 Docker COPY/依赖/构建输入逐文件 hash 与已部署提交完全相同**；实际 NAS 读取的 seal 中 11 个静态文件与测试构建完全相同。最终文档提交不为更新一个 Git 元数据 SHA 而重建用户入口。复审时可逐项重算 [release-inputs.json](evidence/math-full-nas-r2/release-inputs.json)；最终 HEAD 的完整双 CI 另在 PR 正文交付。

- [实际交付/保护性不变检查](evidence/math-full-nas-r2/delivery.json)、[实时版本响应归档](evidence/math-full-nas-r2/runtime.json)、[CI 镜像证明](evidence/math-full-nas-r2/image.json)、[实际 NAS 静态 seal](evidence/math-full-nas-r2/static-seal.json)
- [实际 NAS 全部 210 场景](evidence/math-full-01/browser.json)、[30 代表课](evidence/math-full-01/checkpoint.json)、[逐课矩阵](evidence/math-full-01/lessons-coverage.json)：原公共矩阵已更新为真实 NAS 测量，并保留原全量基线证据。测量不 mock 后端，不忽略 TLS，不写账号/学习数据。
- [普通 Chrome 目录截图](evidence/math-full-nas-r2/native-chrome-catalog.jpg)、[实际折合截图](evidence/math-full-nas-r2/native-chrome-fold100.jpg)；截图已实际查看。页面使用普通用户 Chrome，未绕过证书警告、修改浏览器信任或使用临时不安全浏览器参数。

Mac **既有** `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 已交付 `打开NAS学习家园.webloc` 和 `NAS学习家园使用说明.md`。写入前验证目录归属、旧 delivery marker 及 NAS 构建版本；文件 0600，保留用户已有文件，不增加工作树或新项目副本。用户双击快捷方式即可使用。

## 回退演练和资源保护实测

执行了两轮回退/恢复；第二轮完成全部技术探针：[回退原始结果](evidence/math-full-nas-r2/rollback-probe.json) 与[可复现的只读探针](evidence/math-full-nas-r2/probe-rollback.mjs)。原 TLS ID `a1629cb9635ed627aa927b969e12cf37ec0a827b9c5469f9ad5d35c1c3173f85` 保持；旧 app ID `188bcd47bf4b8781376b5cccbf0c8c38752ea261ca34ed8385ba0ed2e813d49c` 从未停止。恢复旧入口时 `/login` 200、`/health/ready` 200/ready、匿名课程 API 401；随后重新停止该 TLS 并恢复同一个新 HTTP app，运行版本仍为 `974fdee`，普通 Chrome 刷新目录成功。

11 个受保护容器的 ID、镜像、启动时间、状态、重启计数、端口和完整挂载元数据 canonical hash 前后一致；旧合成 data/tls 所有文件的长度/hash 前后一致。原始 Mounts 返回顺序的差异单独记录在 preflight，不更改任何字段来掩盖变化。原 38443、8 个生产服务、旧数学与英语项目、真实学习数据均未操作。没有清理当前用户入口；旧试用完整保留供回退。

## 本次真 NAS 暴露的问题及处理

1. 首次 stage 因群晖新目录继承权限（mkdir 0700 后实际 0777）安全停止，尚未切换旧入口。核实本次 owner-marker、真实路径和 UID 后，只 chmod 本次新根/归档目录 0700、marker 0600。工具已补同样顺序，新增测试确认 marker 不符时绝不 chmod；没有改系统或既有服务目录权限。
2. 第一次真实 HTTP 浏览器探针失败 `ReferenceError: caches is not defined`，并非课程渲染失败。[原始失败归档](evidence/math-full-nas-r2/checkpoint-initial-http-probe-failure.json)。HTTP 缺少 Cache API/Service Worker，测试改为 API 可用时枚举且要求为空、不可用时视为无法创建；storage/IndexedDB/cookie/刷新状态/无写请求检查全部保留。其后 30 和 210 场景均通过。
3. 回退探针最初采用 Python 3.14 严格证书 profile，拒绝旧 CA 缺少 keyUsage；没有改旧证书。改用 Node 24 默认 TLS 验证并显式给原公开 CA，`rejectUnauthorized:true`、主机名和证书验证保留。另一次探针在响应结束后读取已释放 socket 产生 TypeError，已改为响应开始即捕获 authorized；最终三个只读请求全部通过。这只是旧版回退的技术检查，用户访问新 HTTP 不需要 CA。

## 暂停点

PR #18 保持 Draft、等待独立审查；不合并、不关闭 Issue #15。当前已完成 NAS 的 70 课教学交付，未宣称 849 题或数学整站完成。后续 #16/#17 使用独立 Draft PR，目标仍是同一 NAS 学习家园；真实账户、学习记录与生产部署继续暂停。
