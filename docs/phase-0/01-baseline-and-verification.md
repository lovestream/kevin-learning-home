# 01 · 基线、保护与实际验证

日期：2026-10-08，Asia/Shanghai。本文只陈述本轮验证；没有将旧仓库已有审计截图冒充本轮执行结果。

## 仓库冻结

| 仓库 | 本地 HEAD | GitHub 已核对 ref | 初始工作区 |
| --- | --- | --- | --- |
| math-learning | `8e9115442b3978eee0d4821750ce04f47954bd26` | `audit-fixes-20261002` = 同一 SHA；`main` = `1e8199dd2963c70f539b23300a86e7e645350798` | 跟踪文件干净 |
| word-request | `d0b42a8872a7e87433b96770519203630223b6f2` | `main` = 同一 SHA | 跟踪文件干净；一个既存未跟踪词包 |
| kevin-learning-home | `3c39a8d9a62d1cabf264d8419ea9035abe04f8a7` | `main` = 同一 SHA | 仅一个初始 README，干净 |

数学本地分支为 `audit-fixes-20261002`，相较任务书/远端 main 多 11 个提交，差异涉及 315 个文件，其中包含大量验收图片与报告，并非 315 个业务源码改造。选择性统计 `server/`、`shared/`、`src/App.tsx`、`src/learningMap.ts` 和 CI，共 28 个文件、1939 行新增、39 行删除。新平台迁移应明确包含新分支的证据与权限能力；本轮没有合并该分支。

冻结引用：[数学审查 SHA](https://github.com/lovestream/math-learning/tree/8e9115442b3978eee0d4821750ce04f47954bd26)、[数学任务书 SHA](https://github.com/lovestream/math-learning/tree/1e8199dd2963c70f539b23300a86e7e645350798)、[英语审查 SHA](https://github.com/lovestream/word-request/tree/d0b42a8872a7e87433b96770519203630223b6f2)。后续不要用移动分支名代替导入来源 SHA。

## 只读保护方法

以 `git archive HEAD` 导出跟踪文件到独立临时目录，不复制旧项目的 `data/`、未跟踪词包或真实导出。只读复用已有 `node_modules`，测试、构建、生成课程、浏览器截图与模拟 SQLite 全部落在隔离副本。没有在旧目录执行 `npm test` 的 `pretest` 或 `npm run build` 的 `prebuild`，因为两者会重新生成课程文件。

两个旧项目最终跟踪文件仍干净，HEAD 未改变。跟踪文件保护摘要按“排序后的相对路径 + NUL + 文件 SHA-256 二进制摘要”汇总 SHA-256；不是孩子数据的摘要：

| 项目 | 跟踪文件数 | 汇总摘要 |
| --- | --- | --- |
| 数学 | 821 | `1e3c7fee4bcb7e9438034665fb434f396bfe20d86438e0fdc9c1e5ac59823eb3` |
| 英语 | 1906 | `c8549ea5f249841c7eee4e5877ac9528982c35f6df29d21fd31956fb25846c7b` |

本地默认数学数据库及 WAL/SHM 均不存在；没有为生成一份“备份”而启动旧服务、创建空库或调用自动升级。

同日续审发现另一个非Git数学应用副本中的候选数据库，私有保全和一致性备份已完成；当前基线默认目录仍为空。该候选副本尚未被确认为日常使用的真实主记录，不能把备份成功改写为真实迁移已验证。详见[07 数据来源续审](07-data-source-follow-up.md)。

本轮文档另通过相对链接、代码围栏、私有运维标识与Git whitespace检查；04中的完整TypeScript合同提取到临时文件，经`tsc --noEmit --strict --target ES2022 --skipLibCheck`通过。此检查证明类型片段自洽，不代表API或迁移器已实现。

## 验证环境与结果

本轮环境：macOS/Darwin arm64，Node `v24.15.0`，npm `11.12.1`，Python `3.14.7`。这是本机基线验证，不是 GitHub Actions 或 NAS 上的通过证明。英语原 CI 使用 Node 20/Python 3.12；未来迁移 CI 应保留原矩阵，另加平台 Node 24 检查。

| 项目/命令 | 结果 | 范围与局限 |
| --- | --- | --- |
| 数学 `npm test` | 通过：132 tests，0 fail/skip | 执行既有 `pretest` 与全部 `tests/*.test.mjs` |
| 数学 `npm run build` | 通过 | 执行 `prebuild`、`tsc --noEmit` 和 Vite 生产构建 |
| 数学 `npm run content:check` | 通过 | 70 课、849 道任务；全量蓝图 59 单元仍是 planned |
| 数学 `npm run test:browser:ci` | 最终通过：8/8 callbacks | 首次因缺少对应 Chromium 启动失败；安装锁定 Playwright 所需 Chromium 后重跑成功 |
| 英语 `node tests/test_word_banks.js` | 通过 | 词库不变量 |
| 英语 `node tests/test_app_regressions.js` | 通过 | 数据、计划、首答等既有回归 |
| 英语 `node tests/test_sprint_mode.js` | 通过 | 冲刺流程 |
| 英语 `node tests/test_learning_record_tools.js` | 通过 | 记录审计/合并工具的匿名 fixture |
| 英语 `python3 -m unittest tests/test_launcher.py` | 通过，进程退出 0 | 启动器；模拟服务器被测试结束清理 |
| 英语 `npm run test:responsive` | 通过：4 tests | Chromium 响应式及 My Words 操作 |
| 英语 build | 不适用 | 纯静态发布；package.json 没有 build 脚本，不能报告“英语 npm build 通过” |
| 新仓库测试/构建 | 不适用 | 初始仓库没有应用、测试或 CI，本轮只写文档 |

数学 8 组 callbacks：`verify-thinking-browser`、`verify-division-browser`、`verify-core-browser`、`verify-save-stress-browser`、`verify-thinking-tools-browser`、`verify-evidence-browser`、`verify-accessibility-browser`、`verify-variants-browser`。它们的日志逐项 passed，重跑退出码 0，耗时约 145 秒。没有执行 `test:browser:full` 的额外 7 组，因此不声称全量 15 组本轮通过。

CI 依据：[数学 verify.yml](https://github.com/lovestream/math-learning/blob/8e9115442b3978eee0d4821750ce04f47954bd26/.github/workflows/verify.yml)、[英语 ci.yml](https://github.com/lovestream/word-request/blob/d0b42a8872a7e87433b96770519203630223b6f2/.github/workflows/ci.yml)。未来迁移不得删减这些用例或把 test 改成仅验证新壳。

## 证据边界

测试副本使用匿名/合成数据。原有数学内容集合为 legacy catalog 108 条、studio lessons 70 条、thinking catalog 60 条；集合间可能存在教学重叠，不能相加宣称 238 门不重复课程，也不能把 planned 内容视作已可用课程。

只确认数据结构和默认路径，不确认真实孩子的课程数、余额、词量、复习队列或学习历史。本轮没有真实 WordQuest 导出，也没有迁移 dry-run 成功报告。真实备份、逐字段差异报告及恢复演练仍为门槛。
