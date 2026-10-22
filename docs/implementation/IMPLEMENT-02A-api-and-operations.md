# IMPLEMENT-02A 后端契约与运行设计

2026-10-22。接口沿用 [Phase0 路径](../phase-0/04-unified-contracts.md)，在 `packages/contracts/auth.ts` 固定严格 DTO。SQLite schemaVersion=2，HTTP envelope/DTO schemaVersion=1，含义不同。无登录 UI、02B 导航或真实账号。

## 接口

所有请求必须匹配固定 Host；所有 POST 必须 JSON、精确 Origin，除登录外还要求会话和 X-CSRF-Token。auth 不接受 query，body 上限4096字节。未实现的 API 明确 403/FEATURE_DISABLED。

| 方法/路径 | JSON 请求 | 成功结果/要求 |
| --- | --- | --- |
| POST /api/v1/auth/login | login、password | 随机 cookie 和 SessionDTO，统一错误/持久限频；忽略传入固定会话 |
| GET /api/v1/auth/session | 无 | SessionDTO；过期/撤销401 |
| POST /api/v1/auth/logout | 空对象，或 allDevices 布尔 | 当前或该 actor 全设备撤销，清 cookie，authenticated=false |
| POST /api/v1/auth/rotate | 空对象 | 新 cookie/CSRF，旧 cookie 撤销；parent elevation 清除，不延长绝对期限 |
| POST /api/v1/auth/parent-unlock | password | parent 再验证，轮换会话，最长5分钟解锁 |
| POST /api/v1/auth/parent-lock | 空对象 | parent 轮换并清除 elevation |
| GET /api/v1/learners | 无 | schemaVersion=1、learners 数组（id/label），只读 scope 内；parent 必须已解锁 |
| GET /api/v1/learners/:id | 无 | 相同包装；跨 scope403 |

SessionDTO 字段：schemaVersion=1、actor（id/role）、learnerIds、parentUnlocked、parentUnlockExpiresAt（毫秒或null）、expiresAt（绝对毫秒）、csrfToken。没有 login、password_hash、salt、数据库 session 摘要或学习记录。CSRF token 是敏感的当前会话同步值，客户端仅持于内存，不放 URL/日志。新 session 的 Set-Cookie 只有 HttpOnly bearer 对；parent-unlock/lock/rotate 后客户端必须替换 CSRF token。

登录名规范为 trim+lowercase 的 3～64 个 ASCII 字符（字母/数字开头，允许 ._-）；非法格式422，不声称它是合法身份不存在的401。合法格式下错凭据统一401/AUTH_INVALID，限频429/AUTH_RATE_LIMITED、KDF并发满429/AUTH_BUSY，均含 Retry-After；生产详细异常只暴露固定错误码。家长 grant 元数据在 SessionDTO 可见，learner 标签读取仍需解锁。未实现的学科/parent业务/媒体/钱包请求即使解锁也403。

## 本地合成使用

Node24.15.0、npm11.12.1、现有依赖锁不变。以下操作只针对本仓库新建的合成目录；命令不携带口令，也不含有效默认账号：

```sh
npm ci
npm run build
node scripts/maintenance.ts migrate --root .foundation-work
node scripts/auth-admin.ts bootstrap-parent --root .foundation-work --synthetic
node scripts/auth-admin.ts create-learner --root .foundation-work --synthetic
```

CLI 会独占 writer，必须停应用后执行；隐藏交互输入由操作者提供。其他受控命令是 grant-learner、revoke-grant、reset-credential、rotate-authority。没有后台默认用户名/口令、环境变量密码或首次浏览器注册渠道。已存在 v1 时 migrate/服务不会替你静默升级：

```sh
node scripts/maintenance.ts upgrade --root .foundation-work --checkpoint /absolute/private/new-pre-v2-checkpoint
```

checkpoint 目标须不存在且位于私有本地目录，命令持有同一个 flock 完成验证、备份与迁移。`backup --root ... --out ...` 与 `restore --from ... --to ...` 的实际参数见 `scripts/maintenance.ts`；恢复只允许新目标。不要将示意路径复制成真实部署操作，本阶段未操作任何 NAS 卷。

auth 默认关闭。仅合成本机调试可显式设置 NODE_ENV=development、KLH_HOST=127.0.0.1、KLH_AUTH_MODE=loopback-development、KLH_AUTH_ORIGIN=http://127.0.0.1:4177 后 npm start；cookie 名为 klh-dev-session，不能用于容器或生产。测试 runner 的 NODE_ENV=test 身份注入仍被正式 main 拒绝，不能与 auth service 合用。

生产设计使用明确批准的 HTTPS origin 和默认 production auth mode，由未来获批的 TLS 终止层保留 Host、Origin/Cookie。容器端口继续只映射宿主127.0.0.1，不能直接公开无 TLS 的上游；不信任转发身份头。当前没有配置反代/Tailscale/DNS/证书，没有实际对外身份服务。Compose 固定 NODE_ENV=production，保留 non-root、readonly rootfs、专用卷、cap-drop/资源限制和 V1.28.5 解析能力。不要把单元测试临时证书当生产证书。

## 采用与额外底座变更

没有合并历史实验分支或更换 native addon/镜像/依赖。选择性复用 main 的 Store、flock、checkpoint、contracts 和 CI；新模块位于 packages/auth，不建微服务。相对于已验收底座新增的公共变更及验证：

| 变更 | 必要原因与单独验证 |
| --- | --- |
| 迁移编排抽出 migrations.ts | v1校验/显式checkpoint升级与v2新库并存；冻结旧 runtime + 中断/回滚用例 |
| Store 数据目录权限检查 | 新库含认证慢哈希，拒绝group/other权限，不自动修改权限；独立负例 |
| ready 的 SELECT1 增加主键 epoch 子查询 | 缺失运行时认证权威时503；保持6条有界SQL，100k事件回归不扫描 |
| checkpoint接受实际v1/v2及恢复撤销 | 保真身份备份、旧镜像回退；17表/会话撤销专项测试 |
| 正式HTTP认证配置与429退避 | 明确启用/固定HTTPS、可信cookie；真实TLS和正式main拒降级负例 |
| Docker增加离线admin脚本 | 生产镜像无测试身份注入；Linux镜像检查admin存在、auth测试目录不存在 |
| CI扩展到02A、历史NAS镜像工作流禁用 | 新测试确实执行；不重新生成PR5一次性NAS部署材料，旧工作流仅历史留档 |

旧30项保留全部核心断言：readiness“未知版本”从2改为99，恢复值改为当前2；锁符号链接负例目录显式700，使测试仍到达原锁拒绝断言，而不提前被新增目录隐私检查拦截。没有放宽锁、并发、receipt、CAS、不可变事件或健康检查断言。

当前 DS918+ Node24/Linux4.4 的官方支持风险不变，本轮 NOT_RUN_NAS；现代Linux Docker合成测试不替代NAS验收。正式上线前仍需用户批准部署、真实账户/数据处理、TLS入口与恢复密钥政策。
