# IMPLEMENT-01 NAS GATE｜DS918+ 隔离真机验收

2026-10-21，Asia/Shanghai。沿用草稿 [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5) 与 `codex/implement-01-foundation`，不合并、不进入IMPLEMENT-02。用户本轮明确授权一次性专用容器、镜像、合成目录的创建、运行及清理，使用现有Docker管理认证，没有配置sudo或更改权限策略。

## 输入、镜像与覆盖边界

任务来自 `chatgpt/klh-implement-01-review-phase2@dd3480843525717a91c687e387d20180eeb6e3b0`，`KLH-IMPLEMENT-01-NAS-GATE.md` blob `0efa9a419644cedd94b39d18f36d09e7e50351dc`，原样归档。已阅读R1复审结论、R1报告、部署与备份手册，以及任务列出的Store、writer-lock、checkpoint、Docker/Compose与三份回归源码。

开始时PR最新HEAD为已通过复审的 `8b80dce3be7d836f6abe6fdb569f6553ecd2a6cc`，两条原CI39581355981/39581348935成功。随后只增加NAS测试、CI打包和报告，正式 `apps/`、`packages/`、Dockerfile/Compose、依赖锁、维护工具与30项回归源码均保持该SHA原样；不是改架构后重新包装旧验收。

Mac没有Docker，本轮在GitHub Actions用 `git archive 8b80dce...` 作为构建上下文，按正式Dockerfile与锁定的Node24.15.0 Debian amd64 manifest构建专用镜像；不将镜像推向registry。只增加run-id与source SHA标签。harness以同一正式镜像为FROM，额外复制原样package-lock、synthetic.ts及原有tests/foundation，未安装另一套Node/原生模块，也没有向正式层加入测试身份或后门。

镜像通过CI artifact取回，检查归档SHA256、仅含计划的两个RepoTags，传入NAS后再次核hash与完整image ID/label，再运行。两镜像现场比较Node、ABI、SQLite、fs-ext版本以及Node二进制、fs_ext.node与核心源码SHA；harness的lockfile hash与8b80dce原文件一致。image ID是本地config ID，和Dockerfile固定的base registry manifest digest含义不同。详见[结构化摘要](evidence/nas-gate/summary.json)。

## 只读预检与隔离

DS918+ / DSM7.1.1 build42962 update6 / Linux4.4.180+ / x86_64 / Docker20.10.3 API1.41 / Compose1.28.5。预检确认专用父目录canonical、当前UID所有且可写，本地ext4非只读，新run目录不存在；剩余空间与内存原值见JSON，不公开私网IP、用户名或NAS绝对路径。

两个run-id对应的目录、镜像和容器均独立；前一次已清理才创建后一次，从未复用BENCH旧目录。创建前提交[资源计划](../../tests/nas-gate/run-plan.json)。容器统一run label、准确名称，目录包含owner-marker；最多两个同时运行，非root、readonly rootfs、512MiB/容器、单逻辑CPU、cap_drop ALL、no-new-privileges、独立PID命名空间、network none、**不发布宿主端口**。未挂docker.sock、host PID/network或旧站目录，不申请旧内核缺少的NanoCPU/PID limit能力。临时health周期2秒，正式镜像仍20秒，健康命令不变。

开始和阶段间仅检查既有8个容器的ID、状态、启动时间、重启计数，原名和ID仅留本地私有证据。原数学/英语Git HEAD与跟踪文件未改，见[源站独立性](evidence/nas-gate/source-independence.json)。没有从现有容器私密配置推断网站位置，不能将容器存活摘要或Git审计冒充外部站点HTTPS/真实记录可用性验收。

## 失败与探针适配记录

