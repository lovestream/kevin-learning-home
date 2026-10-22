# IMPLEMENT-02A 身份与授权威胁模型

日期：2026-10-22。范围是单家庭模块化单体的后端与随机合成账户，不包含登录 UI、真实身份、NAS 部署或学科学习接口。激活授权见[任务书](../tasks/KLH-IMPLEMENT-02A-ACTIVATION.md)；阶段 02B 尚未实施。ADR 0001 继续保持 Proposed。

## 身份、信任与数据

`actors` 是登录身份，`learners` 是学习档案，两者不同。learner actor 唯一绑定一个 learner；parent actor 不绑定 learner，通过 `learner_grants` 得到范围。单家庭最多 128 个 actor、每个家长最多 32 个有效 grant，超限明确失败。本轮 CLI 和服务端创建逻辑只生成 `synthetic=1`。数据库允许将来获批后的真实身份，不意味着本次获批创建真实账户。

网络、浏览器、请求体、URL、X-Role、X-Tailscale-User、X-Forwarded-For 均不能授予角色。每次请求从 cookie 找 SQLite session，再核对 actor、凭据版本和全局 epoch；learner scope 查库，撤销 grant 立即生效。parent 登录默认锁定，读取 learner 元数据也需短时解锁；学习者只能读自己的元数据。此阶段即使 parent 解锁，也不开放批阅、导入、HTTP 备份恢复、媒体发布、学科命令或钱包。

受信任的边界是运行进程与其独占本地文件系统所有者；拥有该目录或宿主管理员权限的人可以读写数据库，应用身份认证无法抵御这一权限。数据目录必须无 group/other 权限，否则以 `DATA_DIRECTORY_PRIVATE_REQUIRED` 拒绝启动，不自动 chmod/chown。继续禁止网络/FUSE 数据卷与符号链接，保留 kernel flock 单 writer、WAL/FULL/FK。

## 凭据与离线恢复

`scripts/auth-admin.ts` 仅接受本地交互 TTY、明确 `--root` 和 `--synthetic`。所有输入先关闭回显再提示，不接收密码参数、管道或环境变量，不提供 HTTP 注册/首访管理员。bootstrap 仅在 actor 数为零时成功；创建 learner/授权变更需要离线验证 parent。凭据重置与全局撤销要求有文件系统控制权的操作者再次输入确认短语。CLI 不输出输入值、salt、hash 或 session，取消/异常/信号会关闭数据库并恢复终端。

新口令至少 15 个 Unicode 码点、最多 128 个 UTF-16 单元且 512 UTF-8 字节，拒绝控制字符、全空白与不完整 Unicode。使用 Node crypto 异步 scrypt，方案版本 `scrypt-v1-N32768-r8-p3`，参数 N=32768、r=8、p=3、maxmem=64 MiB，随机 16 字节 salt、64 字节派生结果；恒时比较，派生 Buffer 用后清零。数据库保存参数版本、salt 与慢哈希。最多同时 2 个 KDF，其余返回 429/AUTH_BUSY，避免无限工作队列。

已知/未知账号的错误口令均执行同参数 KDF 并返回 401/AUTH_INVALID；损坏/不支持的凭据格式也执行 dummy KDF 后返回相同公开错误。HTTP 只返回稳定错误码，不回显 SQL、Zod 输入或堆栈。合法凭据登录后重新读取版本，避免异步 KDF 期间的重置竞态。

## 会话、CSRF 与二次认证

每个 cookie 含两个独立随机 32 字节的 base64url 分量：session bearer 与同步 CSRF secret。SQLite 只存两者的 SHA-256 摘要，不存原值。高熵随机 bearer 使用无密钥 SHA-256，不适用于人类口令。服务端通过已验证 HttpOnly cookie 的第二分量返回当前 CSRF token，写请求再与该 session 的持久化摘要比较；这是与服务器状态绑定的同步 token，不是仅比较两个客户端值的双重提交。

生产使用 `__Host-klh-session; Path=/; Secure; HttpOnly; SameSite=Strict`，无 Domain。服务端 origin 固定为精确 HTTPS origin，不从请求 Host/转发头推断；Host 必须匹配，所有 POST（含登录）必须匹配 Origin，拒绝 cross-site Fetch Metadata。拒绝 auth query、重复 cookie、额外 JSON 字段与大于 4096 字节请求。不发送 CORS 授权。响应 no-store，CSP 禁止第三方脚本及 iframe 嵌入。

