# PR-1A：隔离 Node 24 / SQLite 探针

仅验证运行环境，所有 learner / event 固定为 `synthetic-*`。不读取旧仓库或学习数据，不启动 HTTP 服务，不监听或映射端口，不连接 tailnet。NAS 写操作必须另获用户明确授权；`--approved-nas-write` 只是执行端的防误触门，不能替代用户许可。

## 固定镜像与平台

`node:24.15.0-bookworm-slim`，`linux/amd64`，Dockerfile 固定 amd64 manifest digest：

```text
sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde
```

`image-lock.json` 同时记录多架构 index digest 和解析日期。2026-10-08 从 Docker 官方 Registry V2 的 tag manifest 选出 linux/amd64 descriptor，再核对该 manifest 的 `Docker-Content-Digest`；CI 构建由 Docker 校验内容摘要。index 与 amd64 digest 不应混用。派生 probe 镜像只增加本仓库脚本，其 image ID 随脚本变化，不能用 base digest 冒充派生 image ID。

Node 24.15.0 官方 [BUILDING.md 平台表](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list) 要求 glibc linux-x64 kernel ≥4.18 / glibc ≥2.28；NAS 4.4.180+ 不满足内核基线。容器共享宿主内核，Debian 容器不能升级宿主内核。musl x64 属 Experimental。探针成功仅证明此次组合通过合成实验。

## 只读预检

在仓库根目录，Python ≥3.8，无第三方依赖：

```sh
sh scripts/nas-preflight.sh --help
sh scripts/nas-preflight.sh --json --environment local
python3 scripts/run_sqlite_probe.py --environment nas
```

最后一条默认只打印计划，不访问 Docker、不创建目录。预检只执行 version/status/端口枚举/stat，不调用 sudo、不修改任何配置。`--filesystem-path` 只做读取，输出不含路径。NAS 可通过 SSH 将 `scripts/nas_preflight.py` 输入 `python3 - --json --environment nas --repository-sha <40位SHA>`，避免复制脚本到 NAS；连接地址、登录、socket、原始错误不进入仓库。NAS 默认 stat `/volume2`，实际试验父目录必须另查其文件系统。

预检每项独立 `PASS / FAIL / BLOCKED / NOT_RUN`；出口：0=清单无失败/阻塞，1=至少一项 FAIL，2=有 BLOCKED 且无 FAIL。内核支持基线 FAIL 可与 daemon 权限 BLOCKED 同时出现，不能用总体码替代各项判断。`PERMISSION_DENIED` 与 `DAEMON_UNAVAILABLE` 分开；可选工具缺失为 NOT_RUN。未知错误只给 `COMMAND_FAILED_REDACTED`。没有 Python 时包装脚本以系统命令缺失码 127 结束，该主机清单 BLOCKED，不安装软件。`--environment` 为操作者标签，不能自身证明真机位置。

## 合成测试及容器执行

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

容器操作唯一受支持入口为 `scripts/run_sqlite_probe.py`。不要直接用 Compose 指向已有数据目录。必须从已审查代码的干净 checkout 执行，`--repository-sha` 传入 `git rev-parse HEAD`，否则 SHA 只是操作者声明。CI 自动检出这个 SHA。

以下示例中的父目录是操作者指定的**已存在、可写、非共享学习数据目录**；先核实为本地 ext4/btrfs/xfs 等文件系统。Linux 网络文件系统及未知文件系统拒绝运行，不把在线 SQLite 放在 SMB/NFS。

```sh
# 现代 Linux / CI（会写入，仅用于合成实验）
python3 scripts/run_sqlite_probe.py --run --environment ci \
  --repository-sha <40位已检出SHA> --parent <已存在的绝对父目录>
# NAS：仅在用户另行明确许可、现有非root账号能访问daemon后执行
python3 scripts/run_sqlite_probe.py --run --environment nas --approved-nas-write \
  --repository-sha <40位已检出SHA> --parent <用户批准的绝对父目录>
```

运行器拒绝 root 宿主账号、远程 Docker endpoint/context，采用宿主账号 UID/GID（均须非 root），在父目录下**排他创建** `klh-pr1a-<12位随机hex>`，数据目录 0700 / 标记 0600。probe 拒绝符号链接、未知文件、group/world 可写数据目录、UID 不匹配、exercise 覆盖已有库；verify 先只读确认 synthetic owner 和精确合成状态。

先运行 Compose `config --quiet`，再 build。Compose schema 2.4，CI 使用校验过官方二进制摘要的 V1.28.5，不把 V2 可解析冒充 NAS V1 通过。两个不同命名的 `run --rm --no-deps` 容器分别 exercise / verify，保持相同专属 bind 目录；第一个容器删除后才创建第二个。没有命名 volume、network、常驻服务。容器只挂此一个 data 目录，rootfs 只读、network none、cap_drop ALL、no-new-privileges，256 MiB / 0.5 CPU / 64 PID / tmpfs 16 MiB；build 240 秒，每次 probe 120 秒，busy_timeout 3000 ms。探针执行版本、SQLite加载、WAL/FULL/FK/timeout 回读、事务/回滚、重复/冲突、重连、完整性、一致性备份及空目录恢复。

备份用 [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html#vacuum_with_an_into_clause)，它生成一致性快照；不直接复制活动 WAL 的主文件。恢复目标由探针新建，确认空目录后复制备份，随后只读验证全部合成事件及 `integrity_check=ok`。此实验不模拟断电、磁盘满或多写者压力，也不证明生产恢复目标。

## 证据、失败和清理

JSON 只包含版本、public SHA、状态、命令退出码、合成验证结果；raw compose/build 输出被捕获，不发布。专属目录的 `evidence.json` 和 stdout 相同，无 NAS IP/domain/path/用户账号名。CI artifacts 保留 14 天，应下载留档；所有 `executionEnvironment=ci` 的报告都不是 NAS 实证。

正常 `--rm` 删除两次试验容器，随后 inspect 仅接受明确的 No such object/container；权限失败不能当作容器已删除。超时/失败只按本次生成的精确容器名 + compose project/service labels 检查并 stop/rm，绝不执行 `down --remove-orphans` 或 prune。

保留本次合成目录、派生 probe 镜像及 base cache 供复审。运行器不递归删除目录、不删共享 base 镜像。手工清理前需用户确认：核对本次 JSON projectName、目录标记、内容仅为合成资产，再删除该**精确**目录；派生镜像仅在 ID/标签与本次项目对应且没有容器引用时移除；保留可能共享的基础镜像。不修改 daemon、DSM、Tailscale、旧容器或其配置。若没有启动容器，容器清理记为 NOT_RUN；不要声称实测清理通过。
