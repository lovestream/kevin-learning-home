# IMPLEMENT-01 R1 整改与复审交接

2026-10-21，Asia/Shanghai。仅修改原草稿 [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5) 的 `codex/implement-01-foundation`。不合并，完成后停止等待ChatGPT复审；IMPLEMENT-02A/02B未开始。

## 输入与版本边界

按顺序阅读整改任务和第二阶段规划，均原样归档于 `docs/tasks/`。来源 `chatgpt/klh-implement-01-review-phase2@4521fe5c5753a7c97799cde84910fdf7629786a1`；R1 blob `743c3cdf18d5adced8a4f19af50e96a8ad35da93`，第二阶段blob `99bc416a011bc53e43bf346fd328a5faf8c6ce5a`。后者只用于理解停止线。

复审基线为 `038074ba33e736833ac5243521d642c5b8d64620`；原基线[CI 39517636432](https://github.com/lovestream/kevin-learning-home/actions/runs/39517636432)及21项测试记录原样保留。R1实现提交 `670f9591bffc26abf53a1692086615275446701e`；容器恢复测试修正提交 `5901548de931beb548ebb0f286bf1286e91954ac`，端口等待修正提交 `68c3e26e42bde1684ddb59fcd6064b16e6ffeedc`。最终报告归档会产生新HEAD，精确最终SHA/CI见[PR最新checks](https://github.com/lovestream/kevin-learning-home/pull/5/checks)和PR说明；不把归档前执行结果标成最终文档提交自身的结果。

`001-foundation.sql` 相对基线逐字节相同，Git blob仍为 `b23f666a35a752ed78f6a181de449c24cc1d7cd6`。数据库仍是schema 1、11表；**writer协议v2不是数据库schema v2**。没有改001、增量身份迁移、actors、认证、课程、钱包或生产写接口。未来schema v2须由02A另行设计增量迁移，不能删库重建。

## R1-01：由内核持有writer所有权

| 方案 | 判断 |
| --- | --- |
| 原O_EXCL创建标记、close时unlink | SIGKILL无法清理，残留文件阻止后继启动，已替换 |
| PID消失/超时后删除标记 | PID复用、容器命名空间与并发检查存在歧义，不采用 |
| 外部flock命令包装 | 依赖主机命令与进程包装生命周期，维护CLI和跨平台一致性较弱，不采用 |
| 同一稳定inode上的原生flock | 选择；Store与维护CLI共同持有排他、非阻塞内核锁，FD关闭/进程死亡后内核释放 |

实现位于 `packages/platform/writer-lock.ts`。锁文件内容只标识协议，不存PID作为权威。首次创建在私有临时inode上取得flock、写入并fsync完整标记，再通过hard link原子发布稳定名称；并发发布者不能覆盖赢家。已有标记通过NOFOLLOW打开、取得flock并核对FD/路径dev+inode。正式 `.writer.lock` **不删除、不重建**；每个事务与readiness继续核对持锁inode身份，close可重复调用。创建阶段崩溃可能留下未发布临时文件，但它不具备稳定名称所有权，不做自动目录扫除。

依赖采用固定 `fs-ext@2.1.1`（类型 `@types/fs-ext@2.0.3`），lockfile记录传递依赖与integrity；没有引入Cloudflare依赖。Mac Node24原生编译通过。Docker builder安装python3/make/g++后按npm锁编译，同一Node24 Debian base运行原生模块；最终镜像不复制编译工具。flock不可用时明确fail closed，不降级为PID猜测或无限重试。

flock是合作进程的建议锁，要求应用专属本地文件系统与受控目录；不防同UID恶意替换/手动unlink锁文件，不承诺网络盘、坏盘或恶意管理员下仍安全。初始化同时需要本地FS hard link/fsync支持。不改变既有本地FS/软链接拒绝规则。

### 旧v1标记的离线迁移与回退

旧v1没有flock，无法靠新flock识别其仍在运行，也不能靠PID自动判死。**旧v1迁移前停机证明是生产关卡**，不把显式确认参数当自动证明：

1. 获得该目标操作授权后，停止使用同一data目录的全部旧app/维护进程、容器和自动重启来源，核对它们确已停止、目录独占。不能仅看到某个PID消失就认定已停止；若无法证明，停止迁移。
2. 在不再有写入者的前提下，私下保全整个原目录及DB/WAL/SHM/旧标记、版本和运行配置；不要提交Git。原始文件保全是取证副本，不冒充已经通过深查的一致性checkpoint。
3. 用R1版本执行下列显式CLI；只接受已知原v1 `{pid,owner:"klh-foundation"}` 格式。未知、损坏、空标记或软链接均拒绝；保全后人工调查，不force rm。

```sh
# 示例仅对获准且已完全停机的专用root；本轮只在合成目录测试。
node scripts/maintenance.ts migrate-writer-lock --root /approved/isolated-root --confirm-all-v1-writers-stopped
node scripts/maintenance.ts backup --root /approved/isolated-root --out /approved/checkpoints/after-r1
```

4. CLI先flock核对稳定inode，保存 `.writer-v1-preserved-UUID.json`，然后在**原inode**改写并fsync v2标记，旧版O_EXCL仍被阻止。重复v2调用不修改文件；活跃v2 owner会阻止迁移。迁移中断造成未知格式时fail closed并保留副本，不能宣称此离线过渡也已自动灾难恢复。
5. R1 backup取得同一把锁并执行完整检查，检查点成功后才启动一个R1 writer。旧版程序不得再访问此目录。测试覆盖未确认CLI exit1、显式CLI exit0、同inode、已知格式、活跃v2互斥和未知格式拒绝。
6. 需要回退时先停止全部新写入者并保全新事件。使用迁移前通过验证的旧版本检查点和旧镜像恢复到**另一个全新隔离root**，按旧版本验证；不能将旧镜像直接指向v2常驻锁目录，更不能删除活跃v2锁强行回退。没有旧检查点时不保证一键回退；原始取证副本须先用匹配工具验证。没有自动降级数据库。

### Docker恢复语义与失败记录

HEALTHCHECK unhealthy只改变状态，Docker不会据此自动重启。readiness暂时busy也不应让服务自杀。进程致命异常在main退出，SIGKILL由内核终止；Docker的unless-stopped负责进程退出后的恢复。持久配置错误/旧v1标记必须由管理员停止错误重启并修正，不能无休止删锁掩盖问题；应用内部没有无限重试。

首次R1 [CI 39580286344](https://github.com/lovestream/kevin-learning-home/actions/runs/39580286344)及另一事件39580277316的Node30/浏览器3视口/Compose通过，容器断言 `autoRestartCount >= 1` 失败。原因是把人工 `docker kill` 错当作崩溃自动重启触发器，该daemon没有自动重启。没有删除断言以掩盖：现在分别验证容器内init的唯一Node子进程遭SIGKILL后实际RestartCount增长、健康恢复，以及显式docker kill exit137后同卷删建恢复。注入只在测试脚本、先验证进程cmdline，不向生产HTTP加入故障接口。

5901548对应 [CI 39580644147](https://github.com/lovestream/kevin-learning-home/actions/runs/39580644147) 完整通过；另一事件 [39580638508](https://github.com/lovestream/kevin-learning-home/actions/runs/39580638508) 在自动重启后查询动态端口时报暂未发布，原测试在检查HTTP前过早读取一次端口。68c3e26将端口解析移入原有20秒有界ready等待，每次尝试重新解析；不延长无限等待或放松健康/摘要断言。

CI等待容器运行超过10秒，沿用unless-stopped，health周期仅CI覆盖为1秒（生产仍20秒）。另实测合成媒体目录临时不可访问→unhealthy但Running=true且RestartCount=0→恢复权限后healthy。该chmod仅CI自建UUID目录，不涉及NAS或现有目录。

## R1-02：有界readiness与深查分离

`Store.isReady()` 成功路径最多6次固定SQL：设置busy_timeout=50、BEGIN IMMEDIATE、SELECT 1、PRAGMA user_version、ROLLBACK、恢复busy_timeout=3000。没有数据表SELECT或全库扫描；空写事务探测实际SQLite writer可用性。50ms是SQLite锁等待参数，不是HTTP总延迟SLA。同步调用期间不存在跨await并行事务。

探针还检查持锁/DB路径dev+inode、软链接、DB读写权限、父目录可写/可遍历，以及HTTP层媒体/内容目录可访问；连接关闭、DB不可访问/被替换、版本异常、外部SQLite写锁均返回503，liveness仍只判断进程可响应而不查询SQL。一次503不会自动丢弃原锁或重开库。

`verifyIntegrity()` 保留PRAGMA回读、quick_check和foreign_key_check；每次Store启动先校验migration checksum/完整schema shape，再深查。backup/restore各自保留深查和逐表摘要、manifest校验。没有暴露深查HTTP接口；`/health/integrity`明确404。

10万条虚构capacity事件与receipt只用于体量测试，不是10万次真实教学或评分。实际监控db.exec/prepare：小库和10万行时各30次ready均为180条SQL（6/次），deep-check调用0，10次live的SQL为0。专项调用verifyIntegrity仍观测到quick_check与FK。延迟原始值保存在JSON，不能据此声称多年生产性能SLA。

## 验证与证据

本地完整验证 `670f9591bffc26abf53a1692086615275446701e`：2026-10-21T09:52:11.876Z，Node24.15.0、Mac arm64，worktreeDirty=false；typecheck/build、**30项Node测试（原21+新增9；0失败/跳过）和Chromium三视口**通过。后续5901548/68c3e26仅修正Linux容器测试触发方式及等待时序，应用源码未变化。[本地总结果](evidence/r1/local-verification.json)、[所有权](evidence/r1/local-ownership.json)、[readiness SQL/观测时间](evidence/r1/local-readiness.json)、[恢复](evidence/r1/local-recovery.json)、[浏览器](evidence/r1/local-browser.json)。

[CI 39580937914](https://github.com/lovestream/kevin-learning-home/actions/runs/39580937914) 与 [39580930913](https://github.com/lovestream/kevin-learning-home/actions/runs/39580930913) 在 `68c3e26e42bde1684ddb59fcd6064b16e6ffeedc` 全部成功：Node30项、Chromium3视口、Compose1.28.5及完整非root容器强杀/重启/恢复通过。现代Linux环境Node24.15.0 / kernel7.0.0-1017-azure / Docker28.0.4；autoRestartCount=1，docker kill exit137，11表摘要保持；不是DS918+。见 [CI证据索引](evidence/r1/ci-index.json)、[逐例30项](evidence/r1/ci-test-cases.json)、[容器](evidence/r1/ci-container.json)、[readiness](evidence/r1/ci-readiness.json)、[Compose解析](evidence/r1/ci-compose-v1.yml)。官方npm audit当次0漏洞，见 [原始JSON](evidence/r1/npm-audit.json)，不承诺未来无漏洞。

| 场景 | Mac本地 | 现代Linux CI | 说明 |
| --- | --- | --- | --- |
| 原21项事务/幂等/权限/恢复回归+新增9项 | PASS | PASS | 无旧回归删除；JUnit逐例归档 |
| SIGTERM、新进程重开、原receipt重放 | PASS | PASS | exit0，11表摘要、WAL与稳定inode保持 |
| SIGKILL、新独立进程重开 | PASS | PASS | 实际signal=SIGKILL，11表与原receipt保持 |
| 两真实进程同时首次初始化+后续3个竞争者 | PASS | PASS | 恰1 owner，活跃拥有者不被驱逐 |
| 双容器共享data卷、备份互斥 | NOT_RUN | PASS | 竞争容器exit1，owner健康 |
| 独立backup CLI与app互斥、死后backup/restore | PASS | PASS | CLI分别exit1、0、0 |
| v1离线CLI与未知格式/软链接拒绝 | PASS | PASS | 同inode，显式确认，原文件保留 |
| SQLite外部busy/连接关闭/权限/版本异常 | PASS | PASS | ready503、live200、释放后ready200 |
| 10万合成事件下ready固定SQL，live零SQL | PASS | PASS | 不移除启动/维护深查 |
| 非root只读镜像内fs-ext运行、错误UID拒绝 | NOT_RUN | PASS | 原生ABI与runtime依赖实跑 |
| 应用SIGKILL→unless-stopped自动重启 | NOT_RUN | PASS | 实测RestartCount与恢复健康 |
| docker kill→exit137→同卷重建 | NOT_RUN | PASS | 不将人工停止误称自动恢复 |
| unhealthy本身不重启→恢复健康 | NOT_RUN | PASS | 实测Running/RestartCount |
| 空环境restore、11表摘要、同镜像健康 | PASS（CLI） | PASS | 合成小样本，非真实灾备 |
| Chromium3视口、Compose V1 config | PASS / NOT_RUN | PASS | Compose只解析，无NAS启动 |
| DS918+原生模块/新平台容器/实际断电/OOM | NOT_RUN | NOT_RUN | 不由现代Linux结果代填 |

## NAS、原站与剩余关卡

只读SSH得到DS918+内核4.4.180+、x86_64及Python fcntl API存在；没有执行flock系统调用试验、写测试文件、运行原生模块/容器或sudo。[只读清单](evidence/r1/nas-readonly-inventory.json)不能证明fs-ext/Node24在NAS已可用。NAS实际底座仍NOT_RUN，Node24的官方glibc内核支持基线风险仍在，部署生产是阻塞关卡。不能因此宣称DS918+已通过R1或申请不必要的权限变更。

[原站审计](evidence/r1/source-audit.json)只比较Git元数据：数学HEAD a7c05aaa、英语d0b42a88，跟踪文件干净；不读取真实学习数据/凭证，不修改旧项目，不把它声称为旧网站HTTPS或数据可用性验收。历史NAS实验清理已完成，本轮没有再次触碰其资源。

真实OOM、宿主断电、坏盘、NAS平台、长期数据量、TB媒体、生产加密/密钥保管、外部媒体写入冻结、认证/HTTPS、ARM/Android均未验收。SIGKILL证明进程死亡时所有权释放与合成已提交事实保留，不等于模拟存储设备断电。生产敏感接口仍403，test身份不进入镜像。未新增NAS服务、修改Docker权限/DSM/Tailscale、上传真实数据或创建云资源。

## 依据

- [Node v24.15.0平台支持](https://github.com/nodejs/node/blob/v24.15.0/BUILDING.md#platform-list)：GNU/Linux x64/glibc的Tier1要求kernel >=4.18、glibc >=2.28；旧内核可能运行但不等于官方支持或本轮NAS实测。
- [node-fs-ext API](https://github.com/baudehlo/node-fs-ext)：原生flockSync与非阻塞排他接口。
- [Linux flock(2)](https://www.man7.org/linux/man-pages/man2/flock.2.html)：锁与open file description及FD生命周期关联；采用稳定inode避免删除重建竞态。
- [Docker restart policy](https://docs.docker.com/engine/containers/start-containers-automatically/)：进程退出策略、启动时间条件和人工停止语义；unhealthy本身不会调用restart。

停止线：**PR #5保持Draft，等待ChatGPT重新审查；不自动合并、不进入IMPLEMENT-02A/02B，不部署NAS生产服务。**
