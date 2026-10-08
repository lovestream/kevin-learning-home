# KLH-PR-1A-NAS｜代码审查结论与 NAS 真机验证补充任务

> ChatGPT 审查日期：2026-10-08。审查对象：`lovestream/kevin-learning-home` 的 [PR #1](https://github.com/lovestream/kevin-learning-home/pull/1)，代码/报告 HEAD `1666d86c50ad49b615d7a3c417eab9e496c28f3b`。  
> **结论：PR-1A 代码与 CI 审查通过，NAS 真机部署兼容性仍未验证。此文件是待执行任务说明，不构成 NAS 写入授权。**  
> **先决条件：用户明确同意仅在 NAS 上创建隔离探针资源后才执行任何写操作。** 在取得同意前只允许只读 preflight、权限核查和准备文档。

## 1. 已核验事实：不重复开发

- 代码与测试位于 `codex/pr-1a-nas-runtime-probe`，保持 PR #1 为 draft，暂不合并。
- 现代 Linux CI：最新 HEAD `1666d86` 的 [run 37784493808](https://github.com/lovestream/kevin-learning-home/actions/runs/37784493808) 已成功；既有 Node 6 + Python 17 项合成测试，以及 Docker/Compose V1/SQLite 双容器探针已通过。
- 审查了 `infra/probes/node-sqlite/probe.mjs`、Dockerfile、Compose、`scripts/nas_preflight.py`、`scripts/run_sqlite_probe.py`、各项测试、`docs/handoff/current.md`、`PR-1A-execution-report.md`、运行路线报告。
- 运行探针只对合成 SQLite 做 WAL、事务/回滚、唯一事件去重、载荷冲突、重连、`VACUUM INTO`、恢复、受限清理。
- 当前 **没有** NAS 实机 Node 24 / SQLite / Docker daemon 的执行证据。历史预检：DS918+、DSM 7.1.1、Linux 4.4.180+、Docker Client 20.10.3、Compose V1.28.5；Docker socket 权限未解决。
- Linux 4.4 低于 Node 24 glibc linux-x64 官方支持基线 4.18。即使实验通过，也只记“在这台机器上合成测试可运行”，不可记“官方支持/生产可用”。

## 2. 用户许可闸门（必须先确认）

如果用户尚未明确同意，**STOP**。不得推断“继续做”“Codex完成了”或读过本任务书就代表 NAS 写入许可。

需要用户明确授权的活动，仅限：
1. 在已确认的 **NAS 本地文件系统** 专属测试父目录下新建 `klh-pr1a-<随机名>` 隔离目录；
2. 拉取/构建固定摘要的 Node 24 linux/amd64 诊断镜像；
3. 创建两个受限的一次性 `--rm`、`network_mode: none`、无ports、非root 的合成诊断容器；
4. 在该隔离目录中建立虚构 SQLite、测试删除容器后的数据持久化和一致性备份恢复；
5. 保留脱敏实验报告供审核。**不得自动删除**除本任务所创建的精确资源之外的任何资产。

许可不包括修改 DSM/Docker/Tailscale 设置、Docker socket 权限、NAS 用户组、现有容器、真实学习数据或任何公网访问设置。若现有 NAS 用户无法连接 daemon，应先告知用户阻塞和最小可行办法，等待其单独授权；不能自行 `sudo`、添加 docker 组、`chmod docker.sock`、挂载 docker.sock 或使用 `--privileged`。Docker daemon 访问本质上属于高权限操作。

## 3. 真机验证顺序

### Step A：只读 NAS 预检

阅读当前 PR #1 文件：`infra/probes/node-sqlite/README.md` 和 `docs/phase-1/PR-1A-execution-report.md`。

用已授权 SSH 或用户本机终端执行不提权、只读 `scripts/nas-preflight.sh` 的等价检查。若 NAS 未有合适 Python/Git，不自动安装：写明 `BLOCKED`，给出由用户手工执行的只读替代命令。脱敏记录：

- 系统架构、内核、DSM、Docker Client **与 Server**、Compose V1/V2、Tailscale Serve/Funnel 状态；
- 目标专属父目录所在文件系统类型、权限、可用空间及现有服务是否使用该路径；
- 端口/现有应用状态的只读基线；不得泄露 IP、主机名、私有路径、账号或 peer 列表；
- 能否通过 **已有** 非root用户访问 Docker daemon。如不能，STOP。

### Step B：仅在用户明确许可且权限可用时运行隔离探针

运行当前 PR #1 已审查的 `scripts/run_sqlite_probe.py`，**不能改用临时随手编写的无隔离 Docker 命令**。

- 确保 checkout SHA 与命令输入一致、代码干净；
- 确保 `--parent` 是用户批准的专属本地目录，非真实学习数据目录、非 SMB/NFS；
- NAS 环境使用 `--environment nas --approved-nas-write`；标志只是误操作防线，**用户事先授权才是许可**；
- 先 `docker-compose config`，再构建镜像；完整两次临时容器实验；
- 若容器报旧内核/syscall兼容错误，原样私下保留错误证据，公开报告只保留可复核错误类别；
- 只检查并清理精确的本次容器，不做 `docker system prune` 或修改系统配置。

### Step C：核对结果和恢复

- Docker daemon 检查、固定镜像、SQLite/FK/WAL/FULL/timeout、事务、幂等、容器重建、备份恢复、数据卷权限均需有 NAS 实测证据。
- 汇总 PR-1A 既有 NAS-01～NAS-15 矩阵，所有项目 `PASS/FAIL/BLOCKED/NOT_RUN`，不把 Mac/CI 结果复写到 NAS 栏。
- 记录旧内核兼容性结论：`RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL`、`RUNTIME_FAILED` 或 `BLOCKED`。
- 另列不能由合成探针证明的项目：长期负载、磁盘满、UPS/断电、真实课件渲染、服务认证、Tailscale HTTPS。这些属于未来门槛，不能标为已完成。
- 实验失败或阻塞也视为有价值结论，不进行不受控的系统升级或旧仓库改造。

## 4. 代码审查补充提醒（不作为此次已发现 blocker）

1. `nas_preflight.py` 中所标的 `--environment nas` 是报告标签，不构成设备真实身份验证。报告必须用实际登录证据和独立环境信息确定真机；不能仅靠标签写“NAS PASS”。
2. 运行器要求 NAS 可用 Python、Git、合适的 Docker daemon 权限、干净 checkout 和本地专用卷。这些如果不满足，先把阻塞列清楚，不得自动安装系统软件或提权。
3. 旧内核上即使容器能成功，也需要另行接受不受官方支持的风险和完整备份方案后，才能考虑生产部署。
4. 从 CI tested SHA `4e529c8` 到 PR HEAD `1666d86` 只有文档/证据更新，最终 HEAD CI 已再次通过；不要误用 CI 的 Linux6.8 环境证明 NAS4.4。

## 5. 完成后必须更新 GitHub

在 PR #1 分支补充，不新开 PR-1B：
- `docs/phase-1/PR-1A-nas-validation-report.md`：是否取得用户授权（不含隐私字段）、前后基线、具体检查、每条NAS-01～15、实测退出码、脱敏失败分类、数据卷持久化/恢复、仅限本次资源的清理与保留；
- `docs/phase-1/PR-1A-runtime-decision.md`：路线 A 是否实测可运行，Node支持边界不变，路线 B/C 保持未验证；
- `docs/phase-1/PR-1A-execution-report.md`：引用 NAS 实测报告、结果 SHA，不涂改旧测试事实；
- `docs/handoff/current.md`：最新 branch、HEAD SHA、PR #1、CI run、NAS实测状态、下一候选阶段（仍待审核）。

如新增测试或代码更改必须附新的 GitHub CI 结果；只更新文档也应让最新 HEAD CI 运行/检查通过。

完成后暂停，不合并PR、不进入PR-1B，等待 ChatGPT 复审和下一步部署路线决策。

## 6. 给家长的最简授权问题

**是否同意 Codex 在 DS918+ 上，仅创建一次性隔离 Docker 测试容器和专用合成数据目录来验证 Node 24 + SQLite？** 不修改原有容器、不导入真实学习记录、不启用公网或 Tailscale Serve。

用户回答“同意”只授权上述范围；任何 Docker socket 权限变更、系统升级、生产部署、数据导入和清理非本任务资源，仍需另行确认。
