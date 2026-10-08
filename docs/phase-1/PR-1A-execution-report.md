# KLH-PR-1A 完整执行报告

日期：2026-10-08。代码与合成验证交付；NAS 运行验收 **BLOCKED**，等待本任务的明确写入授权与现有非root daemon访问。创建审查PR后暂停，不合并、不进入PR-1B。

## 来源与范围

- 用户授权：严格执行 PR-1A，提交代码、测试、报告与交接，创建PR等待ChatGPT复审；NAS容器/配置操作须先同意。
- [任务分支文件](https://github.com/lovestream/kevin-learning-home/blob/chatgpt/klh-pr-1a-task/docs/tasks/KLH-PR-1A.md)：任务来源分支 SHA `349d5978cb3203e4906f4f4886b9863c7c904acb`，任务 blob `12dfb94fd63e258ad7fd34e2d70eeb379ec896a4`，原文复制进本分支。
- 开发基准 main `46687ba370ca7e47764e500641bc371e2c0d4727`；工作分支 `codex/pr-1a-nas-runtime-probe`。开始时工作区干净，无重复代码。
- 已阅读 Phase0 README、01–07、ADR0001和原架构brief。新任务缩小本轮至运行探针，没有把附件中的后续开发内容当成当前许可。
- 仅新仓库有改动；未访问候选旧SQLite、WordQuest真实V2记录或私有manifest，未改旧math/word、未迁移课程/数据、未建立或合并钱包、未部署应用、未开Serve/Funnel。

## 版本与可复核证据

报告生成时 HEAD / Mac与CI实际tested SHA：`4e529c88ef848a1eae8eebc54595e455b9733e67`。这是最后一次运行代码改动；此后只归档文档/证据。

- [草稿PR #1](https://github.com/lovestream/kevin-learning-home/pull/1)，等待ChatGPT复审，不合并。
- [成功CI run 37783788299](https://github.com/lovestream/kevin-learning-home/actions/runs/37783788299)，实际检出上面的head SHA，不用合并模拟SHA。push与PR双触发时同分支并发组取消旧push运行，取消不冒充通过。
- [已提交证据索引](evidence/pr-1a/index.json)，包含各JSON/文本结果的SHA256及代码文件SHA256。CI附件已实际下载、核对后归档，不只引用临时artifact。
- 实时最终HEAD见[GitHub PR head](https://api.github.com/repos/lovestream/kevin-learning-home/pulls/1)的 `head.sha`，最终回复给出末次提交精确值。Git commit不能在自己的内容中嵌自身SHA；此处固定快照不会冒充实时HEAD。最后文档提交仍运行同一CI，最终回复链接对应最新HEAD的运行。

Mac 本地：Darwin / arm64，Node24.15.0、Python3.14.7标准库，无Docker CLI。在上述确切提交上合成Node6项、Python17项全部通过，退出0；[local-summary.json](evidence/pr-1a/local-summary.json)记录来源/时间/码。只读本地preflight退出2（Docker缺失BLOCKED），不是测试失败或NAS观察。

CI：Ubuntu22.04 GitHub runner / x86_64 / kernel6.8.0-1064-azure，Docker Client/Server28.0.4，校验过的独立ComposeV1.28.5。probe为Node24.15.0 / linux x64 / UID1001 / SQLite3.51.3，四项PRAGMA回读wal/2/1/3000。事务提交/回滚、幂等/冲突、FK实际拒绝、重连、integrity、VACUUM INTO备份及空目录恢复均PASS。第一个run --rm容器删除后，第二个独立容器从同一bind目录验证精确状态PASS；两次删除各inspect退出1且确认No such object，未把权限错误当已删除。

CI派生镜像ID：`sha256:1aad632d3f8d1264d213b62a336523b81d5640fe910118c896e0892376a53d6d`，linux/amd64，revision label为上述SHA，见[ci-container.json](evidence/pr-1a/ci-container.json)。base manifest摘要与派生image ID分别记录。此成功不代表Docker20.10.3或NAS4.4通过。

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
| `docs/phase-1/evidence/pr-1a/index.json` | 固定tested SHA、CI URL、代码与证据文件SHA256索引 |
| `docs/phase-1/evidence/pr-1a/ci-container.json` | CI9条命令退出码、镜像、SQLite、重建与清理结果 |
| `docs/phase-1/evidence/pr-1a/ci-preflight.json` | 现代Linux CI只读清单，非NAS |
| `docs/phase-1/evidence/pr-1a/compose-version.txt` | CI V1.28.5实际输出 |
| `docs/phase-1/evidence/pr-1a/node-tests.txt` | CI6项Node测试结果 |
| `docs/phase-1/evidence/pr-1a/python-tests.txt` | CI17项Python测试结果 |
| `docs/phase-1/evidence/pr-1a/preflight-exit.json` | CI清单出口码0 |
| `docs/phase-1/evidence/pr-1a/local-summary.json` | Mac确切SHA、版本、23项结果、命令出口码 |
| `docs/phase-1/evidence/pr-1a/local-preflight.json` | Mac只读清单，Docker缺失BLOCKED |
| `docs/phase-1/evidence/pr-1a/nas-plan.json` | 默认plan零写入，非NAS执行 |

没有产品页面、业务数据库或真实fixture。仅CI安装校验过的测试Compose二进制，不在Mac/NAS安装依赖。

## 命令及退出状态

| 环境 | 实际命令/步骤 | 退出/结果 |
| --- | --- | --- |
| Mac | `git status --short`、核对refs、fetch main与任务branch | 0，开始时干净；没有覆盖任一来源分支 |
| Mac | 官方Registry tag→amd64 descriptor→manifest摘要核对 | 0，固定版本/摘要已记录；不在NAS拉镜像 |
| Mac @4e529c8 | `node --test tests/sqlite-probe.test.mjs` | 0，6通过 |
| Mac @4e529c8 | `python3 -m unittest discover -s tests -p 'test_*.py'` | 0，17通过 |
| Mac @4e529c8 | `sh scripts/nas-preflight.sh --json --environment local --repository-sha <SHA>` | 2，Docker缺失BLOCKED，脱敏JSON已提交 |
| Mac @4e529c8 | `python3 scripts/run_sqlite_probe.py --environment nas`、preflight `--help` | 0，plan/帮助，无NAS操作 |
| CI @4e529c8 | 同Node/Python合成测试 | 0 / 0，6+17通过 |
| CI @4e529c8 | `sh scripts/nas-preflight.sh --json --environment ci --repository-sha <SHA>` | 0，清单PASS，可选DSM/Tailscale为NOT_RUN，不算NAS通过 |
| CI @4e529c8 | 官方Compose二进制下载及SHA256校验；`docker-compose version --short` | 0 / 0，实际1.28.5 |
| CI @4e529c8 | `python3 scripts/run_sqlite_probe.py --run --environment ci --repository-sha <SHA> --parent <RUNNER_TEMP>` | 0，完整子命令如下 |
| CI子命令 | `docker context show` / `docker context inspect default --format ...` | 0 / 0，default本地unix socket |
| CI子命令 | `docker-compose -f <compose.yml> -p <专属name> config --quiet` | 0，V1解析通过 |
| CI子命令 | 同prefix `build probe` | 0，固定digest构建 |
| CI子命令 | `docker image inspect klh-pr1a-probe:<专属name> --format ...` | 0，ID/amd64/revision核对通过 |
| CI子命令 | 同prefix `run --rm --no-deps -T --name <专属name>-exercise probe exercise ...` | 0，合成事务及恢复PASS |
| CI子命令 | `docker inspect --format ... <专属name>-exercise` | 1，明确No such object，正常删除 |
| CI子命令 | 同prefix `run --rm --no-deps -T --name <专属name>-verify probe verify ...` | 0，重建数据PASS |
| CI子命令 | `docker inspect --format ... <专属name>-verify` | 1，明确No such object，正常删除 |
| CI | 上传artifact、`gh run download 37783788299`、解析/归档JSON | 0，附件实际存在且已下载验证 |
| Mac | `git diff --check`、本地Markdown链接/围栏校验、公开字段/密钥/IP扫描 | 0，无发现；测试中仅reserved .example/文档用地址为脱敏反例 |
| Mac只读 | 旧math/word `git rev-parse HEAD` / `git status --porcelain --untracked-files=no` | 0，各HEAD仍8e91154/d0b42a8、tracked无变更；不读取数据 |
| NAS | 新预检、config、pull/build、两个容器、持久化/恢复/清理 | BLOCKED，无本PR执行或退出码；未登录、不擅自提权 |

## 15项NAS验收（与Mac/CI独立）

| ID | NAS状态 | 证据、退出状态及不足 |
| --- | --- | --- |
| NAS-01 | BLOCKED | 新preflight未执行，exit N/A；历史账户docker.sock权限不足，未验证当前daemon |
| NAS-02 | BLOCKED | 新Compose在NAS未parse，exit N/A；历史V1.28.5存在，不等于config通过 |
| NAS-03 | BLOCKED | NAS启动未获许可，exit N/A；amd64 base摘要已固定，不等于该设备运行 |
| NAS-04 | BLOCKED | NAS exit N/A；CI加载SQLite3.51.3 PASS、exercise退出0，不能替代 |
| NAS-05 | BLOCKED | NAS exit N/A；Mac/CI回读wal/2/1/3000 PASS |
| NAS-06 | BLOCKED | NAS exit N/A；Mac/CI Node6项退出0，CI合成事务/幂等/冲突/FK PASS |
| NAS-07 | BLOCKED | NAS exit N/A；Mac独立Node进程verify与CI新进程退出0 |
| NAS-08 | BLOCKED | NAS无本PR容器，exit N/A；CI两个不同run --rm容器持久化PASS，各退出0 |
| NAS-09 | BLOCKED | NAS exit N/A；Mac/CI VACUUM INTO与新空目录恢复完整性ok，exercise退出0 |
| NAS-10 | PASS | 本PR NAS零操作，未开端口/改服务；Compose无ports、network none；不冒充NAS网络实测 |
| NAS-11 | BLOCKED | NAS父目录/权限未批准，exit N/A；CI实际UID1001/owned0700 PASS；安全测试拒绝root/错误UID/宽松目录 |
| NAS-12 | PASS | 公开diff及已下载artifact扫描退出0，无私人信息；源数据只synthetic，Tailscale只保留匿名状态；非实机测试 |
| NAS-13 | PASS | 明确保留Linux4.4 < Node24 glibc官方4.18风险；不是“运行失败”结论 |
| NAS-14 | PASS | Mac/CI精确tested SHA 4e529c88ef848a1eae8eebc54595e455b9733e67及实际JSON/CI URL已分环境；NAS执行=false |
| NAS-15 | NOT_RUN | NAS无本PR资产/清理，exit N/A；CI确认两只owned容器都不存在（inspect各1），安全测试退出0，无prune/广域删除 |

## 安全、缺口及NAS影响

NAS写入授权问题已发给用户，但截至本次交接未收到明确批准；没有把等待时间或预选选项当同意。NAS副作用为零：未创建文件/目录/容器/卷、未拉镜像、未改任何配置、未操作现有资产。许可问题由用户请求与任务书明确要求，不能把旧的SSH只读授权当成容器授权。未尝试sudo、改docker.sock、加组、chmod777或docker prune。

运行器默认只读plan；--run且NAS确认旗标才可写，仍须事前真实用户许可。host与容器均非root，绑定排他专属0700目录，Linux文件系统白名单排除NFS/SMB；探针拒绝symlink/未知文件/旧库覆盖。使用WAL/FULL，VACUUM INTO一致性快照，恢复到新建空目录，不直接复制活动主库。

局限：当前没有已验证的NAS daemon权限、新的已认证SSH连接或批准父目录；NAS Python≥3.8与Git存在性也尚未核验，无则BLOCKED、不自动安装。Mac是arm64原生，不能代表amd64 Docker。CI现代Linux已验证合成实现，但不能证明旧NAS kernel/daemon/storage driver/磁盘I/O。没有断电/磁盘满/并发压力/真实数据或业务恢复测试；无网络服务，因此未覆盖未来HTTPS/认证，均属后续单独任务。

## 回滚、清理与下一项确认

Git变更仅在本PR分支，可关闭PR或撤销本PR提交；不删除旧仓库任何文件。本轮NAS未产生资产，回滚/清理 NOT_RUN。

未来若用户允许试验：运行器仅在新生成projectName内创建两次run --rm容器；正常结束确认明确No such object，异常按精确name加compose project/service labels stop/rm。保留合成目录/evidence和镜像cache，手动删目录/派生镜像必须核对所有权并由用户确认；不删共享base，不prune、不down --remove-orphans。现有服务完全不在清理范围。

待用户明确批准：是否进行此隔离NAS实验、专属本地文件系统父目录、已有非root daemon访问方式。没有许可即保留BLOCKED，不提权。ChatGPT复审后才能给修订/下一任务；PR-1B只是候选，未授权。

## 验证过程中发现与修正

首轮CI（6a91f06）容器实验成功，但upload-artifact默认排除隐藏目录，附件并未生成，不能算完整证据交付。已加include-hidden-files和if-no-files-found:error；后续21beca0与最终代码4e529c8的CI均成功，附件实际下载。再补齐派生image ID/revision label及每次容器inspect的数字退出码，防止将base digest/权限错误混成运行证据。最新完整归档为4e529c8，旧轮仅保留修正历史，不用来冒充最终证据。

常规结束没有存活探针容器，CI ephemeral runner保留的合成目录与cache只持续该job生命周期；代码不删除宿主已有目录或共享base。NAS零新资源。私有生产部署路线仍PENDING_USER_DECISION，见运行决策文档。
