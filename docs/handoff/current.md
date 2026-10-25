# Kevin 学习家园：当前交接

## 当前：MATH-FULL-01 70 课完成，单个 Draft PR 待审

2026-10-25，执行 [Issue #15](https://github.com/lovestream/kevin-learning-home/issues/15)，分支 `codex/math-full-01-70-lessons`，复用原 `~/Downloads/codex/kevin-learning-home-math-trial` 工作目录。冻结数学来源 `a7c05aaa8d9c5eabae4f3453807f830da1cbf279`；从最新 main `44dca2affc369f89b3540ec7e1a11f0e3a100c08` 起步，PR14 merge `942dc508858f548af1e0517aa3365e08bfbee0e4` 与后续文档 CI 均已核实成功。

**70/70 六步教学与原教具已完成；64 交互/6 静态；全 210 浏览器场景通过。** 先完成代表课 checkpoint，再在一个分支连续做完全量。源版本/draft/单元/先修和原文保留；5,003 字段投影与 145 来源/目标 hash 可追溯，未知 schema/hash/资源拒绝显示。51 种模式的 registry 复用原纯几何、计量、运算、教材 React 教具；不复制整包原题库、旧服务/进度对象或 iframe。

## 用户真正可以进入的地址

**http://127.0.0.1:4179/**，仅当前 Mac 回环，不需登录、密码、证书或真实数据。固定文件夹 `~/Documents/Kevin-Learning-Home-Trial/` 中有 `打开70课体验.command` 与 `70课体验说明.md`，权限 0700/0600。已在本机可见 Chromium 核对 70 个链接，并操作第三课折盒 0%→100%；关闭释放端口/runtime，重开成功。此后 Mac 锁屏，进一步 Finder 人工双击未执行；用户解锁后按指南体验。原私密 START-HERE、CA 与单课启动器未覆盖。

NAS 38443/38444 保留旧 02B/合成单课，**新 70 课 NAS 及实体手机/iPad NOT_DEPLOYED**。390/768 触屏模拟、trusted touch/mouse 与键盘测试是浏览器证据，不是跨设备生产上线。本机无身份回环 HTTP 不等于降低正式/NAS HTTPS。

## 工程边界与验证

`apps/preview` 是独立 preview build/content-only 进程，显式 `KLH_CONTENT_PREVIEW=1`；正式 server 不解释该标记、不导入预览、不绕过 session/grant/CSRF。内容和资源启动时校验后缓存；没有 SQLite、学习写接口、成绩、阅读记录、钱包或蛋仔。操作只在 React 内存，刷新清空，零 localStorage/sessionStorage/IndexedDB/Cache Storage/Service Worker/cookie。正式 Dockerfile/Compose 不变，最终层不包含预览目录；lucide 仅预览构建 devDependency。

- 原 60 Node / 18 UI / 3 基础视口 / 12 数学 Node / 9 数学浏览器、typecheck/build 本地全部通过。
- 新 16 项测试、145 目标/5,003 字段来源检查、70 实际 GET 与 210 实际浏览器六步/图形/操作/刷新测试通过；正式匿名拒绝与家长权限回归保留。
- 最终事件 HEAD 的 push / pull_request 全 CI 包含原 Docker/Compose/恢复；精确 SHA/run/状态在本批 Draft PR 正文核实。本地实测明确记录 base HEAD + dirty 及实际文件 hash，不冒充最终干净提交。

[完整报告](../implementation/MATH-FULL-01-REPORT.md)、[来源/许可与全站范围](../implementation/MATH-FULL-SOURCE-SCOPE.md)、[70课矩阵](../implementation/evidence/math-full-01/lessons-coverage.json)、[210场景](../implementation/evidence/math-full-01/browser.json)、[Mac交付](../implementation/evidence/math-full-01/mac-access.json)、[截图索引](../implementation/evidence/math-full-01/screenshots.json)。复现：`npm ci` → `npm run build:math-preview` → `npm run preview:math`；测试命令见报告/README。

## 下一批与停止线

[Issue #16](https://github.com/lovestream/kevin-learning-home/issues/16)：全部 849 题（number357/choice93/explanation335/expression25/fields39）、五组含 review、首答→三项自查→终答→核对，仅临时内存；335 解释题必须人工核对。本批只稳定教学 DTO/ID/版本/hash 契约，未提供题面/答案/临时判分端点。下一批按独立 `codex/math-full-02-practice` 与单个 Draft PR 执行，不能把公开教学 DTO 改成答案包。

数学小侦探、17 已审卡/43 暂缓卡、四至六年级实际课程与蓝图仍未迁；不要把 70 课等同整站完成。正式账号/密码、真实学习数据、学习持久化、积分/钱包/蛋仔与长期部署暂停。旧数学、英语和 NAS 配置未修改，不删除其它工作树。**保持本批 Draft，等待 ChatGPT 独立审查，不自行合并或越过下一批审查关口。**

历史单课与 NAS 证据仍见 [MATH-01](../implementation/MATH-01-EXECUTION-REPORT.md)、[MATH-NAS-01](../implementation/MATH-01-NAS-TRIAL-REPORT.md)、[R1 可用性交付](../implementation/MATH-NAS-01-R1-DELIVERY.md)。这些归档中的旧待审/未迁状态按当时时点阅读；PR5/6/7/8/10/12/14 已合并。
