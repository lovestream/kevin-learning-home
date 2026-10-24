# MATH-NAS-01 执行报告（执行中，尚未创建 NAS 资源）

任务：[Issue #13](https://github.com/lovestream/kevin-learning-home/issues/13)。本分支只新增独立数学只读试用工具和证据；不改正式应用、Dockerfile、Compose、旧 02B 工具和真实学习记录。不开始 MATH-02。

## 冻结代码与构建

- 工具分支从最新 main `ffde6d5ed50de470e160ee56a0b3ef0e2782110f` 创建；与任务指定运行源的差异仅项目状态/交接文档。
- 镜像源固定 `e594b3e6db0563f6a6b56bc2b0724f1bcd8c961e`，[main CI 40085571114](https://github.com/lovestream/kevin-learning-home/actions/runs/40085571114) 确认为 main push / completed / success。
- 独立镜像 [build 40099510393](https://github.com/lovestream/kevin-learning-home/actions/runs/40099510393) 已成功。源 `git archive`、未修改正式 Dockerfile、linux/amd64、Node 24.15.0/npm 11.12.1/锁文件；无公开镜像推送、无 runner SSH。Artifact `12562685287` / `klh-math-trial-bundle`，一天有效，下载/完整核验尚在进行。

## 当前已核实事实

- NAS 只读连接和已配置的 Docker-only 管理可用。UID/GID 1024:100、Linux 4.4.180+ x86_64、Docker 20.10.3、Compose 1.28.5；ext4 可写，本次候选 root 不存在，38444 空闲。部署前会重新核验空间/内存/旧服务和资源名。
- 原 8 服务和旧 02B 两容器均运行，ID/状态/StartedAt/RestartCount 与初次快照相同；旧站 TLS 链/IP 验证成功，匿名登录页与 readiness 200，数学仍 awaiting-migration。没有读取旧账号、Cookie、私钥或数据库。
- 新控制器 `--dry-run` 不连接 NAS、不写文件；14 项 Python 安全测试通过。新代理完整 TLS 校验测试及专用 Chromium profile 证书信任测试通过；未知 CA、错误 SAN、过期证书和其它 profile 均拒绝。不改系统 Keychain、不使用忽略证书错误参数。
- 本地完整回归已通过：原 60 Node、18 UI、3 基础视口、新 12 数学 Node、9 数学浏览器、typecheck 和正式 build。Docker/Compose 与精确最终 HEAD 的 push/PR CI 在交付前另行确认。

## 尚待执行

新镜像归档及实际 JS/CSS/DTO hash 核验、NAS 创建/启动、真实 LAN 浏览器四组场景、11 学习表逐表 count/hash、新资源安全约束、旧服务最终不变比较及图像实际检查尚未完成；当前不得称为“NAS 已上线”。

实体手机/iPad 数学体验：`NEEDS_USER_ACTION`。旧账号登录：`NEEDS_USER_ACTION`，因本任务同时禁止读取旧密码/Cookie/DB，由用户手工完成，不用匿名 200 代替真实登录。

## 已发现的限制与纠正记录

1. Chrome 的证书导入按钮使用原生文件对话框，headless Playwright 无法通过网页 filechooser 完成；本机探针超时后已关闭独立 profile。改用 Chromium 文档中的独立 profile `ServerCertificate` v1 数据库，只加入新 CA，验证证书链/SAN/有效期和 profile 隔离，不改系统信任。
2. 新代理的严格 TLS 单测初版把恶意 HTTP Host 同时当作 SNI，先被 TLS SAN 拒绝，未到 HTTP Host 防线。现分别固定实际连接的 TLS 身份和待攻击的 HTTP Host；正确 TLS 下 HTTP 403 已验证。没有修改正式代理或降低 TLS。
3. 旧服务初次本地元数据快照是 `{rows,sha256}` 对象；只读比较器初版误当数组，已修正。没有发生 NAS 写入或服务变化。

这些是试用工具/探针修正，不是正式数学应用或认证缺陷。所有最终状态以本报告交付更新和最后同一 HEAD 两套 CI 为准。
