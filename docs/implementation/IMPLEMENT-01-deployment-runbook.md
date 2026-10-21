# IMPLEMENT-01 运行与部署设计（NAS部署未授权）

## Mac本地：新仓库专属合成目录

先Node24.15.0/npm11.12.1，工作目录为本PR checkout。所有示例只针对新仓库生成的合成环境，勿填旧网站的数据目录。

```sh
npm ci
npm run typecheck
npm run build
node scripts/maintenance.ts migrate --root .foundation-work
npm start
```

migrate为显式目录初始化，创建data/media/content；app默认只监听127.0.0.1:4177、只展示学科占位。`GET /health/live`为进程存活，`/health/ready`检查持锁/DB身份、可读写状态、50ms busy等待的空写事务及schema版本；成功路径最多6条固定SQL，不执行完整性扫描；不代表全部媒体已校验或身份认证完成。`GET /api/v1/config`返回全禁用。退出按Ctrl+C/SIGTERM，让writer锁正常释放。`node scripts/verify.ts`运行类型、构建、30项Node测试与3尺寸浏览器；先 `npx playwright install chromium`。

要单独演练合成seed，使用另一个全新root：

```sh
node scripts/maintenance.ts seed --synthetic --root .foundation-work/synthetic-only
```

seed要求空learner表，测试数据不写旧站、不启用生产写接口。app不会自动seed；生产镜像不包含synthetic.ts或test-server。`NODE_ENV=test npm start`应拒绝，不是开启测试后台的方式。

## 镜像与现代Linux CI

```sh
docker build --platform linux/amd64 -f infra/docker/Dockerfile -t klh-foundation:review .
```

base为 `node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde`，是registry v2按tag筛出的linux/amd64 manifest，**不是旧实验config image ID**。index digest `sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d`；查询日2026-10-20。构建产物的app digest须部署前由审查通过的CI/受控构建另行记录；本轮只临时CI镜像、不推registry。

Docker多阶段构建，builder安装python3/make/g++，以npm锁和官方registry编译 `fs-ext@2.1.1` 原生flock模块；编译工具不复制到runtime。runtime仅server/packages、静态dist和离线维护工具；无旧课程、DB、媒体、fixture、测试身份、云SDK。容器非root，readonly根，/tmp16MiB tmpfs；512MiB；单逻辑CPU cpuset；只发布宿主127.0.0.1端口；json-file日志5MiB×3，restart为unless-stopped，HEALTHCHECK间隔20秒。容器内部0.0.0.0仅在KLH_CONTAINER=1明确标识下允许；Linux root启动拒绝。

`npm run test:container`仅在现代Linux amd64 CI执行，使用UUID资源名、合成目录、随机回环端口；验证非root/只读/错误UID、双容器争抢、应用SIGKILL自动重启、docker kill后同卷重建与新host目录恢复，同镜像验证服务健康和持久收据。仅清理本次UUID容器/tag，无global prune。Mac当前未安装Docker，**不报告PASS_LOCAL Docker，也不报告PASS_NAS底座**。

## Compose V1 1.28.5

infra/docker/compose.yml采用version 2.4，不使用profiles、develop、V2-only的资源语法。CI下载官方1.28.5 binary，校验官方SHA256 `46406eb5d8443cc0163a483fcff001d557532a7fad5981e268903ad40b75534c`，只运行config解析，不启动服务；同一文件可供现代docker compose使用。

env.example只有占位路径，**不是已确认NAS参数**。UID必须非0；GID、路径、CPU列表、端口与镜像需preflight确认。首次真实部署前需人工创建权限正确的专用目录，app不chown宿主、不chmod777、不挂docker.sock。

```sh
# 以下仅为将来已获许可后的命令设计；本轮未在NAS执行。
# 私有env文件不要提交Git。
docker-compose --env-file /approved/private/foundation.env -f infra/docker/compose.yml config
# 审查解析结果、镜像、真实挂载后，另行授权up。
```

默认宿主回环4177，可配置KLH_PORT；HTTP Host必须为配置的回环origin，健康检查仍连容器内部4177并发送相应Host。反代/HTTPS、Tailscale Serve/Funnel/正式域名全部未配置，不能把目前配置直接给孩子作为生产入口。将来统一HTTPS origin要经过独立认证/parent grants/Origin/CSRF/secure cookie审查。

## NAS部署关卡（仍需新授权）

1. 只读确定型号/内核、daemon/Compose、目标本地FS（拒SMB/NFS）、目录不存在或明确独占、UID/GID、权限、可用CPU/内存与回环端口。
2. 提交容器名、镜像digest、data/media/content/backup准确目录、UID/GID、回环绑定、资源量、时长及清理范围，请用户批准。当前没有这些新资源的部署许可。
3. DS918+旧内核风险明确接受或选择受支持现代Linux；不得擅自升级DSM/Docker/Node大版本、修改权限或放开隔离。
4. 用户输入必要sudo认证；不在聊天/文件传密码。部署后再做本底座自己的NAS验收，CI不能代填。

10月14日旧实验在本轮单独获得**清理**授权后完成：marker/容器完整ID/镜像ID匹配、停止/exit0/no OOM、容器及专用标签不存在，最后仅删owned合成目录。见evidence/nas-cleanup.json。没有复用旧目录部署新app，未更改其他服务、Docker权限、DSM或Tailscale。

## R1 所有权与健康检查

新v2所有权不是数据库schema v2。稳定锁文件不得删除；SIGKILL由内核释放flock，后继进程启动仍执行迁移checksum/shape、quick_check和foreign_key_check。旧v1迁移必须按 [R1离线操作手册](IMPLEMENT-01-review-R1.md) 全部停机后显式执行。

Docker unhealthy只改变健康状态，不触发unless-stopped；不要把每次SQLite busy当作杀进程理由。应用致命异常退出或遭SIGKILL才进入Docker的进程退出恢复路径。人工stop/kill可能抑制自动重启，恢复由管理员明确start/recreate。CI等待启动超过10秒后杀实际Node子进程，使用1秒health周期加快验证；没有改生产20秒周期，没有加入无限重试或自杀HTTP端点。持续配置错误/旧标记须人工停容器并修正，不能反复解锁掩盖错误。

DS918+只读确认Python fcntl API存在不等于Node原生模块实测；Node24/glibc/内核4.4支持风险仍为上线阻塞。Mac原生模块和现代Linux CI验证不能替代NAS新容器验收。

## 后续NAS GATE授权与实测

本手册上文“未授权/NOT_RUN”是R1原时点状态。2026-10-21用户另行授权本次隔离真机验收，具体结果、当前风险及资源清理以 [NAS GATE报告](IMPLEMENT-01-NAS-GATE-report.md) 为准；没有授权生产常驻部署、权限变更或第二阶段。测试使用现成Docker-only非交互认证，不重新配置sudo。正式上线仍须另行审查与授权。
