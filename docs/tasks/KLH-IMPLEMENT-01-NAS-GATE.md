# KLH-IMPLEMENT-01-NAS-GATE｜DS918+ 真机验收：R1 正式底座与异常恢复

> 签发：ChatGPT · 2026-10-21。  
> **目标：在合并 PR #5 之前，使用用户现已配置好的 Codex 管理员/Docker 操作能力，对正式工程底座进行一次 DS918+ 隔离真机验证。**  
> 任务来源：[PR #5](https://github.com/lovestream/kevin-learning-home/pull/5)、[R1 审查结论](../reviews/KLH-IMPLEMENT-01-R1-ACCEPTANCE.md)、[原 R1 任务](KLH-IMPLEMENT-01-R1-REVIEW-FIXES.md)。  
> 精确待测代码：`codex/implement-01-foundation@8b80dce3be7d836f6abe6fdb569f6553ecd2a6cc`（开始前重新核对PR最新HEAD；若有变化先检查差异，不自动用旧测试结果代替）。  
> **操作许可边界**：用户同意继续原定的 NAS 真机隔离验收，并已在 Codex 配置了管理认证。此许可只涵盖本次测试需要的**新建、运行、停止和清理一次性专属 Docker 测试镜像/容器及独立合成数据目录**。有凭据不等于拥有修改NAS所有服务的授权。不授权生产部署、永久账号/权限变更、运行真实学习数据、修改现有容器、全局 Docker 清理。

## 1. 先验证环境和确认隔离界限

开始前：获取最新PR #5 HEAD/CI，读 `docs/implementation/IMPLEMENT-01-review-R1.md`、`docs/implementation/IMPLEMENT-01-deployment-runbook.md`、`docs/implementation/IMPLEMENT-01-backup-restore.md`，以及源码：
- `packages/platform/writer-lock.ts`、`store.ts`、`checkpoint.ts`
- `infra/docker/Dockerfile`、`infra/docker/compose.yml`
- `tests/foundation/writer-lock.test.ts`、`tests/foundation/container-smoke.ts`、`tests/foundation/readiness.test.ts`

**先做只读预检**（只收集本机测试必需的环境，不枚举其他服务私密配置）：
- NAS 系统/架构/内核、DSM、Docker Server/Client、Compose 1.28.5、存储卷本地文件系统ext4与可用空间、可用内存/CPU，日志中只保留与验证结论相关的脱敏信息。
- 使用已配置的 Codex 凭据完成必要的受控 Docker 认证；不询问或回显任何密码、sudo ticket、token，也不提交敏感配置、私网IP、用户名到GitHub。
- 确认现有数学、英语、NAS其他容器仍正常，记录**最小不含敏感信息的前后存活/运行状态摘要**。严禁 `docker system prune`、`docker volume prune`、批量stop/rm、修改Docker daemon或docker.sock、添加docker用户组、chmod777、升级DSM/内核/系统Docker。
- 只在与现有服务目录、数据库、媒体及 `/home/digital-twin-assets` **完全分离**、确认尚不存在的新路径下创建`klh-r1-nas-gate-<run-id>`专属目录。路径须由只读预检真实确认本地可用，并在执行报告用脱敏标识代替绝对路径；若无法确认独占空间/安全父目录，就停下来向用户征求具体路径许可。不得将旧BENCH合成路径重新复用。
- 所有本轮新容器/镜像统一含独特`klh-r1-nas-gate-<run-id>`标记（容器label、镜像tag、目录内owner-marker）；预先列本轮资源和清理范围，禁止匹配非本任务对象。

## 2. 本轮需要的测试（尽量重用已有R1回归，不改原教学系统）

### G01：正式镜像真实运行
- 用 PR #5 最新正式 `infra/docker/Dockerfile`、锁定Node 24.15.0与依赖构建 **linux/amd64** 镜像，在NAS上运行非root、readonly rootfs的受控容器；优先不映射任何宿主端口，通过容器内 `node scripts/healthcheck.ts` 或回环访问检查 `/health/live`、`/health/ready`。若必须映射则仅 `127.0.0.1` 且不绑定旧站端口/域名。
- 验证 `fs-ext@2.1.1` Node ABI/原生模块实际加载、`flockSync`在 Linux4.4 上行为正常、本地FS hardlink/fsync可用；记录镜像digest/id、Node/SQLite/依赖版本、容器UID、Docker安全配置。
- 明确区分“**DS918+ 当前镜像实际可执行**”和“Node24官方Linux 4.18+支持基线仍未满足”；即使全过也不能写成官方支持。

### G02：写锁互斥 + 异常退出重启
- 只对本次新建的合成 SQLite 数据、空库/seed/fixture进行读写（推荐用**单独测试harness容器**执行已审R1测试；正式镜像不得加入测试身份后门或将测试代码打包进生产层）。比较harness与正式镜像的Node版本/lockfile/addon构建产物，明确报告覆盖边界。
- 同一合成数据卷两个独立真实进程/容器同时竞争写锁，恰一个获得所有权，另一个可靠拒绝；活跃持锁进程不得被覆盖。
- 独立Node主进程收到SIGKILL后，NAS内核释放锁；下一个进程使用**同一目录**正常启动，且旧event、revision、receipt完整。重复相同commandId只返回原结果、不重复写。
- 用本次容器模拟进程异常死亡，实际验证Docker重启策略及恢复健康；`docker kill`是人工停止，不可冒充自动恢复。单纯`unhealthy`不等于重启，异常要正确分类；出现重启风暴则停止并记录。
- 对空文件目录初始化和已存在`writer v2`标记都应测；禁止删锁/依靠旧PID过期判断来“修好”。

### G03：SQLite与健康检查
- 验证WAL、`synchronous=FULL`、`foreign_keys=ON`、`busy_timeout`；合成状态/事务完整，SQL尾部错误回滚、旧revision竞写一个成功一个409。
- `/health/ready`不执行 `quick_check`/全表扫描，深度校验只能在启动/维护/备份执行；失败时503、恢复后200。NAS CPU/内存/IO使用只收集本任务容器，不触碰其它进程；不得用单次延迟承诺十年SLA。

### G04：容器重建、离线备份与空环境恢复
- 本次专属测试容器停止→删除→同数据卷新建后恢复健康；完整合成事件与数据库表摘要不变。
- 停止合作写入后，使用 SQLite VACUUM INTO/版本媒体manifest+SHA的一致性离线备份，再在本次独立全新目标目录恢复；media/content/hash、事件、收据/revision对账一致；原旧站、原其他备份完全不动。
- 备份CLI在已有活跃writer时必须拒绝，不得绕锁强制执行。恢复不得覆盖已有目录。
- 真实断电/硬盘故障、10年/10TB媒体、生产自动备份、远端异地上传不在本轮范围内，标 NOT_RUN。

### G05：结束前清理与服务未受影响
- 本轮资源清单必须在开始写入前建立，结束时按**本次run-id+marker**精确核对并清理新测试容器/镜像与临时目录；禁止全局prune。检查是否残留及原数学、英语与其他服务正常。
- 如果需要保存演练证据，先将**脱敏的JSON、准确代码SHA、镜像标识、测试退出码、原始报错分类、性能摘要**提交GitHub报告或本地安全位置，再清理。不得把真实NAS路径、凭据、后台日志或私密学习数据上传GitHub。
- 测试过程中出现权限阻塞、旧内核原生模块不兼容、镜像启动失败、数据锁异常或可疑的非测试资源变动：**停止测试、不要擅自修NAS系统、保留安全边界并报告**。

## 3. 测试证据、报告与验收口径

每项必须给 `PASS_NAS / FAIL_NAS / BLOCKED_PERMISSION / BLOCKED_COMPATIBILITY / NOT_RUN` 及真实日志/退出码。不得把现代Linux CI结果冒充DS918+。特别分清：
- 已有 BENCH-02 NAS业务探针 `PASS_NAS`，并非本PR正式镜像或flock v2的PASS。
- PR #5 R1 现代Linux CI 全绿，仅证明Linux受支持环境，不证明DS918+。
- 如果只在测试harness验证双进程而正式镜像未运行，G01必须NOT_RUN或失败，不能总体通过。
- 如果 Node24 镜像在4.4内核当前可用，但超出官方支持基线，应写 `PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK`并将长期依赖升级风险列清。

**输出写回同一 PR #5 的开发分支** `codex/implement-01-foundation`（更新前同步最新HEAD，禁force-push）：
1. `docs/implementation/IMPLEMENT-01-NAS-GATE-report.md`：G01～G05、真实机配置摘要、镜像/依赖/代码SHA、每项PASS/FAIL与边界、证据、当前阻塞。
2. `docs/implementation/evidence/nas-gate/summary.json`：脱敏、结构化、可审查测试摘要；若仍有资源残留列出但不存私密绝对路径。
3. `docs/handoff/IMPLEMENT-01.md`：更新最新NAS结论、风险和下一步审查待决项；更新执行报告但保留R1已通过历史CI和日期。
4. 如有实质兼容问题仅做定位和方案分析；不要未经复审直接大范围修改Node/SQLite架构、升级主机或换镜像基础版本来掩盖失败。

请确保PR提交后对应 HEAD 的 CI 仍成功。**保持PR #5 Draft、不合并，不实施IMPLEMENT-02A/02B、不启动NAS常驻服务。** 完成后STOP，用户通知ChatGPT独立复审；通过后再询问用户是否批准合并。

## 4. 额外长期提醒

未来学习家园需要10年以上稳定：本轮短时NAS验证只是**合并前兼容性关卡**，后续正式上线前仍需7天受控持续运行、异常监测、完整加密异地备份/恢复、HTTPS+家长权限、真实Mac/iPad验收以及迁移到下一台NAS的演练。不要把本轮一次成功等同于十年无故障。
