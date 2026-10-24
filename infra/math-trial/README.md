# MATH-NAS-01 独立合成试用

任务：[Issue #13](https://github.com/lovestream/kevin-learning-home/issues/13)。只操作 `plan.json` 的新资源；不读取旧口令、Cookie 或数据库。正式应用、Dockerfile、Compose 和旧 `infra/trial` 保持原样。

## 离线检查

```sh
python3 infra/math-trial/controller.py deploy --dry-run
python3 -m unittest discover -s tests/math-trial -p 'test_*.py' -v
node --test tests/math-trial/*.test.mjs
node --check tests/math-trial/browser.mjs
```

`--dry-run` 不连接 NAS、不创建目录。14 项 Python 安全测试模拟 SSH；Node 测试只在本机临时目录/端口运行 TLS 代理与 Chromium 独立证书配置的正反验收。

## 明确批准后的本地操作

本任务的 LAN IP/38444、源 SHA、CI run、runId 固定在计划中；不同地址/端口、旧计划、符号链接私有状态、已有目录/资源名、资源不足都会停止。不能改计划以绕过失败后直接重试。新一次试用必须重新审查所有权与授权。

1. 新镜像工作流核验指定 main push CI 成功，`git archive` 精确 SHA，用未修改的正式 Dockerfile 构建 amd64。只有一天有效的 Actions artifact，无公共 registry、无 runner SSH。下载 artifact 到本工作目录的 `.trial-private/bundle`；不要提交私密目录。
2. `node tests/math-trial/old-invariance.mjs before /明确提供的旧公开CA.cer` 只读采集旧 10 容器的最少元数据和旧站匿名 HTTPS/公开证书；不读取旧私钥/密码/数据库。旧站真实账号登录由用户手工验收。
3. `python3 infra/math-trial/controller.py deploy --bundle .trial-private/bundle`：重新预检，再创建带 owner marker 的独立 root，验证镜像归档 SHA/配置 imageID/标签、NAS 原生模块和实际课程资源 hash。离线交互 TTY 合成账户建立后，新 app 只连独立 internal bridge；新 TLS proxy 加入独立 edge bridge，仅发布指定 LAN IP:38444。
4. `node tests/math-trial/browser.mjs`：实际 NAS TLS/Node/SQLite 联调。读取本次独立私密凭据，使用全新 Chromium profile 的专属 CA 信任；全程保留 TLS 验证。不改变系统 Keychain/其它浏览器配置。每次成功课程响应及实际 JS/CSS 均对镜像 manifest；11 学习表逐表 count/hash 不变。正式离线 CLI 撤销授权时先停本次 app，完成后恢复同一个容器。
5. `python3 infra/math-trial/controller.py status` 和旧服务 `after` 校验；结果进入报告，秘密留在 `.trial-private`。任何验证失败停止新容器，保留安全诊断，不清理旧资源。仅在具体错误审查和修正后，显式 `resume` 并重新完整验收，不自动重试。
6. `.trial-private/START-HERE.md` 是私密新入口/账号说明。`node tests/math-trial/interactive.mjs` 打开本地、完整 TLS 校验、独立配置的试用浏览器。不要全局安装 CA，不要跳过移动设备证书警告。手机/iPad 反馈前为 `NEEDS_USER_ACTION`；缺少设备可用的证书信任方式时先停止该设备验收，单独审查下一方案。

## 资源归属和收尾

计划前缀限定 `app/tls/admin/verify` 容器、`network/edge` 网络、专用镜像标签和 `/volume2/homes/admin/<prefix>`。每次 Docker 删除/停止校验完整 ID、标签和镜像；目录删除核对 owner marker。CPU 绑定 0、app 512MiB/TLS 128MiB、非 root 1024:100、只读 rootfs、cap-drop ALL、no-new-privileges、有限日志、restart=no。Docker 管理只使用已配置 alias 的 Docker-only sudo。

`stop` 仅停新容器并保留诊断；`cleanup` 仅删本次拥有的资源。试用默认保留给用户验收，不自动清理、续期或生产化。证书七天到期，不能把本试用当作上线或备份方案。旧站匿名可用不能代替旧账号登录实测；报告必须区分这两项。
