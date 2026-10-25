# MATH-FULL-01 NAS R2：局域网直接交付

## 当前执行状态

用户在 2026-10-25 明确要求“不用 HTTPS，在本地 NAS 用”。此最新指令覆盖 R2 原文的证书前置要求：采用 **http://192.168.2.100:38444/**，无账号、无证书、无真实数据、无成绩持久化。此前 Tailscale 证书方案停止，没有申请证书或更改 Tailscale/DSM/DNS/权限。70 课现有代码继续复用，不重做课程。

本报告随执行归档真实结果；切换完成前状态为 `CODE_READY, NOT_USER_DELIVERED`。最终运行版本、NAS 验证、回退结果及精确最终 HEAD 的两套 CI 在本 PR 正文追加核实，不能沿用旧 R1 CI 当作本轮通过。

## 运行与切换设计

专用 `infra/math-preview/Dockerfile` 构建 Linux/amd64 Node.js 24.15.0 内容镜像，最终层只有 70 课 DTO、真实静态 bundle、Zod 及内容服务器，不含 AuthService、MathService、SQLite、fs-ext 或正式账户工具。独立 owned 网络与一个非 root、只读根、256 MiB、单 CPU 容器；无数据挂载。显式启用容器模式，绑定实际分配的私网 IP，通过精确 Host/Origin 和 LAN/本网络网关白名单提供内容。宿主机只发布 `192.168.2.100:38444`，不绑定公网、默认所有网卡或新建互联网服务。

`/` 直接显示学习家园→数学→70课教材单元目录，`/subjects/math` 为同一目录，`/subjects/math/lessons/:id` 为同一六步课堂；保留单元筛选、相邻课及返回目录。英语显示待迁入，849 题/侦探/卡片等未迁功能明确说明。无登录/解锁/密码；GET/HEAD 之外 405，正式 `/api/v1/*` 404，浏览器不写 storage/cookie。

原页面 SHA-256 校验使用仅安全上下文可用的 WebCrypto；已改用固定 `@noble/hashes@2.4.0` 的纯 JS SHA-256，在 LAN HTTP 下继续逐课校验，**没有跳过 hash 或关闭 CSP**。与 Node 独立 SHA-256 对比 Unicode 与全部 70 DTO；许可证纳入 notices，npm audit 为零问题。该库只用于预览浏览器构建，不进入正式服务运行依赖。[官方用法](https://github.com/paulmillr/noble-hashes#usage)。

`infra/math-preview/controller.py` 先只读确认原 owner marker、旧 38444 两容器/镜像/挂载/证书目录及合成数据 hash，记录另外 11 个受保护容器（原 8 服务、38443 两容器及旧数学 app）。不读真实数据库。新镜像通过 CI 生成的 archive hash 和 image ID 校验，经 SSH 加载专用 NAS root，先在无宿主端口的容器内核验；再只停原 owned TLS 容器让出 38444。旧 app、合成卷、证书/密钥与旧 TLS 容器不删除或覆盖。任何新入口失败会尝试恢复原 TLS；回退命令仅操作本轮 app 与已核实的原 TLS ID。

## 验证门禁

- 70 课/64 交互/6 静态、30 代表课、210 场景保留；补数学路径、科目导航和无密码输入验证。
- 原 16 项 Node，加 2 项 LAN HTTP/独立 SHA-256 测试、5 项部署保护测试；原全部 Node/UI/数学/Compose/生产容器恢复门禁完整保留。
- 新 preview-only Docker 真容器检查实际 70 DTO/页面、Host/Origin/写/API 阴性、镜像不含正式服务、零学习挂载、非 root 与只读根；push 导出可复核镜像，PR 同样执行测试。
- 真 NAS 浏览器仅允许 `--nas` 明确指定该 LAN HTTP 地址和预期构建 SHA，不忽略 TLS、不假装 localhost 是 NAS；断言不安全上下文下所有课仍校验并展示，触摸/键盘/刷新及零持久化保持原门禁。Mac 可见浏览器另做实际访问；实体 iPad/Safari 未实际操作不能标 PASS。

## 回退与边界

`python3 infra/math-preview/controller.py rollback` 恢复原 38444 合成单课 HTTPS；`switch` 切回新 HTTP 数学目录。仅在本轮实际完成来回切换并核对旧入口与新入口后，才能标回退 PASS。此回退不是修改旧真实服务，也不重建原数据库。用户无需运行这些管理员命令。

本批是 70 课教学上线，**不是完整数学网站迁移完成**。849 题属于 Issue #16，其他可用数学能力属于 Issue #17；后续都需进入同一 NAS 学习家园，不另交 Mac 演示。PR #18 保持 Draft、不合并；不迁真实记录或放宽正式身份保护。

只读工具初次对比发现 Docker 返回的 Mounts 顺序不稳定。现按挂载目的路径排序，保留全部来源/读写等字段后比较；新增回归确保重新排序不误报警、权限变化仍失败。原服务身份、镜像、启动时间与挂载内容实际未变。

首次 R2 CI 的专用镜像已构建成功，随后 CI 容器启动因自动分配的网络未声明子网而拒绝固定 IP；NAS 工具本来就显式指定子网，尚未执行任何 NAS 写入。已为 CI 使用同样的显式专用子网。镜像门禁提前执行并单独归档，方便传输；原全部回归、全课浏览器、Compose/正式容器恢复仍完整执行，未删减或忽略失败。首次失败 [push](https://github.com/lovestream/kevin-learning-home/actions/runs/40205872734) / [PR](https://github.com/lovestream/kevin-learning-home/actions/runs/40205876513) 留档。

第二次 CI 显示新版 Docker 在无容器的网络 inspect 中未给出默认 Gateway；进一步显式指定网关（与 NAS 规划一致），不再依赖此隐式值。该失败仍发生在 CI，不曾停止 NAS 旧入口。

进一步的真实镜像启动门禁发现，严格裁剪最终镜像时遗漏了 schema 运行时所需的 `intro-visuals.mjs` 常量模块；已仅补入该冻结模块，并在网络启动前增加实际镜像 Node import 闭包门禁，保留零身份/零 SQLite。就绪失败会归档最后响应与无账号容器日志，便于精确定位，不再只给超时。