1. 首次只读清单查询exit1：Docker20对缺失的 `.State.Health` 字段报 `map has no entry for key Health`。发生在任何NAS写入前。改用Go template的index/with可选字段访问，未修改NAS；见[预检记录](evidence/nas-gate/preflight-attempts.json)。
2. 首个完整尝试 `20261021-2889e070`：正式镜像/原生ext4操作G01通过，原30项Node回归全部通过；双容器排他、活跃备份拒绝、503/live200以及unhealthy不重启均已有证据。自动重启故障注入命令exit1，原因为DSM缺少 `/proc/1/task/1/children`（ENOENT），当时应用仍健康，未发送SIGKILL。立即停止后续测试，按marker/label/ID清理全部本轮资源，原8个容器ID/启动时间/计数/状态不变。该次G02失败、G04未执行，**没有标成全通过**。见[完整失败尝试](evidence/nas-gate/attempt-1-summary.json)及独立归档的attempt-1结果。
3. 只修改本次测试控制脚本的进程定位：先确认测试容器使用私有PID命名空间，在其 `/proc` 中要求PPID=1、精确argv `apps/server/main.ts`、UID一致且唯一，复核后只杀该Node；不按PID判断writer锁过期，不碰宿主或其他容器进程。使用全新run-id重测。正式Node/SQLite/flock、主机、Docker安全策略与系统配置均未修改，也没有切换base/取消seccomp来掩盖兼容问题。

## G01～G05 最终结果

最终run-id：`20261021-7341fdd4`；真实机执行UTC `2026-10-21T13:25:28Z`～`13:28:38Z`（北京时间21:25:28～21:28:38）。NAS控制器正常exit0。总体 **PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK**，不等于生产部署批准。

| 关卡 | 真机状态 | 直接证据与退出码 |
| --- | --- | --- |
| G01 正式镜像与原生运行时 | PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK | Node24.15.0 / ABI137 / SQLite3.51.3 / fs-ext2.1.1，UID1024；Node/addon/核心文件哈希一致；ext4 flock/hardlink/fsync，空库正式启动与健康命令exit0 |
| G02 所有权与异常恢复 | PASS_NAS | 真实双进程首次初始化恰1 owner；另一正式容器exit1拒绝且原owner健康；Node进程SIGKILL注入exec exit137，Docker RestartCount=1后healthy；人工docker kill exit137后同卷重建，11表摘要和原receipt不变 |
| G03 SQLite与有界健康检查 | PASS_NAS | 原30项Node全部通过、0失败/跳过、harness exit0；WAL/FULL=2/FK=1/busy_timeout=3000；尾部SQL失败回滚、CAS一成功一409；10万事件30次ready=180 SQL，live零SQL，故障ready503/live200，恢复200 |
| G04 离线备份与全新目标恢复 | PASS_NAS | 活跃writer时backup exit1；停机后使用正式镜像backup/restore分别exit0；VACUUM INTO+媒体/content SHA与11表摘要保持；恢复原commandId为duplicate；已存在目标exit1拒绝；恢复目录用正式镜像ready |
| G05 清理与原服务存活 | PASS_NAS | 两个run均0残留容器、0残留镜像、目录不存在；按marker/label/完整ID精确清理；原8容器状态、ID、启动时间和重启计数不变，无global prune |

[summary与命令退出码](evidence/nas-gate/summary.json)、[30项逐例](evidence/nas-gate/test-cases.json)、[进程所有权](evidence/nas-gate/ownership.json)、[readiness SQL](evidence/nas-gate/readiness.json)、[恢复回归](evidence/nas-gate/recovery.json)、[服务存活指纹](evidence/nas-gate/service-survival.json)、[另一次只读清理确认](evidence/nas-gate/cleanup-confirmation.json)、[源码不变与控制器hash](evidence/nas-gate/application-invariance.json)。原始JUnit、自己测试容器输出、服务原ID和准确运行路径只留本地忽略目录，不上传其他服务后台日志或NAS私密配置。

正式镜像config ID：`sha256:f9e4260b5fcf4b6676a6255da3add215b9c8bc7e985e30f81ef20c6d5d061d3a`；harness：`sha256:0af84efb8f345cb92f45a5edc3c2988dc8e4cae50f36b993f96ed9e2afbdfa3c`。实际控制器SHA256 `5a228c201d29fe21eef2642cdeb067cc37f451dafd1fc26ffe5147c61fac91be`，最终提交保留同一文件字节。正式镜像中测试harness不存在已实测；正式与harness核心运行时共用构建产物，不将harness的测试身份开放到生产层。

