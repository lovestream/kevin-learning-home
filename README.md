# Kevin Learning Home · Kevin 学习家园

本分支 **MATH-FULL-01 / Issue #15** 已完成冻结入口的 70 节六步数学课堂与对应教具，交付一个 Draft PR 等待 ChatGPT 独立审查。全部仍是 draft 教学预览：64 原交互课、6 静态关系图/纸笔课；**不是 849 道练习或旧数学整站迁入完成**。

## 直接体验：无需账号

同一 Mac 的本机入口：**http://127.0.0.1:4179/**。已在可见 Chromium 确认 70 个课程入口，并实际进入折纸课操作；不需要账号、密码或证书安装。源码工作目录继续复用 `~/Downloads/codex/kevin-learning-home-math-trial`，没有新增 worktree。

Finder「前往文件夹」输入 **`~/Documents/Kevin-Learning-Home-Trial/`**，打开 `70课体验说明.md`，双击 `打开70课体验.command`，体验时保留运行终端。旧 START-HERE/CA/单课启动器保持原样。若 Mac 锁屏先自行解锁；本轮可见操作已在锁屏前完成，Finder 双击尚未作人工验收。

本机回环 HTTP 只用于无身份、无真实数据的内容体验，不修改正式服务的 HTTPS/session/家长授权。**新 70 课版本尚未部署 NAS，也不能在手机/iPad 输入这个本机地址访问 Mac。** 原 NAS 38443 仍是 02B，38444 仍是原合成单课；均未覆盖。

体验状态只留当前页面内存；刷新清空，无阅读记录、成绩、积分或蛋仔。完整 849 题按 [Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16) 后续独立 PR 接入，335 解释题须人工核对。正式账号、真实学习记录和生产部署暂停。

## 复现与证据

Node 24.15.0 / npm 11.12.1：`npm ci`，`npm run build:math-preview`，`npm run preview:math`，然后在本机打开上方地址。可见 Mac 启动器还需 `npx playwright install chromium`。预览是 `apps/preview` 独立内容进程，必须显式启用，仅绑定 127.0.0.1；不依赖正式认证或 SQLite，正式容器最终运行层不含预览代码/内容。

- [执行报告与接口/边界](docs/implementation/MATH-FULL-01-REPORT.md)
- [冻结来源/许可与全站残余范围](docs/implementation/MATH-FULL-SOURCE-SCOPE.md)
- [70 课逐项验收矩阵](docs/implementation/evidence/math-full-01/lessons-coverage.json)
- [210 组真实浏览器结果](docs/implementation/evidence/math-full-01/browser.json)
- [当前交接](docs/handoff/current.md) · [项目状态](PROJECT_STATUS.md)

`node scripts/verify.ts` 保留原 60 Node / 18 UI / 3 基础视口 / 12 数学 Node / 9 数学浏览器；Linux CI 另验原 Docker/Compose 与恢复。新增 `python3 scripts/math-full-01/check.py`、`node --test --test-concurrency=1 tests/math-full-01/*.test.*`、`node tests/math-full-01/browser.mjs --checkpoint` 与完整 `node tests/math-full-01/browser.mjs`。最终精确 HEAD 的 push / pull_request 两套 CI 以本批 Draft PR 正文交付记录为准。

PR5/6/7/8/10/12/14 已合并，历史报告按归档时点解读。旧 `math-learning`、`word-request` 完全独立，不反向修改、不导入真实记录。此批完成后暂停，不自行合并或进入下一批正式开发。
