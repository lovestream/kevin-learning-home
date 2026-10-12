# KLH-PR-1A-NAS 真机验证报告

归档日期：2026-10-13；实机观察时间为证据中的 **2026-10-08 14:55–15:01 UTC**，不是归档日重新测试。结论：**BLOCKED**。用户明确授权了隔离合成实验，但当前非root账户无法访问 Docker daemon，按任务书停止全部 NAS 写入；没有运行 Node/SQLite 容器，也没有生产部署。

## 来源、许可与证据

来源任务：[KLH-PR-1A-NAS](../tasks/KLH-PR-1A-NAS.md)，分支 `chatgpt/klh-pr-1a-review-nas`，SHA `647b6e34d4e218fb5aaaa7927e0ecf548cc281c9`，blob `9f5ea4b114e83d021f97a8c4d4f4f2fa0b1d7142`。任务只指导执行，不替代用户授权；本次隔离许可来自用户直接消息。

复用已审查 PR #1 HEAD `1666d86c50ad49b615d7a3c417eab9e496c28f3b` 的 `scripts/nas_preflight.py`，核对源码字节后通过已认证 SSH 标准输入执行，没有在 NAS 复制文件。脚本 SHA256 `9bec2fd5c88424785a9ada37325decd991b30fad8b8819b2d9040028ca53e245`。该 HEAD [CI 已通过](https://github.com/lovestream/kevin-learning-home/actions/runs/37784493808)；未重复开发探针。[公开证据索引](evidence/pr-1a-nas/index.json)提供各脱敏文件摘要。

身份来自已认证 SSH、独立读取群晖型号/DSM 字段与内核/架构，不能只凭 `--environment nas` 标签证明真机。只读补充检查使用元数据、进程名称计数及状态布尔量，不读取目录内容、真实学习记录、进程命令行或 peer 列表。原始错误在采集时私下保存于 Git 外权限受限临时目录；2026-10-13归档复核无法定位原临时目录，因此原始错误附件当前不可提供。公开错误类别、数字退出码与前后脱敏清单仍可核验，JSON各检查的保留标志只描述采集时行为，不能当作当前附件可用证明。公开文件不含账号、IP、主机名、私有路径或凭证。

## 实机环境与命令结果

| 检查 | 实测结果/退出码 | 含义 |
| --- | --- | --- |
| SSH、型号与工具 | exit 0；DS918+、x86_64、J3455 4核、Linux4.4.180+；Python3.8.12、Git2.39.1 | Python/Git 存在性阻塞已排除 |
| DSM | 7.1.1 build42962 smallfix6 | 只读，未升级 |
| 既有源码 preflight 前/后 | exit 1 / 1，清单总体 FAIL | 内核低于基线及 V2 CLI 报错；不是 Node 运行失败 |
| Docker Client | 20.10.3，exit 0 | 仅证明客户端存在 |
| Docker Server | exit 1，BLOCKED / PERMISSION_DENIED；独立复核仍 exit 1 | 当前非root账户无 daemon 权限，必须停止写入 |
| socket 元数据 | 0660，owner UID/GID均0；当前用户非owner、非owner组，读写允许=false | 没有 chmod、加组、sudo、socket挂载或提权；不能建议加入 root 组 |
| Compose V1 | 1.28.5，exit 0 | config 因权限闸门 NOT_RUN |
| V2短版本参数 | exit 125，原清单 COMMAND_FAILED_REDACTED；补查为 LEGACY_CLI_UNSUPPORTED_FLAG | 保留原脚本输出，不把可选 V2 错误当 V1 不存在 |
| V2不带短参数 | exit 1，COMPOSE_PLUGIN_UNAVAILABLE | V2不可用，未安装插件 |
| 非登录 PATH | 裸 `docker` 两次 exit 127；reviewed locate 解析既有可执行文件后 daemon exit1/V2 exit125 | 没有安装或改 PATH；未来运行器进程 PATH 还需确认 |
| Tailscale | 1.102.3、Running、selfOnline=true、MagicDNSConfigured=true，exit 0 | Serve/Funnel配置均空，Funnel未启用；没有配置访问入口 |
| 本地卷与候选目录 | ext4，约2267.1 GiB可用；卷根当前用户不可写；候选元数据可写/本人所有，但 POSIX mode0777 | 候选目录未检查内容、未核验ACL/容器挂载、未批准为专属父目录；PASS元数据不等于可运行许可，未选择/修改 |
| 基线 | 8080/4177未监听；dockerd1/containerd1/tailscaled1/node2 | 进程存在不等于容器健康；daemon限制使容器清单/挂载核查BLOCKED |