会话绝对 8 小时、闲置 30 分钟，活动时间最多每分钟更新一次；保留绝对到期上限。parent-unlock 需要再次验证 parent 口令，最长 5 分钟且不超过原 session 到期；孩子不能调用。解锁、主动锁定和 rotate 均产生全新 bearer/CSRF，旧 cookie 立即失效；普通 rotate 清除提升权限。退出、跨设备退出、凭据版本递增、全局 epoch 轮换、恢复 checkpoint 均撤销对应会话和提升权限。正常进程/容器重启保留仍有效的短时解锁，时间上限不延长；恢复备份则全部失效。

session 与限频状态全部在 SQLite，内存只有 KDF 工作数，不是身份权威。过期/已撤销 session 每次最多清理 128 行，总数上限 4096；达到上限拒绝创建。auth_limits 最多 4096 桶，每次清理最多 128 个过期桶。按实际 socket 来源限制 60 次/5 分钟，按归一化登录名或 unlock actor 限制 5 次/15 分钟（成功验证也计入），重启不绕过；拒绝后 Retry-After 为保守 900 秒，KDF 忙为 1 秒。未来反代下来源可能相同，这会保守共享来源限频，不能为便利直接信任 X-Forwarded-For。应用审计追加有限枚举事件、actor id 和时间，不记录登录名、口令、hash、cookie、csrf 或请求正文；审计长期增长需未来制定离线归档策略，不能直接删不可变事件。

## 本地开发、备份与密钥设计

auth 默认关闭；显式设置 `KLH_AUTH_ORIGIN` 才启用。生产拒绝 HTTP。唯一 HTTP 开发例外是 NODE_ENV=development/test、literal loopback origin 和独立 `klh-dev-session` cookie；正式入口同时要求绑定 127.0.0.1 且不在容器模式，生产 Compose 固定 NODE_ENV=production。测试使用可信临时证书的真实 TLS 连接验证 Secure cookie，没有全局关闭 TLS 校验。Linux Docker 测试的内部回环 HTTP 只模拟 TLS 终止后的链路，不代表已部署 HTTPS。

此方案没有 session 签名主密钥或默认生产秘密；salt 随凭据保存。全局撤销使用数据库 epoch，凭据重置递增 credential_version。丢失所有离线文件系统访问权不在应用可恢复范围内。未来 TLS 私钥、备份加密密钥必须独立于 checkpoint 托管，采用两个离线可恢复副本和恢复演练；这里仅设计，不创建真实密钥/账号，不声称提供了加密备份实现。

checkpoint 包含慢哈希、授权关系和审计，应视为敏感数据，即使不含 bearer 原值。当前实现的备份不加密：专用私有目录、受控离线副本，未来上线前选定加密工具和密钥保管政策。恢复前完整验证文件/表哈希，恢复到新目录后撤销全部旧 session、清除 elevation、递增 epoch 并追加恢复审计。离线管理员从历史备份可重新引入旧口令/grant，因此恢复是受信任维护行为，恢复后应按事故情况再次重置凭据/撤销 grant。

## 负例与剩余风险

真实 HTTP 测试覆盖错密码、未知/损坏凭据、持久限频、缺失/外源 Origin、错 Host、跨 session CSRF、旧 cookie 重放、固定 cookie、重复 cookie、伪造角色/代理头、跨 learner、孩子提升、grant 撤销、短时权限到期、闲置/绝对到期、重置/全局撤销、首访注册。实际 PTY 验证不回显和中断；实际子进程 SIGKILL 验证持久会话/注销；生产镜像单独验证启用 auth 的重启和恢复。

尚未验证：实体 iPad/Mac 登录 UI、NAS 02A 实测、正式 TLS 入口、真实账号、备份加密与灾备主机。XSS/宿主被攻破仍可代用户发请求，HttpOnly 不能解决恶意同源脚本；短时二次认证也无法防止已控制 parent 设备。当前不加入外部身份服务、邮件恢复、2FA 或微服务；后续需要独立任务与审查。DS918+ Linux 4.4 不满足 Node24 官方支持内核基线的既有风险保留。

依据：[Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)、[Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。测试锁定 Node24.15.0，动态文档不是升级许可。
