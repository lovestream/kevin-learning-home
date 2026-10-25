# MATH-NAS-01 R1：Mac 可用性交付整改

2026-10-25，执行 [PR #14 R1 意见](https://github.com/lovestream/kevin-learning-home/pull/14#issuecomment-6385527963)，对应 [Issue #13 用户卡点](https://github.com/lovestream/kevin-learning-home/issues/13#issuecomment-6385533801)。在原 `codex/math-01-nas-trial` 分支整改，保持 Draft、不合并。原 HEAD `6d0e1909ae861af531e7a3c7207cf3f5faabf4de` 两套成功 CI 是历史基线，不能替代本轮最终 HEAD 的 CI。

## 用户卡点与实际入口

原技术测试访问新 38444，但用户仍访问旧 38443；账号指南仅在执行工作树隐藏目录，公开交接没有证明它就在用户 Mac；自动化浏览器成功也没有交付可见入口。本轮先确认同机/路径，再交付固定文件夹和启动器。

| 项目 | 本轮实际核实 |
| --- | --- |
| 执行机器 | 用户 Mac，darwin arm64、macOS 27.0.1；UID 与 `/dev/console` 一致，launchctl 为 Aqua 图形会话。主机名只公开 SHA-256，原名保留本机指南 |
| pwd / Git root | 均为 `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial`，真实路径无符号链接 |
| 原指南绝对路径 | 同机 `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial/.trial-private/START-HERE.md`；私密目录 0700、指南 0600、owner 为当前用户 |
| 固定交付目录 | `/Users/<user>/Documents/Kevin-Learning-Home-Trial`，真实 Documents、当前用户所有、0700；Finder 看到四份文件；实际未脱敏路径在本机指南和本轮交付消息给出 |
| 文件 | `START-HERE.md` 0600 含新合成账号；`KLH-TRIAL-CA.cer` 0600 仅公开 DER CA；`打开数学课堂.command` 0700；`目录整理清单.md` 0600；不复制 credentials.json、私钥、SQLite |
| 新站 | 严格 TLS，`https://192.168.2.100:38444/`；正式合成孩子登录 HTTP 200，数学「只读课堂」、英语「待迁入」，进入 `/subjects/math/lessons/G3-U01-B01`，六步课堂 1/6 可见 |
| 旧站对照 | 用旧公开 CA 严格验证 38443 公开 config，数学仍 awaiting-migration。未读取旧口令、Cookie、私钥或 DB，不声称完成旧账号登录 |
| 可见浏览器 | 本机 headed Chrome for Testing 156.0.8078.4；桌面辅助功能树独立确认窗口、38444 地址、孩子身份和六步；已查看窗口并保留课堂供体验 |

公开路径按审查要求脱敏用户名。Documents 不是第二个源码仓库；新秘密的唯一权威源仍在当前工作树 `.trial-private`，Documents 仅为受控交付副本。旧 02B 的私密源独立保留。

## 工具与关闭/重开验证

新增 `infra/math-trial/mac-delivery.mjs` / `deliver.mjs`：从已核实新合成来源交付，检查 runId、owner、权限、真实路径、CA 有效期和文件 hash。拒绝符号链接、未拥有目标及用户修改后的指南，保留用户笔记，不输出指南/密码。重复执行 `node infra/math-trial/deliver.mjs` 不生成时间戳副本。

`tests/math-trial/interactive.mjs` 使用新增 `mac-entry.mjs`：要求实际 Mac Aqua 与 console owner 匹配；仅将公开 CA 加入专属 Chromium profile，保持 TLS 链/SAN/有效期校验，复用原信任实现。原七份已通过 NAS 验证的工具及其 hash 未变。

固定 `.browser-runtime` 记录 owner/pid/nonce，重复启动返回“已运行”，不再建 profile。正常退出只清理此工具创建的临时 profile，未知用户文件保留；异常死亡的残留则保留并提示复核，不盲目删除。

实际关闭测试发现：只监听 context.close 时，关闭最后一个标签未必退出 Chromium，导致 Node/runtime 残留。本轮补充最后标签监听；核对 PID/归属后停止旧版启动器，用修复版验证**关闭最后标签 → Node 正常结束 → runtime 消失 → 再次启动并登录课堂**。最终窗口保留，No Thanks 拒绝保存密码。另从 Finder 双击启动器，已运行时保持同一课堂实例。只清理新建浏览器临时配置，不涉及项目目录或 NAS。

## 目录盘点与有界整理

[完整清单](MATH-NAS-01-R1-DIRECTORIES.md)、[脱敏 worktree 原始输出](evidence/math-nas-01-r1/worktrees.txt)、[逐目录状态](evidence/math-nas-01-r1/directory-inventory.json)。递归检查确认 1 主仓库 + 10 注册工作树，只有 1 math-trial；`.git/worktrees/...` 是管理记录，不能单独删。

三份保留：共享 Git 主仓库、当前数学秘密源、旧 02B 秘密源。两份候选：math00、status，均无 tracked 修改、无未跟踪用户文件、HEAD 有远端引用、无路径/cwd 活动进程，前者仅 3 个可再生缓存。另六份先确认/归档 ignored 历史证据或合成 DB。只查元数据，不读取旧秘密/DB；活跃 Node/浏览器属于当前 math-trial。

**零删除、零移动、未 prune、未新增项目 worktree。** 尚无对两份确切目录的删除确认；确认后重新检查、非 force 移除工作树并保留分支。git status 干净不表示 ignored 文件可删。仅添加 `.DS_Store` 忽略规则，原文件保留。

## 回归和证据边界

| 验证 | 结果 / 证据 |
| --- | --- |
| 同机/权限、固定交付/Finder | PASS，[local-delivery.json](evidence/math-nas-01-r1/local-delivery.json) |
| 可见 Chromium 真实 NAS 登录/课堂/旧站对照 | PASS，[mac-access.json](evidence/math-nas-01-r1/mac-access.json)、[无密码截图](evidence/math-nas-01-r1/mac-headed-classroom.png)；没有 HAR/trace/Cookie/profile 上传 |
| 学习表不变 | PASS，[learning-invariance.json](evidence/math-nas-01-r1/learning-invariance.json)，仅新合成 DB 的 11 表 count/hash 与原全量完成值相同；正常会话/认证写入另计 |
| 原 NAS 工具安全 | 15 Python PASS，包括原七份工具 hash 未变 |
| 工具 Node | 原 4 + 新 4 = 8 PASS；权限/幂等/无秘密返回、拒绝覆盖与 symlink、单实例/用户文件保留、最后标签生命周期 |
| 完整本地正式回归 | typecheck/build、60 Node、18 UI、3 基础视口、12 数学 Node、9 数学浏览器全 PASS，[local-verification.json](evidence/math-nas-01-r1/local-verification.json)；明确为原 HEAD + dirty 工作区 |
| 最终 Linux CI | 同一最终 HEAD 的 push / pull_request 完整 CI，Docker/Compose/恢复与全部原回归保留；精确 SHA/run/状态在 [PR #14 交付记录](https://github.com/lovestream/kevin-learning-home/pull/14)核实 |
| 用户本人/手机/iPad/Safari | 用户本人体验待反馈；普通 Safari/实体手机/iPad 因私有 CA 关口仍 `NEEDS_USER_ACTION/NOT_RUN`，代理测试不替代用户签收 |

本轮未重新部署或重跑原 NAS 全量 4/4：正式 app、镜像、Compose 与原七份工具未变，只增加 Mac 交付；真实新孩子访问及 11 表只读比对另有证据。原全量见[原报告](MATH-01-NAS-TRIAL-REPORT.md)。

## 用户体验与证书后续评估

1. Finder「前往文件夹」打开 `~/Documents/Kevin-Learning-Home-Trial/`，本机查看指南，双击启动器并保持终端。已运行则切换 Chrome for Testing；遇 macOS 阻止或权限提示先反馈，不改系统安全设置。
2. 用新合成孩子登录 **38444**，核实数学「只读课堂」、英语「待迁入」，进入首课体验六步/旋转/照片/刷新/退出。密码只取本机指南，不贴聊天/GitHub、不保存密码。429 时等自然 15 分钟窗口，不重置计数。
3. 用户用自己的旧身份确认 38443 独立运行；本轮没有代读旧口令。手机/iPad 遇 CA 不信任先停，记录设备/浏览器/错误文字，不跳过警告。

测试 CA 到期 **2026-10-31 13:58:29 UTC**（北京时间 21:58:29），无自动续期。未来路线只评估，未实施：

- **Tailscale `.ts.net`**：需 MagicDNS/HTTPS 支持、节点完整域名匹配，设备/域名进入公开证书透明日志；手工证书仍需安装与续期管理，不等于裸 LAN IP 自动可信。[官方 HTTPS 文档](https://tailscale.com/docs/how-to/set-up-https-certificates)。未开设置、申请证书或修改 Tailscale。
- **自有域名 + DNS-01 公共证书**：验证 DNS TXT，可服务仅内网网站，无需开放网站公网入站；需域名控制、受限 DNS API 凭据和续期，客户端将域名解析到局域网地址。不能描述为给私有 IP 直接签证书。[Let's Encrypt DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)。Host/Origin、代理/证书变更与回滚须另行审查授权。

R1 无新 NAS 容器/镜像/网络、系统信任、旧站/真实记录、权限、DSM、Docker daemon 或 Tailscale 变更。不进入 MATH-02，等待 ChatGPT 重新审查及用户实际体验。
