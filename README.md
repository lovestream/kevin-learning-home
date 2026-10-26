# 当前交付：NAS 局域网免登录数学课堂

R3 正在同一 PR #18 将目录恢复为“上册 9 单元 39 课／下册 8 单元 24 课／7 节基础衔接”，增加知识点层和返回原单元。当前 NAS 仍为 R2，R3 发布与真机结果见 [R3 执行报告](docs/implementation/MATH-FULL-01-NAS-R3-REPORT.md)。验收后继续 849 题及其它数学能力，不另开基础建设。

用户已明确要求采用 **http://192.168.2.100:38444/**，不使用 HTTPS/证书，不调整 Tailscale。R2 已在原 PR #18 完成 NAS 交付，状态以 [R2 执行报告](docs/implementation/MATH-FULL-01-NAS-R2-REPORT.md)及 PR 最终 NAS 证据为准。下方 localhost 仅是开发复现，不作为用户交付。

# Kevin Learning Home · Kevin 学习家园

本分支 **MATH-FULL-01 / Issue #15** 已完成冻结入口的 70 节六步数学课堂与对应教具，交付一个 Draft PR 等待 ChatGPT 独立审查。全部仍是 draft 教学预览：64 原交互课、6 静态关系图/纸笔课；**不是 849 道练习或旧数学整站迁入完成**。

## 直接体验：NAS 局域网，无需账号

打开 **[NAS 学习家园](http://192.168.2.100:38444/)**，直接进入 70 课数学目录；不需要密码、证书或 Mac 启动终端。同一局域网的 Mac、手机、iPad 使用同一个地址。普通 Mac Chrome 已实际访问并操作纸盒教具；实体手机/iPad 仍待用户体验，响应式自动化不等同实体设备验收。

Mac 已有目录 `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 内新增 `打开NAS学习家园.webloc` 和 `NAS学习家园使用说明.md`。旧凭据、CA、单课与本机启动文件保留供历史回退，不必运行。

NAS 部署源码 `974fdee8134c833d718b574d79e18d96756a73e0`；后续提交只补验证工具和文档证据，166 个镜像/课程构建输入保持相同，见 [发布输入清单](docs/implementation/evidence/math-full-nas-r2/release-inputs.json)。实际 NAS 完成 30 代表课和全部 210 场景，旧 38444 回退及恢复成功，11 个受保护容器及旧合成数据/证书 hash 不变。原 38443、数学/英语网站和真实数据不动。

体验状态只留页面内存；刷新清空，无阅读记录、成绩、积分或蛋仔。849 题和其它数学功能尚未接入，分别按 Issue #16/#17 交付同一 NAS 入口。PR #18 保持 Draft，等待审查。

## 复现与证据

Node 24.15.0 / npm 11.12.1：`npm ci`，`npm run build:math-preview`，`npm run preview:math`，然后在本机打开 http://127.0.0.1:4179/（开发复现）。可见 Mac 启动器还需 `npx playwright install chromium`。预览是 `apps/preview` 独立内容进程，必须显式启用；开发默认仅绑定 127.0.0.1，NAS 隔离容器显式绑定专用私网 IP；不依赖正式认证或 SQLite，正式容器最终运行层不含预览代码/内容。

- [执行报告与接口/边界](docs/implementation/MATH-FULL-01-REPORT.md)
- [冻结来源/许可与全站残余范围](docs/implementation/MATH-FULL-SOURCE-SCOPE.md)
- [70 课逐项验收矩阵](docs/implementation/evidence/math-full-01/lessons-coverage.json)
- [210 组真实浏览器结果](docs/implementation/evidence/math-full-01/browser.json)
- [当前交接](docs/handoff/current.md) · [项目状态](PROJECT_STATUS.md)

`node scripts/verify.ts` 保留原 60 Node / 18 UI / 3 基础视口 / 12 数学 Node / 9 数学浏览器；Linux CI 另验原 Docker/Compose 与恢复。新增 `python3 scripts/math-full-01/check.py`、`node --test --test-concurrency=1 tests/math-full-01/*.test.*`、`node tests/math-full-01/browser.mjs --checkpoint` 与完整 `node tests/math-full-01/browser.mjs`。最终精确 HEAD 的 push / pull_request 两套 CI 以本批 Draft PR 正文交付记录为准。

PR5/6/7/8/10/12/14 已合并，历史报告按归档时点解读。旧 `math-learning`、`word-request` 完全独立，不反向修改、不导入真实记录。此批完成后暂停，不自行合并或进入下一批正式开发。