恢复过程中没有通过删除锁文件取得所有权；结束时所有测试写入者停止并删除后，才按owner-marker删除整棵专用合成目录（包含其测试锁文件）。两次资源清理均未触碰旧BENCH或其他Docker对象。

## 性能、官方支持与长期风险

本次30项回归含容器/SSH控制耗时47.976秒；10万事件ready的30次样本max=8.403ms。一次正式容器样本为CPU15.42%、内存36.08MiB/512MiB，采于探针运行期；旧内核Docker stats的BlockIO=0B/0B、PIDs=0只能按原始计数记录，不能据此声称没有进程或没有IO。清理前专属目录约91.37MB（主要是镜像归档），不是磁盘硬配额。

所有延迟和资源值均来自专属测试容器，未采样其他服务进程。10万合成capacity事件仅验证体量下固定SQL与故障探测，不是10万真实学习操作。保留实际max观测与CPU/内存/IO摘要，不作为生产P95、十年稳定性或恢复时间SLA。

即使本次全部通过，结论也仅是 **PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK**：当前DS918+能执行本次固定镜像，不代表Node24官方支持Linux4.4。Node24 GNU/Linux x64 glibc Tier1基线为kernel>=4.18、glibc>=2.28，见[该版本官方BUILDING.md](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list)。容器共享宿主内核；未来Node/V8/libuv/glibc、原生ABI、seccomp或DSM/Docker升级都可能破坏当前实测兼容性，升级必须重新做同类关卡。正式部署仍需接受风险或迁往受支持现代Linux，不能自行升级NAS/降级Node/放松安全隔离。

真实断电、OOM/硬盘故障、10年数据/10TB媒体、7天持续运行、生产加密/密钥、异地备份、HTTPS/家长权限、真实Mac/iPad、跨NAS迁移演练、ARM/Android均NOT_RUN。只验证合成小样本检查点与已提交事件；没有导入Kevin记录、课程或统一钱包，也没有启动生产常驻服务或安排定时任务。

## CI、交接与停止线

镜像构建/归档 [39607483176](https://github.com/lovestream/kevin-learning-home/actions/runs/39607483176) 成功，对应测试准备提交 `edcbd4027b22f1fcc646bd87766c416938d7d978`，构建应用源码精确为8b80dce。该提交的 [完整CI 39607490846](https://github.com/lovestream/kevin-learning-home/actions/runs/39607490846) 与 [另一事件39607483175](https://github.com/lovestream/kevin-learning-home/actions/runs/39607483175) 均成功。新增CI只静态解析Python控制器与六段嵌入Node探针，不从GitHub连接NAS；原Node30、Chromium3视口、Compose V1和现代Linux容器完整验证继续保留。

报告归档提交本身会再次执行完整CI；最终精确HEAD、两条运行链接及成功状态由[PR #5 checks](https://github.com/lovestream/kevin-learning-home/pull/5/checks)与PR说明单独交叉记录，交接条件是最终HEAD两条CI成功，不将此前SHA结果冒充归档提交的执行结果。见[证据索引](evidence/nas-gate/index.json)。镜像artifact保留1天，仅供本次传输，私有本地归档保留；没有发布生产镜像或永久存储服务。

保留R1的日期、SHA、21→30项演进与历史失败CI；NAS结果单独归档，不将现代Linux CI冒充NAS。原回归JSON里固定写入的 `PASS_LOCAL` / `never NAS` 是既有fixture文字，保留原字节于result字段；外层明确NAS执行上下文、镜像/源码hash与真实JUnit，不能将历史注释当执行机器判据。

整改源码与报告、[IMPLEMENT-01交接](../handoff/IMPLEMENT-01.md)、[current交接](../handoff/current.md)均在PR #5同一开发分支。**保持Draft，完成后STOP，等待ChatGPT独立复审；不自动合并、不开始02A/02B、不部署NAS生产服务。**
