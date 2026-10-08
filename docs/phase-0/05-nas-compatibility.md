# 05 · NAS 部署兼容性评估

日期：2026-10-08。用户完成SSH密码登录，本轮复用临时连接执行只读命令，结束后关闭连接。没有保存密码，没有使用交互sudo，没有拉镜像、启动容器、更改权限、修改Serve或Funnel。公开文档省略设备IP、SSH端口、tailnet域名、账户身份及peer列表。

## 实机盘点

| 项目 | 只读结果 | 可得结论 |
| --- | --- | --- |
| 型号/CPU | DS918+；Intel Celeron J3455 1.50GHz；x86_64 | 目标为linux/amd64；不能部署Mac arm64本地构建产物 |
| 系统 | DSM 7.1.1，build42962，smallfix6 | 版本已核对；没有执行系统升级 |
| 内核 | Linux 4.4.180+ | Node24官方glibc Linux x64支持表之外，见下文 |
| 内存 | 总计7606MiB，当时available约4829MiB | 小型单体具备资源候选；未做负载验证 |
| Docker包/CLI | Docker包20.10.3-1308；CLI20.10.3 | 可见客户端；不等于daemon已核验可用 |
| Docker daemon权限 | 当前登录账户无docker.sock读写权限；docker version无法返回Server版本；sudo -n要求密码 | daemon版本、storage driver、镜像清单、容器运行均未验证 |
| Compose | 独立docker-compose1.28.5；docker compose子命令不存在 | 任务书不能默认Compose V2；需兼容V1命令或后续单独升级决策 |
| Tailscale | 包1.102.3-700102003；CLI1.102.3；BackendState=Running，Self_online=true | 已运行；MagicDNS后缀存在，未公开值 |
| Serve/Funnel | Serve status --json为`{}`；Funnel config_empty=true、AllowFunnel_enabled=false；serve --help可用 | 当前没有Serve配置/启用的Funnel；未验证HTTPS端到端 |
| 本地卷 | /volume2在/proc/mounts为ext4；约38%占用，剩余约2.2TiB | 存在本地文件系统候选；默认/volume1的df结果为root挂载，不能照抄/volume1路径 |
| 卷权限 | 当前账户对/volume2根无写权限 | 应由家长/管理员指定应用子目录、UID/GID与权限；未创建目录作写探针 |
| 端口 | netstat未发现8080/4177监听 | 当时无监听冲突；不等于防火墙或公网映射检查完成 |
| VM | Virtual Machine Manager包未安装 | 现代Linux VM不是现成部署资源 |
| UPS | ups工具未得到有效状态 | UPS、DSM断电策略、自动恢复未验证 |

没有输出docker inspect的环境变量、tailscale全peer JSON或学习数据目录内容。当前只能评估可行性与缺口，不能声称NAS部署成功。

## Node24 与旧内核：首要决策门槛

