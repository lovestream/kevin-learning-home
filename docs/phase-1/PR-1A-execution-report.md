# KLH-PR-1A 完整执行报告

日期：2026-10-08。代码与合成验证交付；NAS 运行验收 **BLOCKED**，等待本任务的明确写入授权与现有非root daemon访问。创建审查PR后暂停，不合并、不进入PR-1B。

## 来源与范围

- 用户授权：严格执行 PR-1A，提交代码、测试、报告与交接，创建PR等待ChatGPT复审；NAS容器/配置操作须先同意。
- [任务分支文件](https://github.com/lovestream/kevin-learning-home/blob/chatgpt/klh-pr-1a-task/docs/tasks/KLH-PR-1A.md)：任务来源分支 SHA `349d5978cb3203e4906f4f4886b9863c7c904acb`，任务 blob `12dfb94fd63e258ad7fd34e2d70eeb379ec896a4`，原文复制进本分支。
- 开发基准 main `46687ba370ca7e47764e500641bc371e2c0d4727`；工作分支 `codex/pr-1a-nas-runtime-probe`。开始时工作区干净，无重复代码。
- 已阅读 Phase0 README、01–07、ADR0001和原架构brief。新任务缩小本轮至运行探针，没有把附件中的后续开发内容当成当前许可。
- 仅新仓库有改动；未访问候选旧SQLite、WordQuest真实V2记录或私有manifest，未改旧math/word、未迁移课程/数据、未建立或合并钱包、未部署应用、未开Serve/Funnel。

## 版本与可复核证据

首次代码提交之后记录确切 tested SHA、GitHub CI URL和结果；目前尚未生成该提交/CI。最终文档提交的自身SHA不能嵌在自身内容中，实时HEAD以PR引用为准，交付回复给出精确最终HEAD。此段将在CI结束后更新为实际结果，不能当CI通过证据。

Mac 本地：Darwin / arm64，Node24.15.0、Python3标准库；没有本地Docker CLI。初次未提交工作树验证：Node合成6项通过、Python安全17项通过，退出0；将于代码提交后在确切SHA重跑留档。本地验证不属于NAS或容器验证。

固定镜像：`node:24.15.0-bookworm-slim`，linux/amd64 manifest `sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde`，index `sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d`。Docker官方Registry解析成功；认证token仅在进程内存中，不输出或保存。CI Compose V1.28.5 官方Linux二进制SHA256 `46406eb5d8443cc0163a483fcff001d557532a7fad5981e268903ad40b75534c`。

NAS 当前未重新登录、未执行新脚本。Phase0历史只读事实：DS918+ / J3455 / x86_64 / DSM7.1.1build42962u6 / Linux4.4.180+，Docker CLI20.10.3，ComposeV1.28.5，Tailscale1.102.3，/volume2 ext4。该账户daemon访问因权限受阻；Server未返回。这是历史观察，不作为本PR的当前实测或退出码证据。[历史评估](../phase-0/05-nas-compatibility.md)。

## 全部改动文件

| 文件 | 用途 |
| --- | --- |
| `.gitignore` | 排除Python缓存和本地合成临时证据 |
| `package.json` | 无依赖合成测试入口、Node固定版本 |
| `.github/workflows/pr-1a.yml` | 检出确切head、合成单测、脱敏清单、V1容器重建与artifact |
| `scripts/nas-preflight.sh` | 默认只读入口 / help / JSON |
| `scripts/nas_preflight.py` | 有界读取，权限分类与脱敏host inventory |
| `scripts/run_sqlite_probe.py` | 默认plan、NAS许可门、干净SHA校验、专属目录、容器运行和受限清理 |
| `infra/probes/node-sqlite/Dockerfile` | 固定amd64 base digest、非root入口 |
| `infra/probes/node-sqlite/compose.yml` | V1 schema2.4、无网络/端口、资源限额与专属bind |
| `infra/probes/node-sqlite/probe.mjs` | 合成SQLite事务、幂等冲突、备份恢复、重连与结构化结果 |
| `infra/probes/node-sqlite/image-lock.json` | 官方manifest解析元数据，非私有manifest |
| `infra/probes/node-sqlite/README.md` | 运行、权限、来源摘要、限制与精确清理步骤 |
| `tests/sqlite-probe.test.mjs` | 6项SQLite行为及拒绝覆写/危险路径测试 |
| `tests/test_preflight.py` | 脱敏、只读argv、权限/daemon/timeout/kernel分类测试 |
| `tests/test_runner.py` | 许可、UID、排他目录、context、SHA、重建/清理边界测试 |
| `docs/tasks/KLH-PR-1A.md` | 不变复制的来源任务 |
| `docs/phase-1/PR-1A-execution-report.md` | 本报告与15项矩阵 |
| `docs/phase-1/PR-1A-runtime-decision.md` | A/B/C证据与用户决策边界 |
| `docs/handoff/README.md` | ChatGPT任务→Codex PR→ChatGPT复审协议 |
| `docs/handoff/current.md` | 当前交接快照、PR/CI/缺口 |

最终证据如增加JSON索引/摘要，将在此表列出。没有依赖安装、产品页面、业务数据库或真实fixture。

## 命令及退出状态

| 环境 | 实际命令/步骤 | 退出/结果 |
| --- | --- | --- |
| Mac | `git status --short`、核对refs、fetch main与任务branch | 0，开始时干净；没有覆盖任一来源分支 |
| Mac | 官方Registry tag→amd64 descriptor→manifest摘要核对 | 0，固定版本/摘要已记录；不在NAS拉镜像 |
| Mac未提交树 | `node --test tests/*.test.mjs` | 0，6通过 |
| Mac未提交树 | `python3 -m unittest discover -s tests -p 'test_*.py'` | 0，17通过 |
| CI | workflow head checkout、单测、preflight、Compose config/build/exercise/verify/inspect | NOT_RUN，等待首次push后更新 |
| NAS | 新预检、config、pull/build、两个容器、持久化/恢复/清理 | BLOCKED，无本PR执行或退出码；未登录、不擅自提权 |

## 15项NAS验收（与Mac/CI独立）

| ID | NAS状态 | 证据、退出状态及不足 |
| --- | --- | --- |
| NAS-01 | BLOCKED | 新preflight未执行，exit N/A；历史账户docker.sock权限不足，未验证当前daemon |
| NAS-02 | BLOCKED | 新Compose在NAS未parse，exit N/A；历史V1.28.5存在，不等于config通过 |
| NAS-03 | BLOCKED | NAS启动未获许可，exit N/A；amd64 base摘要已固定，不等于该设备运行 |
| NAS-04 | BLOCKED | NAS SQLite加载/版本未执行；Mac合成加载通过，不能替代 |
| NAS-05 | BLOCKED | NAS四项PRAGMA未执行；Mac回读wal/2/1/3000通过 |
| NAS-06 | BLOCKED | NAS事务/回滚/幂等/冲突未执行；Mac6项合成测试退出0 |
| NAS-07 | BLOCKED | NAS进程重启未执行；Mac独立Node进程verify退出0 |
| NAS-08 | BLOCKED | NAS无本PR容器；容器删除重建持久化需CI与NAS分别证明 |
| NAS-09 | BLOCKED | NAS备份恢复未执行；MacVACUUM INTO与新空目录恢复完整性ok |
| NAS-10 | PASS | 本PR NAS零操作，未开端口/改服务；Compose无ports、network none；不冒充NAS网络实测 |
| NAS-11 | BLOCKED | NAS专属父目录/权限未批准，exit N/A；代码拒绝root/错误UID/宽松目录，待真机 |
| NAS-12 | NOT_RUN | 最终公开diff/artifact隐私扫描待CI结束；所有探针数据固定synthetic，禁止raw NAS输出 |
| NAS-13 | PASS | 明确保留Linux4.4 < Node24 glibc官方4.18风险；不是“运行失败”结论 |
| NAS-14 | NOT_RUN | 文档已分环境，确切提交SHA/CI证据待首次提交后补全 |
| NAS-15 | NOT_RUN | NAS没有创建资源，故没有可执行清理；代码仅清理由本次名字及labels确认的容器 |

## 安全、缺口及NAS影响

NAS副作用为零：未创建文件/目录/容器/卷、未拉镜像、未改任何配置、未操作现有资产。许可问题由用户请求与任务书明确要求，不能把旧的SSH只读授权当成容器授权。未尝试sudo、改docker.sock、加组、chmod777或docker prune。

运行器默认只读plan；--run且NAS确认旗标才可写，仍须事前真实用户许可。host与容器均非root，绑定排他专属0700目录，Linux文件系统白名单排除NFS/SMB；探针拒绝symlink/未知文件/旧库覆盖。使用WAL/FULL，VACUUM INTO一致性快照，恢复到新建空目录，不直接复制活动主库。

局限：当前没有NAS daemon权限、新的已认证SSH连接或批准父目录。Mac是arm64原生，不能代表amd64 Docker。CI现代Linux可验证合成实现，但不能证明旧NAS kernel/daemon/storage driver/磁盘I/O。没有断电/磁盘满/并发压力/真实数据或业务恢复测试；无网络服务，因此未覆盖未来HTTPS/认证，均属后续单独任务。

## 回滚、清理与下一项确认

Git变更仅在本PR分支，可关闭PR或撤销本PR提交；不删除旧仓库任何文件。本轮NAS未产生资产，回滚/清理 NOT_RUN。

未来若用户允许试验：运行器仅在新生成projectName内创建两次run --rm容器；正常结束确认明确No such object，异常按精确name加compose project/service labels stop/rm。保留合成目录/evidence和镜像cache，手动删目录/派生镜像必须核对所有权并由用户确认；不删共享base，不prune、不down --remove-orphans。现有服务完全不在清理范围。

待用户明确批准：是否进行此隔离NAS实验、专属本地文件系统父目录、已有非root daemon访问方式。没有许可即保留BLOCKED，不提权。ChatGPT复审后才能给修订/下一任务；PR-1B只是候选，未授权。
