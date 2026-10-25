# Kevin Learning Home · Kevin 学习家园

## 当前入口（2026-10-25，以下历史段落不代表当前状态）

MATH-01 已合并，**新数学合成试用：`https://192.168.2.100:38444/`**；孩子登录后数学「只读课堂」、英语「待迁入」。旧 `38443` 保留 02B，两科仍「待迁入」，账户与证书不同。

用户 Mac 的固定交付目录是 **`~/Documents/Kevin-Learning-Home-Trial/`**。Finder「前往文件夹」输入此路径，打开 `START-HERE.md` 获取新合成账号，双击 `打开数学课堂.command`。已在实际 Mac Finder 确认可见，并用本机可见 Chromium 登录首课。指南 0600、目录 0700，只交付公开 CA，不复制私钥。启动后保留终端；重复启动不再建配置，关闭最后标签后可重开。密码只在本机指南，不放 GitHub、不保存到浏览器。

唯一活动工作副本 `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial`，原秘密源在其 `.trial-private`；实际用户名绝对路径已在本机指南和交付消息给出。共 11 个相关项目目录，只有一份 math-trial；[逐目录整理清单](docs/implementation/MATH-NAS-01-R1-DIRECTORIES.md)区分保留、两份可清理候选及待归档项，**本轮零删除**。

测试 CA 到期 **2026-10-31 13:58:29 UTC**，只在专属 Chromium profile 信任。Safari/手机/iPad 仍 `NEEDS_USER_ACTION/NOT_RUN`；不跳过警告或全局安装根证书。长期受信域名路线仅作评估，未改 NAS/Tailscale/系统信任。

[R1 交付报告](docs/implementation/MATH-NAS-01-R1-DELIVERY.md)、[原 NAS 4/4 报告](docs/implementation/MATH-01-NAS-TRIAL-REPORT.md)、[当前交接](docs/handoff/current.md)；精确最终 HEAD 的 push/PR 完整 CI 见 [Draft PR #14](https://github.com/lovestream/kevin-learning-home/pull/14)正文。仍保持 Draft，不合并、不进入 MATH-02。旧数学/英语独立，无真实记录迁入、练习/钱包/蛋仔整合或生产部署。

## 工程验证与历史证据

本地使用 Node 24.15.0 / npm 11.12.1。`npm ci`、`npm run build`、`npx playwright install chromium` 后运行 `node scripts/verify.ts`，保留 60 Node、18 UI、3 基础视口、12 数学 Node、9 数学浏览器；Linux CI 另验 Docker/Compose 和恢复。工具回归为 `node --test tests/math-trial/*.test.mjs` 与 `python3 -m unittest discover -s tests/math-trial -p 'test_*.py' -q`。

PR5/6/7（工程底座、身份、网页外壳）、PR8（02B 隔离试用）、PR10（数学来源审计）、PR12（数学首课）已合并。[项目状态](PROJECT_STATUS.md)、[MATH-01 实施报告](docs/implementation/MATH-01-EXECUTION-REPORT.md)、[来源审计](docs/implementation/MATH-00-SOURCE-AUDIT.md)、[02A 身份接口](docs/implementation/IMPLEMENT-02A-api-and-operations.md)、[底座部署手册](docs/implementation/IMPLEMENT-01-deployment-runbook.md)保留各阶段证据，按归档时点解释。

正式家庭使用前仍须独立完成长期受信 HTTPS、真实身份、加密异地备份/新卷恢复、Linux 4.4 与 Node 24 维护兼容性及上线验收。
