# Kevin Learning Home · 项目当前状态

## R2：按用户最新要求采用局域网 HTTP，切换执行中

用户验收标准是 **NAS 上同一个 Kevin 学习家园入口**：直接进入免登录数学目录，保留已认可的六步课堂，随后接通原 849 题和其它实际可用数学功能。Mac 本地与 CI 是开发证据，不能代替 NAS 交付，也不能把 70 课教学称为全站迁移完成。

本轮按 [PR #18 R2](https://github.com/lovestream/kevin-learning-home/pull/18#issuecomment-6399021659) 在原分支/工作副本继续；受控替换现有合成试用 38444 已获用户授权。旧 38443、8 个生产服务、原数学/英语、真实学习数据、DSM/Docker 权限及家庭 Tailscale 配置保持原样；用户随后明确要求使用局域网 HTTP；证书方案已停止，不改 Tailscale/DSM/DNS。PR #18 保持 Draft，不合并。

70/70 教学与原教具代码保留，64 交互 / 6 静态、30 代表课及 210 浏览器场景已通过；原 HEAD `9aa2371bb3eb28055a3b5879f48dc6ebc73c457b` 两套完整 CI 成功。**这些是此前中间成果：NAS 新 70 课尚未交付。**

R2 只读核查：DS918+ Docker 20.10.3 / Compose 1.28.5 管理权限可用；38444 的旧 app/TLS 两容器与旧 38443、8 服务仍在运行。38444 证书为旧私有 CA，2026-10-31 到期，默认 TLS 信任校验失败；DSM 443/5001 同样是未受信的 Synology 自签链。NAS Tailscale 名称 `diskstation.taildbf7c.ts.net`，Serve 当前为空，未申请证书、改设置或停止旧入口。

已补齐 preview-only Linux/amd64 镜像、私网监听/精确 HTTP Origin、数学路由与科目导航、owned 部署/回退工具。目标为 **http://192.168.2.100:38444/**，无账号无证书；正在验证并实装。见 [R2 报告](docs/implementation/MATH-FULL-01-NAS-R2-REPORT.md)。

[路线图](docs/implementation/MATH-FULL-ROADMAP.md) · [交接](docs/handoff/current.md)。后续依次为 [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 849 题和 [Issue #17](https://github.com/lovestream/kevin-learning-home/issues/17) 其余可用功能，均交付同一 NAS 入口；无正式账号/成绩持久化/积分/蛋仔。
