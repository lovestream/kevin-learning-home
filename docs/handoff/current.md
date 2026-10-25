# Kevin 学习家园：当前交接

## R2：以 NAS 实际入口验收

用户验收标准是 **NAS 上同一个 Kevin 学习家园入口**：直接进入免登录数学目录，保留已认可的六步课堂，随后接通原 849 题和其它实际可用数学功能。Mac 本地与 CI 是开发证据，不能代替 NAS 交付，也不能把 70 课教学称为全站迁移完成。

本轮按 [PR #18 R2](https://github.com/lovestream/kevin-learning-home/pull/18#issuecomment-6399021659) 在原分支/工作副本继续；受控替换现有合成试用 38444 已获用户授权。旧 38443、8 个生产服务、原数学/英语、真实学习数据、DSM/Docker 权限及家庭 Tailscale 配置保持原样；证书与网络系统变更另需批准。PR #18 保持 Draft，不合并。

70/70 教学与原教具代码保留，64 交互 / 6 静态、30 代表课及 210 浏览器场景已通过；原 HEAD `9aa2371bb3eb28055a3b5879f48dc6ebc73c457b` 两套完整 CI 成功。**这些是此前中间成果：NAS 新 70 课尚未交付。**

R2 只读核查：DS918+ Docker 20.10.3 / Compose 1.28.5 管理权限可用；38444 的旧 app/TLS 两容器与旧 38443、8 服务仍在运行。38444 证书为旧私有 CA，2026-10-31 到期，默认 TLS 信任校验失败；DSM 443/5001 同样是未受信的 Synology 自签链。NAS Tailscale 名称 `diskstation.taildbf7c.ts.net`，Serve 当前为空，未申请证书、改设置或停止旧入口。

正在补齐 preview-only Linux/amd64 镜像、容器专用监听/精确 HTTPS Origin、数学路由与科目导航、受控 TLS 边界、owned 部署/回退工具及真实 NAS 验收。可信证书关口必须解决后才能切换；不能忽略 TLS 错误或装全局根证书来冒充 Safari/iPad 可用。具体状态将归档到 `docs/implementation/MATH-FULL-01-NAS-R2-REPORT.md`。

工作副本仍为 `~/Downloads/codex/kevin-learning-home-math-trial`，分支 `codex/math-full-01-70-lessons`；未新增或删除工作树。旧合成试用根目录 `klh-math-trial-20261024-8f228391` 及原私密凭据/CA 必须保留，不能复制其数据库到新预览。后续 849 题使用独立 Draft PR，接口稳定后接到同一 NAS 入口；70 课未上线前不得将 Mac 入口当完成，也不自动开始真实记录迁移。
