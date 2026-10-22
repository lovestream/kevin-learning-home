# KLH-IMPLEMENT-01 · R1 独立复审验收结论

> 复审：ChatGPT，2026-10-21。  
> 实现对象：[PR #5](https://github.com/lovestream/kevin-learning-home/pull/5)，`codex/implement-01-foundation@8b80dce3be7d836f6abe6fdb569f6553ecd2a6cc`；base `main@46687ba370ca7e47764e500641bc371e2c0d4727`。  
> **结论：IMPLEMENT-01 第一阶段与 R1 整改的代码、测试及现代Linux CI验收通过。允许用户批准后将 PR #5 从 Draft 改为 Ready、核对CI并合并至 main。不得自动合并、不得自动实施第二阶段。**  
> 这里的“验收通过”不等于NAS部署验收或真数据/正式账号认证已可用。

## 复审核验

1. **R1-01（异常退出writer锁恢复）PASS_CI/PASS_LOCAL**：检查 `packages/platform/writer-lock.ts`，稳定inode+内核 `fs-ext@2.1.1 flock` 非阻塞排他，取得锁后核验fd/path dev+ino，已发布锁不自动unlink。检查 `store.ts` 的持锁事务与关闭逻辑。读 `tests/foundation/writer-lock.test.ts`、`tests/foundation/container-smoke.ts`、`docs/implementation/evidence/r1/ci-ownership.json`：SIGTERM/SIGKILL、两真实进程竞写、活跃锁不可驱逐、CLI备份互斥、离线v1标记迁移、Docker PID1子进程SIGKILL后`unless-stopped`自动重启及人工`docker kill`重建路径通过；表哈希与原收据保留。没有用“PID不存在就删锁”的不安全方案。原生扩展编译工具仅在Docker builder。
2. **R1-02（轻量readiness）PASS_CI/PASS_LOCAL**：`apps/server/http.ts` 的 `/health/ready` 已调用 `Store.isReady()` 而非深度校验，`/health/live`零SQL。代码中以有限`BEGIN IMMEDIATE`检查数据库writer可用性并检查`user_version`，恢复busy_timeout；`verifyIntegrity()`仍在启动/离线备份与恢复时使用。`tests/foundation/readiness.test.ts`在100000合成事件下30次readiness为180固定SQL，未触发`quick_check/foreign_key_check`；故障下返回503。
3. **最新 CI 与 SHA**：GitHub Actions [39581355981](https://github.com/lovestream/kevin-learning-home/actions/runs/39581355981)和[39581348935](https://github.com/lovestream/kevin-learning-home/actions/runs/39581348935)对应最终 HEAD `8b80dce3`，均 SUCCESS；Node30项、Chromium3视口、Compose1.28.5语法校验、现代Linux Docker非root/readonly/同卷重启/旧数据恢复测试通过。
4. `001-foundation.sql` 保持schema v1，不借R1修改历史迁移校验值；正式生产学习/家长写接口继续403，不创建真实账号、不启用钱包。
5. 第一阶段独立数学与英语站的Git元数据审计记录未改源仓库。**并不构成其当前网页可用性、真实记录备份验证**；原两仓库及学习源仍不受本次PR切换。

## 明确尚未验收

- DS918+ NAS 上本**新底座**、`fs-ext` 原生编译/ABI、真实本机`flock`系统调用、硬链接/fsync/local ext4、Docker实际重启：**NOT_RUN**。旧原型PASS_NAS不能代替本底座或R1的PASS_NAS。Linux4.4仍低于Node24 glibc x64官方支持基线4.18。
- 真实物理iPad/Safari、HTTPS/Tailscale Serve、生产会话/家长认证/CSRF、私有数据迁移、真实学习奖励、实际UPS/断电/磁盘损坏、多年数据和大视频恢复：未验收。
- v1锁升级必须事前证实所有旧writer停止并有独立快照；不能在真实NAS上凭某PID缺失自动迁移。Linux内核flock是合作进程之间的建议锁，不防拥有同等权限的恶意替换。
- Docker的`unhealthy`不会自行触发重启；进程死亡才由`unless-stopped`政策接手。监测/运行手册必须区分这两者。

## 下一步批准关卡

**步骤1：请用户确认“批准合并PR #5”。** 由Codex将Draft转Ready，复核最终HEAD与最新CI，执行正常GitHub合并到main，并提供合并commit SHA；不把PR #1～#4顺带合并。合并前如远端发生变化必须重新验收。

**步骤2：只有 main 包含 PR #5 且用户明确要求开始第二阶段，才执行既有任务书 [KLH-IMPLEMENT-02-AUTH-SHELL.md](../tasks/KLH-IMPLEMENT-02-AUTH-SHELL.md) 的 PR-02A：正式身份与权限、schema1→2保真增量迁移、安全会话及父母授权。先提交独立Draft PR，仍只合成账户/数据，暂不搬课程。

**步骤3：PR-02A验收合并后才开始PR-02B，统一学习家园登录与空壳导航。数学与英语原网站继续独立运行。**

**新NAS容器、目录、权限操作、真实学习数据和公网入口需单独明确授权**。本验收不授权以上操作。
