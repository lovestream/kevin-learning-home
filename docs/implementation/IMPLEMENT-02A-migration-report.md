# IMPLEMENT-02A SQLite v1→v2 与恢复报告

2026-10-22。只操作独立临时目录中的合成数据库；不读取或升级旧数学/英语记录，不部署 NAS。

## 版本与迁移顺序

基线为已合并 main `87ec45e95809d00b7104242702fb28ffbb6f7881`。`001-foundation.sql` 原字节和 Git blob `b23f666a35a752ed78f6a181de449c24cc1d7cd6` 保持不变。新增 `002-family-auth.sql`，启动验证有序版本、每条原 SQL 的 SHA-256 与精确 schema SQL 形状，拒绝未来 user_version、checksum 不符或结构漂移。新空库初始化为 v2；已有 v1 的普通服务启动以 `SCHEMA_UPGRADE_REQUIRES_CHECKPOINT` 拒绝，不静默升级。

升级通过离线 `maintenance upgrade`：取得一个不中断的 kernel flock → 验证 v1/媒体/content → VACUUM INTO 一致性 checkpoint、fsync/原子发布 → 在同一 lease 下增量迁移 → 深检查 → 关闭。失败保留升级前 checkpoint，不自动覆盖或删除源数据。重复升级返回 already-current，不再生成 checkpoint 或重复写迁移记录。

learners 的 CHECK 从 synthetic=1 放宽为 IN(0,1)，采用 SQLite 通用安全重建：事务外 FK OFF；BEGIN IMMEDIATE；创建 learners_v2、复制原行、删除旧表、把新表改为原名；增加身份表/索引/触发器；foreign_key_check、追加迁移记录2、user_version=2、验证结构；COMMIT；finally FK ON。不先改名旧父表、不 writable_schema、不删除旧事件或引用。依据 [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html) 的通用重建步骤。

旧 11 表含 10 张业务/审计表和 schema_migrations。前 10 表逐表 count+canonical SHA-256 完全一致；schema_migrations 完整 row1（含 applied_at）保留，只增加 row2，故整表 hash/count 的变化是明确的预期差异，不能声称 11 个整表 hash 全部不变。新增 actors、learner_grants、auth_controls、auth_sessions、auth_limits、auth_audit，共 17 表。合成事件、旧 receipt、revision、attempt、媒体/content manifest、引用均保留。

## 实际测试与证据

`tests/auth/migration.test.ts` 从 Git 读取冻结 main 的真实 Store/writer/001/contracts 源码，实例化旧版 runtime 创建存在于磁盘的合成 v1 数据库，再运行新版升级。没有用新代码伪装 v1。输入有 1 个 learner、subject/state、server attempt、receipt/event、media/content/ref 和 audit；证据见 [02a 目录](evidence/02a/README.md)，由 CI 归档完整前后逐表摘要。

| 场景 | 断言 |
| --- | --- |
| 真实 v1→v2 | 10 个旧数据表 count/hash 相同，旧迁移 row1 完整相同，仅新增 row2；001 字节相同 |
| 旧命令重放 | duplicate=true，receipt/events 保持原结果，不重复写事件或 revision |
| 重复迁移 | already-current，所有表摘要不变，不创建多余备份 |
| 中间抛错 | 执行完 v2 SQL、尚未 COMMIT 时抛错，回滚到原 v1，真实旧 Store 可读写并通过完整性检查 |
| 中间 SIGKILL | 子进程执行 v2 SQL 后写已 fsync marker，父进程 SIGKILL；冻结旧 Store 打开为 v1、旧摘要完全一致，新版重试成功 |
| 旧版本回退 | 旧 runtime 明确拒绝直接打开 v2；将升级前 v1 checkpoint 恢复到全新空目录，真实旧 Store 可打开，11 表原摘要相同 |
| v2 身份备份恢复 | 保存 actors/凭据版本、有效与已撤销 grant、学习事件/receipt/media/hash；旧父/子 session 全失效，elevation=0，重新登录锁定，只保留有效授权 |

旧平台测试另保留未知版本、损坏 schema/checksum、备份途中失败、坏媒体/hash、恢复越界路径、并发写入排他等反例。未将“可迁移”描述为已经执行真实数据迁入。

## v2 checkpoint 的安全差异

manifest.schemaVersion 为源库实际版本 1 或 2，tables 根据版本列出 11 或 17 表，包含身份敏感表。恢复先校验全部文件/hash/表摘要及媒体引用，只有验证成功才允许在隔离 staging 中改变会话状态；最后 fsync 并原子发布到此前不存在的目标目录。拒绝原地恢复到现有服务卷。

v2 有 session 行时，事务内撤销全部行、清零 parent_unlock_until、epoch+1、追加 restore_invalidate。actors/credential_version、grants、所有旧表完全不变；auth_sessions/auth_controls/auth_audit 是有意的安全差异。没有 session 行时保持原摘要（无凭据可重放）。函数返回的是经验证的**源 manifest**，它不是撤销后目标数据库的新摘要；对恢复目标的新备份会生成新的 manifest/hash。

checkpoint 含口令慢哈希和关系数据，不可公开上传。当前只上传合成数据的整表摘要与 PASS 断言，不上传数据库、hash 单行、密码、cookie 或私钥。加密与密钥独立备份仍是上线前设计待决项，见[威胁模型](IMPLEMENT-02A-auth-threat-model.md)。

## 回退边界

v1 镜像不能写 v2 DB。真正回退必须停写，保留完整 v2 checkpoint 与升级后新增事件，再将升级前 v1 checkpoint 恢复到新空环境，用固定旧镜像启动。自动降级、把迁移 row2 删除后交给旧镜像、直接替换源卷均不支持。升级后新事件如何再导回旧系统需要单独迁移任务，本轮没有编造无损自动降级承诺。
