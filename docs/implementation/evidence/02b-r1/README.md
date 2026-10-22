# IMPLEMENT-02B R1 证据

2026-10-23。原02B证据在[02b](../02b/README.md)完整保留，本目录只记录R1；所有账户与数据合成，无数据库、口令、cookie、CSRF值、原始网络trace或真实记录。

[任务来源](provenance.json)、[整改报告](../../IMPLEMENT-02B-review-R1.md)、[旧项目Git元数据](protected-repositories-before.json)。

## 失败与修复记录

- [修复前持续场景失败](history/baseline-continuity-failure.json)：编译网页为147a314基线；新增测试工作区为dirty，不将它冒充修复提交。两轮轮询后连续性断言失败，诊断字段按既有规则去掉长字符串。
- [首次键盘设置失败](history/initial-keyboard-setup-failure.json)：另外4个新场景通过，连续场景Tab绕出文档触发真实blur保护；改用文档内Shift+Tab，保护不变，定向复测通过。

本轮完整本地及现代Linux CI安全JSON/测试清单将分别归档local/、ci/；只补一幅持续焦点截图，不重复提交全部14幅旧页面截图。实际artifact仍执行所有18场景，保留旧3视口与Docker/Compose。

最终归档提交本身的准确HEAD与两类完整CI由[Draft PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)正文给出，避免文档引用自身提交SHA。NAS/生产HTTPS/实体设备仍NOT_RUN。

## 本地完整验证

[命令与环境](local/verification.json)、[原60项清单](local/test-cases.json)、[18项真实界面场景与r1Evidence](local/shell-browser.json)、[原3视口](local/browser.json)均PASS_LOCAL。原13项名称全部保留，新增5项；12秒连续场景为实际墙钟且至少两次真实200，normal轮询不改变解锁期限/节点/焦点。[持续焦点截图](local/r1-parent-continuity-1280.png)只展示合成资料。执行时dirty=true、基线HEAD147a314，不冒充精确实现提交CI。
