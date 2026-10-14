# BENCH-02 运维、备份与恢复

这是合成业务原型操作指南，不授权生产部署。Node主库须在本地ext4/其他被核验的本地文件系统；SQLite WAL不放SMB/NFS上。Docker镜像只读，运行用户非root，唯一可写数据目录单独挂载。代码、在线DB、对象、备份和日志是独立生命周期。

## 已测与未测

Mac：WAL/FULL/FK/3000ms busy_timeout，BEGIN IMMEDIATE事务、100重复HTTP幂等、两会话CAS、SQL失败回滚、进程重启、SIGKILL恢复、VACUUM INTO、逻辑导出、新空环境恢复、浏览器离线冲突与对象权限。现代Linux CI另测受限非root容器删除/重建，保留同数据挂载后的session/state/receipt。完整JSON与container-ci.json是证据，不把CI标成NAS。

2026-10-14 DS918+：SSH密钥只读检查成功；Linux4.4.180+、Docker Client20.10.3，当前用户Server权限拒绝。备选测试目录不存在且父目录为可写本地ext4。新业务容器和Docker专用sudo范围待用户确认；尚未执行NAS写入。最新权限状态见nas-preflight-20261014.json；没有改docker.sock、组、DSM、Tailscale或现有容器。即使将来Node24跑通，也保留低于官方支持基线的风险，不擅自更换镜像/放开seccomp/privileged绕过。

## 本地复现

在Node路线分支根目录执行 `npm ci`、`npm run test:shared`、`npx playwright install chromium`、`node tests/platform-parity/run-platform.mjs node`。脚本只生成owned临时目录、合成数据及脱敏JSON，不连NAS或云。Linux Docker专用验证使用 `node experiments/node/container-suite.mjs`，仅创建UUID命名的测试镜像/容器；不运行全局prune。

NAS专用Dockerfile.nas/nas-suite.mjs只是待许可的执行材料。它限制一个合成容器，先source parity再业务，等待Mac浏览器通过SSH转发验证，然后恢复/S/M负载；未配置公开端口。独立SSH型号/内核及Docker证据必须与容器结果对应，脚本标签本身不能证明真机。

## 一致性备份

在线SQLite使用VACUUM INTO而非直接复制可能尚有WAL的主库；实验另按主键keyset导出业务表。生产备份应短暂禁止发布/写入或固定checkpoint，记录schema/content版本、checkpoint revision、每表count/SHA、对象清单hash及元数据。对象内容寻址且只读，先校验全部对象再宣布备份完整；备份目录原子rename为完成版本。逻辑档案排除auth session，恢复后重新登录。现有export/import帮助器是离线实验工具：无在线一致性锁，40行分批导入不具备跨全库总事务；失败的新库应丢弃重建，不能在生产库原地半恢复。

生产建议每日checkpoint、关键发布后附加备份、每月空机恢复演练、三份副本/至少一份异地；这些是提案，当前没有启用cron或上传。RPO设计目标24小时（发布后可更短），RTO设计目标4–24小时取决于容量/设备/家庭网络；均未测成SLA。若需分钟级RPO，需更频繁checkpoint或验证日志复制，不能宣称SQLite WAL文件拷贝自动提供。

恢复操作：停止新环境应用→检查备份清单/全部对象SHA→创建空DB→导入schema与依赖表或VACUUM备份→校验revision/receipt/event与两科奖励来源→应用新会话配置→验课程/媒体→受控开放旧用户。新环境测试通过前保留旧库只读和上一个可恢复备份，不覆盖真实数据。

## 故障预案与维护

| 故障 | 已有实验 | 生产处置提案 |
| --- | --- | --- |
| API进程退出 | SIGKILL/health恢复后hash一致 | supervisor/restart策略、健康readiness区分；避免重试放大奖励 |
| DB不可用 | adapter故障HTTP503、无业务写入 | 保留离线command；修复本地卷/连接后显式同步；绝不写临时内存替代库 |
| SQL约束/锁 | 全事务回滚与CAS409 | bounded retry仅限可识别busy；同ID同body重试；监控wait/延迟 |
| 媒体缺失/损坏 | 本地缺对象拒绝、备份hash检测 | 新provider校验后切换；保留只读旧副本，私有no-store |
| 断网/两设备冲突 | 浏览器draft保留、明确操作再发新ID | 不自动覆盖server，保留原冲突证据与可理解反馈 |
| NAS停电/硬盘损坏 | NOT_RUN，无真实电源/盘操作 | UPS有序关机、RAID不是备份、替换主机、异地恢复演练 |

每月检查补丁/备份/磁盘/证书，季度测试恢复，记录镜像版本和hash、Node LTS升级、权限及资源限额；日志结构化脱敏并设置保留/轮换。原型不需要多个常驻job，备份和内容发布可由受控单次任务完成。Node24不能冻结十年：[官方发布计划](https://github.com/nodejs/Release/blob/main/schedule.json)当前列其支持结束为2028-04-30，十年运维须持续升级运行时和系统。

优先保持“现代Linux计算＋NAS对象/备份”这一独立候选：计算端更新不依赖DSM老内核，NAS仅存归档和离线副本；代价是多一台设备、电源/网络、两端补丁与备份验证。它没有在本PR实际部署。
