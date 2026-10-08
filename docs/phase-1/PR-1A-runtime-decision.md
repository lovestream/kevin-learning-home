# PR-1A 运行路线评估

日期：2026-10-08。结论为 **PENDING_USER_DECISION**，不选择生产部署、不进入 PR-1B。当前阶段只交付隔离探针；Mac/CI 结果不能证明 DS918+ 实机可用。

| 路线 | 建议状态 | 已知证据 | 未验证和批准条件 |
| --- | --- | --- | --- |
| A：现有 NAS Linux4.4 + glibc Node24 | **CONDITIONAL**，仅作为隔离实验；作为官方支持生产默认方案 **REJECT** | Phase0：DS918+ / DSM7.1.1 / x86_64 / Docker CLI20.10.3 / Compose1.28.5；Node24.15.0固定bookworm-slim amd64 digest已解析 | NAS写操作未获本任务许可；daemon权限阻塞；Node/SQLite/WAL/重建/恢复尚未实测。即使实验通过，也保留官方支持差距，须用户另行接受风险及生产ADR |
| B：现有 NAS + Alpine/musl Node24 | **CONDITIONAL**，额外研究候选，实测 **NOT_RUN** | Node支持表 x64 musl kernel≥3.10/musl≥1.1.19，但列为 Experimental | 没有锁定B路线镜像、没有执行；需另行任务与授权验证 musl 二进制、SQLite行为和依赖兼容，不能声称换Alpine即解决 |
| C：现代 Linux 计算节点 + NAS保存备份 | **RECOMMEND**，技术方向；部署选择 **PENDING_USER_DECISION** | 可把计算节点置于Node支持范围，在本地文件系统运行SQLite；本PR的现代Linux CI用于验证探针，不是部署节点 | 未指定生产节点，NAS一致性备份传输/保留/离线副本/恢复未执行；VM包并非已安装能力。节点成本、运维与运行位置由用户决定 |

Node 24.15.0 [官方固定版本平台表](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list)规定 glibc linux-x64 kernel≥4.18、glibc≥2.28（Tier1）；musl x64 为 Experimental。旧 NAS 4.4.180+ 已知低于前者，这个事实不会因单次成功启动改变。Node 官方还要求生产运行在受支持平台；本轮不降Node版本、不改SQLite驱动、不升级DSM/Docker。

容器提供用户空间并共享宿主内核，换Debian基础镜像不能改变NAS内核；这是从[Docker架构说明](https://docs.docker.com/get-started/docker-overview/)与Node支持表作出的判断。C路线的SQLite在线文件仍应放在计算节点本地文件系统，NAS只接收一致性快照，不能把NAS SMB/NFS挂载当WAL工作目录。[SQLite WAL同机限制](https://www.sqlite.org/wal.html)、[VACUUM INTO一致性快照](https://www.sqlite.org/lang_vacuum.html#vacuum_with_an_into_clause)。

探针通过只证明合成单写者与正常退出的提交/回滚、快照、重建。它不覆盖断电、磁盘满、介质故障、长期负载、NAS重启、UP​​S、业务恢复或真实数据迁移。任何未执行路线不填PASS。实际测试SHA、命令码、CI与NAS分栏见[执行报告](PR-1A-execution-report.md)。

下一步由 ChatGPT 复审代码/报告/CI，再由用户决定是否授权NAS实验、如何使用既有非root daemon权限及专属测试父目录。若旧内核方案最终不采用，C路线需新任务明确主机及备份协议。不得自己部署、配置Serve/Funnel、迁移课程或合并钱包。
