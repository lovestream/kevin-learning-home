# KLH-IMPLEMENT-01 · NAS-GATE 独立复审结论（合并前）

> ChatGPT 复审日期：2026-10-22。  
> PR：[lovestream/kevin-learning-home#5](https://github.com/lovestream/kevin-learning-home/pull/5)，最新 HEAD `a81c4e326f6a2d4f023a374f5ebac3342749fe59`，base/main `46687ba370ca7e47764e500641bc371e2c0d4727`。  
> **复审决定：NAS-GATE G01–G05 通过，第一阶段代码具备合并条件；仍保留Linux 4.4官方支持风险。此结论不是生产NAS上线批准，也不代表PR已合并。**  
> 上次 R1 本地及现代Linux审查结论：[R1审查](KLH-IMPLEMENT-01-R1-ACCEPTANCE.md)。本次真实NAS验证来源：[执行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-01-foundation/docs/implementation/IMPLEMENT-01-NAS-GATE-report.md)、[结构化汇总](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-01-foundation/docs/implementation/evidence/nas-gate/summary.json)。

## 逐项独立核查

| 门槛 | 复审结论 | 本次可确认的事实 |
| --- | --- | --- |
| G01 | PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK | DS918+ / DSM7.1.1 / Linux4.4.180+ / Docker20.10.3 / 本地ext4：正式 Node24.15.0 + SQLite3.51.3 + fs-ext2.1.1 非root只读根镜像已真实启动；flock/hardlink/fsync验证。 |
| G02 | PASS_NAS | 同库双进程仅一writer，活跃锁不可驱逐；杀Node子进程SIGKILL后 Docker `unless-stopped` RestartCount=1并健康恢复；人工docker kill后同卷重建；事件、revision、收据保持。 |
| G03 | PASS_NAS | 30/30 Node回归（JS真实代码、合成数据）、WAL/FULL/FK、SQL回滚/CAS；10万合成事件下30次ready固定180条SQL且没有quick_check，live不访问SQL，故障ready503恢复200。 |
| G04 | PASS_NAS | 活跃writer时backup拒绝；正式镜像离线VACUUM INTO、媒体/content manifest与SHA、11表hash及receipt恢复，目标已存在拒绝。仅38B媒体和单事件的恢复样本，不能冒充TB媒体灾备。 |
| G05 | PASS_NAS | 两个独立run-id测试均有零残留容器/镜像/专属目录的后续只读确认；八个既有容器测试前后ID、启动时间、重启计数及运行状态一致，没有全局清理。 |

- 第一轮 `20261021-2889e070` 在DSM缺失 `/proc/1/task/1/children` 时受控失败；当时尚未执行该次SIGKILL，未谎报通过；清理后第二轮 `20261021-7341fdd4` 用PID命名空间内proc扫描、PPID/argv/UID精确核对后注入故障。两轮运行历史均已保存。
- 镜像来源可追溯：GitHub Actions [39607483176](https://github.com/lovestream/kevin-learning-home/actions/runs/39607483176) 以 `git archive 8b80dce3` 按正式Dockerfile构建正式镜像、harness从正式镜像继承，只把合成fixture/测试代码放在harness；NAS上的正式和harness的Node、fs_ext.node、关键apps/packages文件哈希相同。归档验证SHA256、正式镜像config ID明确。**测试的是正式代码`8b80dce3`，而当前PR `a81c4e32` 仅加了探针、workflow、证据、文档；已检查`compare_commits`变更路径，没有修改正式app、packages、原Dockerfile/Compose/lockfile。**
- 最终 HEAD `a81c4e326f6a2d4f023a374f5ebac3342749fe59` 的GitHub Actions [39627055628](https://github.com/lovestream/kevin-learning-home/actions/runs/39627055628) 与 [39627047555](https://github.com/lovestream/kevin-learning-home/actions/runs/39627047555) 均 SUCCESS；具体包含 Node/Browser、Compose V1、现代Linux容器回归及新控制器Python语法检查（CI本身没有SSH连接NAS）。
- NAS测试命令可在 `docs/implementation/evidence/nas-gate/summary.json` 的184条脱敏命令/退出码重审；`controller.py` 按 run-id+label+完整镜像ID清理、owner-marker匹配才删除本轮目录。NAS原服务名称/IP/真实数据没有放入公开报告。

## 仍需保留的明确边界

1. **官方支持风险未解除**：NAS Linux4.4低于Node24 GNU/Linux x64官方内核4.18支持基线；这次固定镜像能跑不等于今后Node/V8/libuv/原生模块更新必兼容。后续升级需先镜像固定、独立NAS验收，再切正式服务。旧DSM/Docker自身安全维护还需制定策略。
2. **旧站实际在线与私密数据未验证**：现有8容器状态一致，但NAS清单按容器名称匹配math/word都是0，所以**不能从该清单声称数学/英语旧网站已在线可用**。旧仓库Git元数据未改不等于完成HTTP页面与数据备份审计。本轮隔离测试没有证据显示旧站被修改。
3. **NAS样本规模与持续时间有限**：约3分钟短测、1条正式恢复事件、38B测试媒体；10万事件只是readiness合成行。7天稳定监控、OOM、宿主断电/UPS、坏盘、大数据恢复、定时/异地加密备份、真实Mac/iPad/HTTPS等均未验证。不可推断十年SLA。
4. **应用功能仍未上线**：认证/家长授权、跨学科真实数据、学习记录导入、统一金币与宠物功能仍没有启用；生产写接口仍403。PR #5只可视作正式工程**底座**。
5. **一次性测试代码治理**：新增 `tests/nas-gate/`、单次镜像Bundle Workflow/固定run-plan以及较大的合成审计JSON是本次可追溯性证据，**不阻止合并**。后续应将过期run-plan与一次性流程标注为archive-only、避免自动重复执行；未来统一测试流程应参数化复用，不在生产容器内带测试身份/SSH凭证。当前`nas-gate-images.yml`仅在测试相关文件发生改动时触发，不是NAS长期自动任务。

## 合并与下一阶段决策

**复审结论：PR #5可以由用户明确批准后正常合并**；目前PR仍为Draft/open，main未变化。本记录只写入ChatGPT独立分支，不修改/合并PR #5。

建议在用户批准合并后，由Codex先再核对PR #5 HEAD `a81c4e32`、与main的diff、最新CI状态与mergeability，变更则复查；把Draft转Ready并正常合并，保存真实merge SHA。**不得顺带合并其他实验PR #1～#4**，不得部署生产NAS或导入真实学习数据。

后续按已发布 [IMPLEMENT-02任务](../tasks/KLH-IMPLEMENT-02-AUTH-SHELL.md)，仅在main包含PR #5且用户允许开始后，先做 **02A身份安全、parent grant、会话、schema1→2增量迁移** 的独立Draft PR；审查通过后再做02B导航空壳。不改旧math/word repo，未来复制旧代码时仍保持其独立运行。

**真实NAS使用审批另设门槛**：考虑先做隔离长期观测与加密离线/异地备份方案；无证据不得宣称十年以上零故障。管理员权限已配置不代表拥有其他Docker服务的修改权。
