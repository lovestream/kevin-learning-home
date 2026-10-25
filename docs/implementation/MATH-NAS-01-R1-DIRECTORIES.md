# Kevin Learning Home 目录核查与安全清理清单

2026-10-25。仅盘点 `/Users/<user>/Downloads/codex` 下的项目目录；本轮没有删除或移动任何目录，也不涉及NAS。
11份相关目录是同一Git仓库的1个主目录+10个注册工作树，不是11套NAS服务。当前只有1份 kevin-learning-home-math-trial。
唯一活动工作副本：`/Users/<user>/Downloads/codex/kevin-learning-home-math-trial`。
日常体验只打开本文件夹的 START-HERE.md / 打开数学课堂.command。主仓库与旧试用秘密源仍必须保留。

| 绝对目录 | 原因 | 分支 / HEAD | tracked / untracked | ignored摘要 | 决定 |
| --- | --- | --- | --- | --- | --- |
| `/Users/<user>/Downloads/codex/kevin-learning-home` | 最初仓库/共享契约实验；保存全部工作树共用的.git | `codex/bench-shared-contract` / `398074ea` | 0 / 0（Finder元数据0） | .bench-evidence:1, .probe-evidence:23, scripts:2, tests:2 | 保留：共享Git数据库，不能当作普通旧副本删除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-auth` | IMPLEMENT-02A认证开发遗留 | `codex/implement-02a-auth` / `c71fd6c0` | 0 / 0（Finder元数据0） | .evidence:16, apps:3 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-bench-cloudflare` | Cloudflare比较实验遗留 | `codex/bench-01-cloudflare` / `7caecac7` | 0 / 0（Finder元数据0） | .bench-evidence-final-cf-ci:2, .bench-evidence-latest-cf-ci:2, .bench-evidence:1, .bench-work-cf-Q8b4MT:6, .bench-work-cf-e76LU8:7, .bench-work-cf-iUNemI:16, .bench-work:12, dist:1, experiments:5 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-bench-node` | Node/NAS比较实验遗留 | `codex/bench-02-node-nas` / `ca56951e` | 0 / 0（Finder元数据0） | .bench-evidence-ci-passed:3, .bench-evidence-final-node-ci:3, .bench-evidence-latest-node-ci:9, .bench-evidence-nas-image:3, .bench-evidence-node-ci-failed:2, .bench-evidence:3, .bench-work-node-oWSmih:9 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-foundation` | IMPLEMENT-01工程底座开发遗留 | `codex/implement-01-foundation` / `a81c4e32` | 0 / 0（Finder元数据0） | .evidence:90, apps:3 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial` | 当前MATH-NAS-01及R1 | `codex/math-01-nas-trial` / `6d0e1909` | 0 / 5（Finder元数据5） | .evidence:38, .trial-private:30, apps:7, infra:1, tests:1 | 保留：唯一活动工作副本与本次数学秘密源 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-math00` | MATH-00来源审计遗留 | `codex/math-00-source-audit` / `67e51456` | 0 / 0（Finder元数据0） | scripts:2, tests:1 | 可删候选（仅在用户确认后，非force移除工作树；分支保留） |
| `/Users/<user>/Downloads/codex/kevin-learning-home-math01` | MATH-01首课接入开发遗留 | `codex/math-01-readonly-lesson` / `82490705` | 0 / 0（Finder元数据0） | .evidence:39, apps:7, scripts:2 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-shell` | IMPLEMENT-02B界面开发遗留 | `codex/implement-02b-shell` / `f179b895` | 0 / 0（Finder元数据0） | .evidence:40, apps:3 | 待确认：先保留/归档忽略的历史证据或合成数据库，再考虑移除 |
| `/Users/<user>/Downloads/codex/kevin-learning-home-status` | 02B合并后状态文档遗留 | `codex/02b-main-status` / `164ddbf2` | 0 / 0（Finder元数据0） | 无 | 可删候选（仅在用户确认后，非force移除工作树；分支保留） |
| `/Users/<user>/Downloads/codex/kevin-learning-home-trial` | 旧02B隔离试用控制器/秘密源 | `codex/02b-nas-trial` / `faa0f1c4` | 0 / 0（Finder元数据0） | .trial-private:13, infra:1 | 保留：旧02B仍需的独有口令/CA/私钥/状态 |

## 可以优先审查的两份候选

`kevin-learning-home-math00` 与 `kevin-learning-home-status`：跟踪代码无修改、无未跟踪用户文件、HEAD有远端引用、无活动进程匹配；前者只有3个可再生Python缓存，后者无ignored内容。
**仍未获得删除这两份具体目录的确认，所以本轮没有删。** 用户确认后重新核查，再只用对应 `git worktree remove <确切路径>`，不使用 --force、不删除分支、不用rm -rf、不prune。

## 其余为什么保留

主目录保存共享.git，当前数学试用保存本次秘密，旧trial保存旧02B秘密。其余6份含历史 .evidence/bench工作数据或合成数据库，不能因git status干净就连同ignored证据一起删；应先做有界归档/用户确认。
目前活动浏览器/Node只归属于当前math-trial工作副本；其它目录无路径/cwd进程匹配。这不能替代用户对其它Codex任务是否结束的确认。
本清单不读取任何旧口令、私钥或SQLite内容，只记录存在性/权限与数量。原数学和英语项目完全不在清理范围。

Finder若搜到主仓库 `.git/worktrees/kevin-learning-home-math-trial`，那是Git管理记录，不是第二个可独立删除的项目目录；不要手工删除这个条目。
