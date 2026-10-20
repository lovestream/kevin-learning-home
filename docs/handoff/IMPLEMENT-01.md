# IMPLEMENT-01 交接（STOP，等待ChatGPT复审）

整理日2026-10-21。任务源 `chatgpt/klh-implement-01-foundation@0a803e3418190aa1e875c91b2620c845275d9f14`；任务文件原样保留，blob `6dae2898853fd11af1f6db21ab0ba5bd3376743c`。

独立分支 `codex/implement-01-foundation`，草稿 [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5)，base/main `46687ba370ca7e47764e500641bc371e2c0d4727`。实际完整本地与CI执行HEAD `57fa26e7c163499a2cdf97bda789c9ea264e185d`，21个Node tests（0失败/跳过）+3个Chromium viewport；后续文档归档HEAD以[PR最新checks](https://github.com/lovestream/kevin-learning-home/pull/5/checks)为准，不伪造旧测试SHA。

[完整报告](../implementation/IMPLEMENT-01-execution-report.md)、[采用矩阵](../implementation/IMPLEMENT-01-adoption-matrix.md)、[架构](../implementation/IMPLEMENT-01-architecture.md)、[部署](../implementation/IMPLEMENT-01-deployment-runbook.md)、[备份恢复](../implementation/IMPLEMENT-01-backup-restore.md)。[CI成功39517183962](https://github.com/lovestream/kevin-learning-home/actions/runs/39517183962)、[CI证据索引](../implementation/evidence/ci-index.json)、[本地结果](../implementation/evidence/local-verification.json)、[容器/新host恢复](../implementation/evidence/ci-container.json)。Actions artifact有JUnit、浏览器截图和原始构建日志，Git只归档脱敏JSON/配置。

正式app只有工程空壳、禁用数学英语入口、SQLite迁移/最小合成命令与安全媒体/一致备份接口；没有完整课程、真实记录、账户、钱包、宠物、云provider或生产部署。生产敏感API全关闭。三份历史provenance只作将来来源，不宣称旧学科已整合。

旧math/word前后HEAD与跟踪文件一致，独立网站/部署/账户/origin/数据继续原样；本repo不读取旧库或同步写回。原PR #1–#4保持open/draft且未合并/关闭；#3/#4仍基于#2，本PR直接基于main。没有覆盖历史 `docs/handoff/current.md` 或Phase0 ADR。

NAS最初只读daemon权限不足；用户本轮**单独批准旧实验清理**，由用户终端输入Docker专用sudo完成ID/marker核对，容器exit0/no OOM、容器及专用tag不存在，最后仅删owned合成目录。回执见[历史清理](../implementation/evidence/nas-cleanup.json)。授权不延伸到新应用NAS部署，未改Docker权限/现有服务/DSM/Tailscale。

仍NOT_RUN：本底座NAS容器/真实NAS迁移、生产身份与HTTPS、真数据、物理Safari、断电/坏盘、大规模/十TB恢复、ARM/Android、七牛/R2/S3。DS918+旧内核不在Node24官方glibc支持基线；writer异常退出后锁需人工确认处理，媒体大文件交付/Range与分片备份清单尚待后续阶段。

未来需要用户批准的动作：新NAS/主机资源/目录/非root UID/GID/端口/运行与清理范围、权限操作、真实数据、对外入口或远端云资源。当前没有任何新部署许可请求需要补答；本阶段已完成的实验清理不再重复求许可。

交给ChatGPT审查文件采用是否合理、关闭写接口与身份关卡是否完整、备份冻结/锁残留策略是否接受。**不合并PR、不自动开始认证实现、学科复制或下一阶段。**
