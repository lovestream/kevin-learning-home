# PR-1A 运行路线评估

日期：2026-10-13（原路线研究2026-10-08）。结论为 **PENDING_USER_DECISION**，不选择生产部署、不进入 PR-1B。NAS真机只读观察已完成，但daemon权限阻塞使运行探针未执行；Mac/CI结果不能证明DS918+实机可用。

| 路线 | 建议状态 | 已知证据 | 未验证和批准条件 |
| --- | --- | --- | --- |
| A：现有 NAS Linux4.4 + glibc Node24 | 运行 **BLOCKED**；作为官方支持生产默认方案 **REJECT** | 本轮已认证真机只读：DS918+ / DSM7.1.1 / x86_64 / Docker Client20.10.3 / V1.28.5；Python/Git存在；Server exit1权限不足；Linux4.4.180+ | 隔离实验已获许可，但daemon与专属父目录条件不满足，运行器未调用。没有证明运行失败或不稳定；即使实验通过仍有官方支持差距，需另行接受风险及生产ADR |
| B：现有 NAS + Alpine/musl Node24 | **CONDITIONAL**，额外研究候选，实测 **NOT_RUN** | Node支持表 x64 musl kernel≥3.10/musl≥1.1.19，但列为 Experimental | 没有锁定B路线镜像、没有执行；需另行任务与授权验证 musl 二进制、SQLite行为和依赖兼容，不能声称换Alpine即解决 |
| C：现代 Linux 计算节点 + NAS保存备份 | **RECOMMEND**，技术方向；部署选择 **PENDING_USER_DECISION** | 可把计算节点置于Node支持范围，在本地文件系统运行SQLite；本PR现代Linux CI已验证固定amd64探针/重建/备份恢复（tested SHA 4e529c88ef848a1eae8eebc54595e455b9733e67），不是生产部署节点 | 未指定生产节点，NAS一致性备份传输/保留/离线副本/恢复未执行；VM包并非已安装能力。节点成本、运维与运行位置由用户决定 |
| D：Cloudflare Workers + D1 + 七牛或可选R2 | **RECOMMEND_FOR_NEXT_VALIDATION**，用户最新提出的优先验证候选；部署 **NOT_RUN** | 已核验当前官方免费额度与运行时差异，家庭低流量可能满足；详见[Cloudflare评估](Cloudflare-feasibility-assessment.md) | 需批准补充ADR及单独合成验证任务；D1原子性/CAS/幂等、2MB行限制、CPU、持久会话、备份和实际网络均未实测；不直接搬当前SQLite容器 |

Node 24.15.0 [官方固定版本平台表](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list)规定 glibc linux-x64 kernel≥4.18、glibc≥2.28（Tier1）；musl x64 为 Experimental。旧 NAS 4.4.180+ 已知低于前者，这个事实不会因单次成功启动改变。Node 官方还要求生产运行在受支持平台；本轮不降Node版本、不改SQLite驱动、不升级DSM/Docker。

容器提供用户空间并共享宿主内核，换Debian基础镜像不能改变NAS内核；这是从[Docker架构说明](https://docs.docker.com/get-started/docker-overview/)与Node支持表作出的判断。C路线的SQLite在线文件仍应放在计算节点本地文件系统，NAS只接收一致性快照，不能把NAS SMB/NFS挂载当WAL工作目录。[SQLite WAL同机限制](https://www.sqlite.org/wal.html)、[VACUUM INTO一致性快照](https://www.sqlite.org/lang_vacuum.html#vacuum_with_an_into_clause)。

探针通过只证明合成单写者与正常退出的提交/回滚、快照、重建。它不覆盖断电、磁盘满、介质故障、长期负载、NAS重启、UPS、业务恢复或真实数据迁移。任何未执行路线不填PASS。实际测试SHA、命令码、CI与NAS分栏见[执行报告](PR-1A-execution-report.md)。

本轮只读结果与15项矩阵见[NAS真机报告](PR-1A-nas-validation-report.md)。隔离NAS许可已收到，daemon不足时不提权、不改权限、不继续写入。用户正在评估Cloudflare替代路线；下一步由ChatGPT复审代码/报告/CI与候选D，再由用户选择运行目标并转交新的明确任务。C需明确主机/备份，D需明确存储/事务/权限契约与验证范围。不得自己部署、配置Serve/Funnel、迁移课程或合并钱包。