前后 host/client/server/socket/V1/V2/Tailscale/DSM/端口事实一致；Serve/Funnel与进程名称计数一致。磁盘余量可随既有系统活动改变。未枚举全部现有容器，因此不声称已核验每个容器健康或挂载不变。全部 NAS 操作只读，没有任何本次资源。

## NAS-01～15 当前验收矩阵

状态为这台 NAS 的结果，不借用 Mac/CI PASS；其中 PASS 的流程/风险项目也不意味着运行通过。

| ID | NAS状态 | 实测依据与限制 |
| --- | --- | --- |
| NAS-01 | BLOCKED | 当前 preflight已执行；Client exit0，Server exit1权限不足 |
| NAS-02 | BLOCKED | V1版本exit0；config NOT_RUN，权限闸门未满足 |
| NAS-03 | BLOCKED | 固定amd64 Node镜像未拉取/构建/启动，exit N/A |
| NAS-04 | BLOCKED | SQLite加载未运行，exit N/A |
| NAS-05 | BLOCKED | WAL/FULL/FK/timeout未回读，exit N/A |
| NAS-06 | BLOCKED | 合成事务/回滚/幂等/冲突/FK未运行，exit N/A |
| NAS-07 | BLOCKED | 重连与独立进程读取未运行，exit N/A |
| NAS-08 | BLOCKED | 两容器删除重建及数据持久化未运行，exit N/A |
| NAS-09 | BLOCKED | 一致性备份与空目录恢复未运行，exit N/A |
| NAS-10 | PASS | NAS零写入、未开端口；前后已观测端口及Serve/Funnel一致。不是完整现有服务验收 |
| NAS-11 | BLOCKED | 非root成立，但daemon无权限；未有批准、隔离、限制权限且排除既有数据/挂载的专属父目录 |
| NAS-12 | PASS | 仅脱敏平台/错误类别，未接触真实记录；没有运行数据集或公布原始错误 |
| NAS-13 | PASS | 明确保留4.4低于Node24 glibc支持基线4.18；风险披露完成，不代表运行成功 |
| NAS-14 | PASS | 当前NAS源码SHA1666、实机时间、数字退出码与Mac/CI分栏；runtimeRunnerInvoked=false |
| NAS-15 | NOT_RUN | 无本次容器、目录、镜像或卷需要清理，exit N/A；未执行prune或广域删除 |

汇总：10项 BLOCKED、4项流程/风险 PASS、1项 NOT_RUN；没有任何 NAS SQLite 运行 PASS。总路线结果 **BLOCKED**，不标 `RUNTIME_FAILED` 或 `RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL`。

## 阻塞解决方式、资源与后续路线

Docker访问需要用户提供既有、适当授权的非root访问方式，再确认一个限制权限的专属本地父目录并只读排除既有数据/服务挂载。若没有这些条件，继续保留 BLOCKED；不自动修改 socket、组、权限、DSM、Tailscale 或服务。隔离实验许可已经收到，不必重复索取，但额外权限变更不在许可内。

本次资源/清理：目录0、容器0、镜像0、数据卷0、NAS文件复制0、系统配置变更0；清理 NOT_RUN。既有服务不在操作范围。没有真实数据导入、旧仓库改动、课程重构或钱包合并。

即使未来取得权限并通过合成实验，也不能证明长期负载、断电、磁盘满、UPS、真实课件、服务认证或 Tailscale HTTPS；Linux4.4支持差距仍在。路线B/C保持未部署验证，见[运行路线](PR-1A-runtime-decision.md)。用户最新提出 Cloudflare，已增加[免费路线评估](Cloudflare-feasibility-assessment.md)，只是研究候选，不继续NAS写入、不创建云资源。

更新 PR #1 报告与交接并验证最新 HEAD CI 后暂停，等待 ChatGPT 独立复审；不合并、不进入 PR-1B。