Node `v24.15.0`官方支持表：glibc Linux x64 Tier1要求kernel>=4.18、glibc>=2.28；x64 musl平台列为Experimental，要求kernel>=3.10、musl>=1.1.19。当前NAS4.4不满足前者。容器可以提供新glibc，但仍使用宿主内核；仅换`node:24-bookworm`无法消除内核支持差距。这是**支持边界风险**，不是未经运行就断言Node必然无法启动。[Node24固定版本支持表](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list)、[Docker容器架构](https://docs.docker.com/get-started/docker-overview/)。

建议Phase1先做只含合成数据的Node/SQLite/WAL/网络探针，而不是先迁移真实学习记录。即使探针通过，也只是实测可运行，不能改写成官方Tier1支持。

| 路径 | 好处 | 条件与风险 | 当前建议 |
| --- | --- | --- | --- |
| NAS原内核+Node24 glibc镜像 | 贴近任务书、运维简单 | 官方支持基线不满足；需实测与家长接受风险，不能靠版本号猜测 | 作为隔离探针候选；未批准生产 |
| NAS原内核+Node24 Alpine/musl | Node支持表内核下限较低 | musl为Experimental，镜像二进制/SQLite/依赖差异需验证 | 不作为默认绕过方案 |
| 现代内核Linux VM/其他tailnet Linux主机 | 可满足Node支持表，SQLite在本机存储 | VM包/型号/卷支持未验证；外部主机运行位置改变原NAS目标，需决定；NAS可承担私有备份 | 兼容性失败时讨论的架构备选 |
| DSM/Docker升级后重新核验 | 改善运维与镜像兼容 | 不能假设DSM升级就把DS918+内核变到4.18以上；不属于本轮授权 | 不自动升级，不先承诺效果 |
| Node降版本/换SQLite驱动 | 可能绕开部分环境问题 | 偏离现有Node>=24/node:sqlite基线；增加代码与迁移风险 | 独立ADR才能考虑，不默认实施 |

官方Node镜像具有不同基础发行版与架构，后续应锁定经过验证的tag/digest而不是长期漂移`node:24`。[Node Docker官方仓库](https://github.com/nodejs/docker-node/blob/main/README.md)。VM只能作为有条件候选，先核验Synology包要求及本机卷支持。[Synology Virtual Machine Manager](https://www.synology.com/en-global/dsm/packages/Virtualization)。

## 目标网络拓扑（提案）

```text
Mac/iPad（都在tailnet）
  → 同一个 HTTPS <nas>.<tailnet>.ts.net
  → 宿主 Tailscale Serve（私网，不启用Funnel）
  → 127.0.0.1:8080 Caddy
  → Docker自定义bridge上的 app:4177
  → /data 内单份SQLite + 私有媒体/导入快照
```

app绑定容器内0.0.0.0是容器网络需求，但4177不发布到宿主。仅proxy发布`127.0.0.1:8080:80`，不发布NAS LAN地址或公网。Docker网络名`internal`只是名字；任务书`internal: {}`并没有启用Docker的`internal: true`隔离。是否禁止容器出站需显式决策，不把网络命名当安全事实。

Serve CLI存在，当前未配置；未来执行`tailscale serve --bg http://127.0.0.1:8080`前应核对本机help、HTTPS/MagicDNS与tailnet授权，记录私有URL。本轮没有执行此命令。Serve只在tailnet服务，Funnel提供公网服务，权限边界不同。[Serve功能](https://tailscale.com/docs/features/tailscale-serve)、[Serve CLI](https://tailscale.com/docs/reference/tailscale-cli/serve)。

app会话和家长授权依然必需。Tailscale身份头可以辅助识别，但tagged设备不一定有用户身份头；它们也不等于家长权限。只在明确的受信代理入口使用，不能让直接LAN客户端伪造身份。[Serve identity headers](https://tailscale.com/docs/features/tailscale-serve#identity-headers)。

## 与当前数学后端的不兼容点

当前`server/index.mjs`硬编码监听127.0.0.1，只接受localhost/127.0.0.1 Host；`parent-access.mjs`要求写Origin等于`http://${host}`。Compose里的HOST/PORT/DATA_DIR不会被读取。容器间Caddy无法连到另一容器的127.0.0.1；把Host重写成localhost也不能让浏览器HTTPS Origin变成HTTP。

因此后续只在**新仓库的适配副本**实现配置化监听、固定PUBLIC_ORIGIN、代理信任、Secure会话/CSRF、导入恢复权限。旧仓库原样保留。不能仅改0.0.0.0、删除Origin校验或放开所有Host后宣布安全整合。

Phase1英语静态服务可工作，但localStorage仍随设备与origin隔离。新HTTPS地址下首次看到空记录不等于旧记录丢失；需以后从真正使用的旧origin导出。当前静态图片、音频、TTS在Safari/iPad是否全部可用还要实测。

## SQLite、卷与备份

SQLite WAL必须放在NAS实际本地文件系统，不放SMB/NFS挂载；WAL依赖同机共享内存和单writer。任务书的一份SQLite适合小型家庭应用，但单库多个server replica不是当前设计。[SQLite WAL限制](https://www.sqlite.org/wal.html)。

bind mount的路径与权限是宿主属性，不是在Dockerfile里建好/data就获得写权限。应指定一个NAS应用专属子目录，UID/GID固定，只有server可写；readonly内容与媒体分开。实际目录尚未选择，不使用`chmod 777`临时绕过。[Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)。

新平台需要WAL/FULL、foreign_keys、busy_timeout及单writer，镜像对node:sqlite的运行与一致性backup能力须确认。`node:sqlite`从v24.15.0为release candidate，不应误写成毫无稳定性风险的API。[Node24 SQLite文档](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)。

原数学JSON逻辑备份能保护单一progress对象，但不涵盖未来平台表、私有媒体、课程版本、配置与凭证恢复。新备份需一致性SQLite快照（backup/VACUUM INTO或验证过的等价流程）、媒体清单hash、content_versions、schema版本及恢复说明。另有一份NAS之外的私有备份。在线单独复制sqlite不算一致性备份。

## Phase1 必须产出的实机证据

| 检查 | 验收条件 | 当前状态 |
| --- | --- | --- |
| daemon/Compose | 有权限读Server版本与存储驱动；Compose文件校验；无需开放docker.sock给app | 未完成 |
| 镜像架构/内核 | linux/amd64固定镜像；Node24启动、node:sqlite导入成功；记录宿主内核支持风险 | 未完成 |
| WAL事务 | 合成数据提交/回滚/并发去重、integrity_check、busy退避 | 未完成 |
| bind mount | 非rootUID正确写入、容器删除重建保留合成数据；内容readonly | 未完成 |
| 反代/认证 | HTTPS同origin读写；错误Host/Origin拒绝；student不能导入恢复/家长批阅 | 未完成 |
| Serve权限 | 私有HTTPS仅tailnet可达、Funnel关闭；外部iPad与Mac共URL | 未完成 |
| 完整恢复 | 空目录恢复SQLite+内容+媒体+配置；逐字段一致 | 未完成 |
| UPS/重启 | UPS策略确认，NAS/服务重启合成记录仍在、session按设计失效 | 未完成 |

当前结论：**硬件、Docker/Tailscale安装与本地卷构成部署候选；Node24支持边界、daemon权限、容器持久化和HTTPS认证阻止“已兼容/可上线”结论。**
