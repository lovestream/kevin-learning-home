# Kevin 学习家园：当前交接

## 紧急纠偏：唯一用户交付目标是NAS学习家园，不是Mac本地站（2026-10-25）

**用户明确要求：他已经体验并认可NAS数学第一课的视觉/交互样式，立即把原数学学习网站现成教学、教具、练习等功能迁入NAS上的Kevin学习家园。现阶段不要登录/注册/账号密码，真实学习记录和积分留待正式上线。** 不允许以后再将`127.0.0.1:4179`、双CI success或单独的本地可见窗口当成最终交付。原NAS 38444合成单课是实际体验起点，旧38443仍是02B。

截至本条： [Draft PR18](https://github.com/lovestream/kevin-learning-home/pull/18) HEAD `9aa2371bb3eb28055a3b5879f48dc6ebc73c457b` 的70/70教案、原教具适配、210/210浏览器及两套完整CI已通过，**但仅Mac localhost内容服务，NAS 70课尚未部署，849题/数学侦探/已审卡/可用高年级仍未迁入，不能当整站完成。**

已在[PR18 R2整改指令](https://github.com/lovestream/kevin-learning-home/pull/18#issuecomment-6399021659)明确要求Codex**继续在同一Draft PR部署NAS免账号70课**，核验旧38444可回退、正式服务不取消认证、旧8容器/38443/旧数学英语网站/真实数据不受损、严格TLS、实际从NAS IP浏览器验收；解决Mac-only硬编码localhost监听、内容未打入Docker镜像、服务无学习家园数学入口等问题，不重复开发70课。随后直接续做[Issue16 849道原题完整练习到同一NAS](https://github.com/lovestream/kevin-learning-home/issues/16)、[Issue17其他现成数学能力](https://github.com/lovestream/kevin-learning-home/issues/17)。先完成可访问的NAS体验而不是先造报告；仍保持Draft待独立代码和实装复审。

**权限边界**：本次用户明确要求替换现有**合成试用38444**的教学展示；不授权公开正式身份API/真实数据，旧38443与生产8容器不得动、证书和NAS系统/Tailscale不能未经必要审批变更。原2026-10-31到期私有CA在Safari/iPad可信度不足，必须实际核验，不可通过忽略TLS错误伪造移动端PASS。

## 最新阶段：70课+849题优先，账号密码暂停（2026-10-25）

用户已在自己Mac实际体验G3-U01-B01并认可现有六步风格，反馈手机/iPad适配观感满意；据此确定快速全量内容路线，不再扩展账号密码。**PR14已由ChatGPT复审并合并**：merge `942dc508858f548af1e0517aa3365e08bfbee0e4`，[复审记录](https://github.com/lovestream/kevin-learning-home/pull/14#issuecomment-6392804835)。旧38443仍02B；新38444为合成账号单课试用，并不自动变为70课。Issue13已按其合成试用交付范围关闭，手机/iPad可信TLS/旧身份验收仍未等价完成。Mac工作目录11份零删除，当前秘密源及启动器继续保留。

**立即实施优先级**：[Issue15：70节六步课堂＋原教具＋免账号独立体验](https://github.com/lovestream/kevin-learning-home/issues/15) → [Issue16：849道题／三项自查／本次临时作答](https://github.com/lovestream/kevin-learning-home/issues/16)。[统一范围与验收](../implementation/MATH-FULL-ROADMAP.md)明确70课仅为三年级当前可运行入口；数学小侦探、17张已审卡、四至六年级旧来源需要随后审计补齐。体验预览独立于正式认证，无真实数据/登录资料迁移、无学习写入/积分/蛋仔。**目前尚未实现免账号70课预览，也未部署新的数学课程。** 原MATH-02持久化仍暂停。

## 历史交接：PR #14 R1 Mac 可用性交付（现已合并）

2026-10-25，按 [R1 审查要求](https://github.com/lovestream/kevin-learning-home/pull/14#issuecomment-6385527963)先解决用户实际体验。**固定入口：`~/Documents/Kevin-Learning-Home-Trial/`**，用户 Mac Finder 已确认 `START-HERE.md`、公开 CA、`打开数学课堂.command`、`目录整理清单.md`。目录 0700，指南/公开 CA 0600、启动器 0700。原指南确实在同一 Mac `/Users/<user>/Downloads/codex/kevin-learning-home-math-trial/.trial-private/START-HERE.md`；真实未脱敏绝对路径在本机指南与交付消息，密码没有进 GitHub。

本机可见 Chromium 实际合成孩子登录 **38444** 成功，数学「只读课堂」、英语「待迁入」，首课六步可见；桌面界面独立核对窗口和地址。旧 **38443** 公开配置仍两科待迁入，未取旧密码/DB。新增启动器同机/Aqua/owner 检查，严格 TLS 仅信任专属 profile；已验证最后标签关闭释放 runtime、可重开、重复启动不建第二份配置。用户本人验收仍待反馈，执行代理成功不等于用户签收。

唯一活动工作副本及新秘密源仍是 `kevin-learning-home-math-trial`。11 份目录来自 1 主仓库 + 10 worktree，只有 1 math-trial；共享 Git/当前数学/旧02B秘密源保留，math00/status 是待用户确认的两份候选，另外六份先归档 ignored 证据。**没有删除、移动或新增项目目录**，不要手删 `.git/worktrees`。详见[清单](../implementation/MATH-NAS-01-R1-DIRECTORIES.md)。

[R1 执行报告](../implementation/MATH-NAS-01-R1-DELIVERY.md)、[Mac 可见访问](../implementation/evidence/math-nas-01-r1/mac-access.json)、[交付定位](../implementation/evidence/math-nas-01-r1/local-delivery.json)、[11 表不变](../implementation/evidence/math-nas-01-r1/learning-invariance.json)。本地完整正式回归与 15 Python / 8 工具 Node 通过；原七份 NAS 工具 hash 未变。最终精确 HEAD 的 push/PR 完整 CI 在 [PR #14 正文](https://github.com/lovestream/kevin-learning-home/pull/14)核对，不能沿用旧 6d0e190 的成功记录。

普通 Safari/实体手机/iPad 因私有 CA 仍 `NEEDS_USER_ACTION/NOT_RUN`。测试 CA 到期 2026-10-31 13:58:29 UTC，仅专属 Chromium 内信任；后续 Tailscale 域名证书/自有域名 DNS-01 只作评估，没有实施。R1 未创建/修改 NAS 容器、配置、系统信任或 Tailscale；旧站、真实学习数据不动。**保持 Draft、不合并、不进入 MATH-02，等待 ChatGPT 重新审查和用户体验。**

## MATH-NAS-01 原技术验收归档

2026-10-24，按 [Issue #13](https://github.com/lovestream/kevin-learning-home/issues/13) 新建独立数学只读试用 **`https://192.168.2.100:38444/`**。旧 [38443](https://192.168.2.100:38443/) 保留源 `7790da6` 的 02B，不含数学；新实例固定已通过 main CI 的 `e594b3e6db0563f6a6b56bc2b0724f1bcd8c961e`，新 app 才启用 `KLH_MATH_READONLY=1`。用户在新入口应看到数学「只读课堂」、英语「待迁入」。不把 main 合并或旧02B成功误称为数学实体设备验收。

[Draft PR #14](https://github.com/lovestream/kevin-learning-home/pull/14)、[完整执行报告/错误修正](../implementation/MATH-01-NAS-TRIAL-REPORT.md)、[公开证据](../implementation/evidence/math-nas-01/browser-results.json)。最终精确工具 HEAD 与 push/PR 两套完整 CI 在 PR 正文交付记录核实；镜像独立构建 run [40099510393](https://github.com/lovestream/kevin-learning-home/actions/runs/40099510393)，运行源 main CI [40085571114](https://github.com/lovestream/kevin-learning-home/actions/runs/40085571114)，不要混淆这些 SHA/run。

- 新前缀 `klh-math-trial-20261024-8f228391`、新合成目录、owner marker、内部/edge bridge、app/tls、独立7天证书；无旧数据/CA复用。Node24.15.0 + amd64 正式镜像 + fs-ext 实机兼容，app healthy。非root1024:100、只读rootfs、cap-drop、no-new-privileges、CPU0、512/128MiB、有限日志、restart=no。没有修改DSM、sudoers、Docker daemon、Tailscale或防火墙。
- **真实 NAS LAN 全量 4/4 通过**（未筛选）：390/768/1280孩子登录与六步、旋转/三视图/照片/刷新/退出；家长锁定403、解锁grant200、12秒2轮auth+math复核 DOM/焦点稳定、撤销403和隐私遮蔽、正式离线CLI恢复grant。所有成功课件及实际JS/CSS对镜像hash，11学习表逐表count/hash相同。正常响应CSP与无外站请求等通过；离线维护期间3次固定无数据503单列。
- 原8服务+旧02B两容器 ID/State/StartedAt/RestartCount、旧公开CA/叶证书hash不变；旧readiness和匿名登录页经严格TLS为200。**旧账号登录 NEEDS_USER_ACTION**：任务禁止读取旧密码/Cookie/DB，未用匿名200代替登录实测。
- **实体手机/iPad NEEDS_USER_ACTION**。执行代理查看了真实NAS生成的多个尺寸截图，不是用户的实体触控验收。当前CA只在独立Chromium profile中信任，不改系统Keychain、不忽略证书错误；若设备不支持独立信任，应停在证书关口并另行审查受信域名方案，不跳过警告或安装全局信任。
- 原技术验收时账号指南仅在工作目录 `.trial-private/START-HERE.md`；R1 已新增上方固定 Documents 安全交付，密码仍不提交 GitHub。正式账号限速保留，5次/15分钟含离线验证；测试重试曾耗尽额度，等待自然窗口后完成，未清理计数。试用证书2026-10-31到期，无自动续期、生产化或后台清理。
- 原数学/英语独立运行，正式应用/Dockerfile/Compose/旧trial工具不改，真实记录不导入；新实例按任务保留试用。保持Draft，不合并，不进入MATH-02。当前等待ChatGPT独立复审和用户实体设备反馈。

## MATH-01 合并时的历史验收

- [PR #12](https://github.com/lovestream/kevin-learning-home/pull/12) 最终审查 HEAD `824907055badc8484d9be2d480730fc1516013a8`，已审查并合并，merge SHA `f62a485492f79afe7832e8ec7021bfbfb62e214a`。[ChatGPT审查意见](https://github.com/lovestream/kevin-learning-home/pull/12#issuecomment-6383023852)归档于PR评论：GitHub不允许作者正式Approve自己的PR，不能冒充平台APPROVED。
- [push CI40075159711](https://github.com/lovestream/kevin-learning-home/actions/runs/40075159711)、[PR CI40075162094](https://github.com/lovestream/kevin-learning-home/actions/runs/40075162094)已核实精确HEAD、completed/success。原60 Node、18 UI、3视口、新12数学Node/9数学浏览器、Docker/Compose和容器恢复保持通过。合并后的main独立CI另行看Actions，不得将PR CI称为main通过。
- [实施报告/A01–A12/原始失败修复](../implementation/MATH-01-EXECUTION-REPORT.md)、[来源9项至8目标与hash](../implementation/evidence/math-01/origins.json)、[实际单课投影等价](../implementation/evidence/math-01/public-projection-check.json)、[来源边界](../implementation/evidence/math-01/source-boundaries.json)。仓库 `evidence/math-01/ci`归档的是早期实现提交`3970dd8`的快照；最终HEAD两套CI日志/PR正文独立验证，不混淆时点。
- 只读首课：`G3-U01-B01` / contentVersion `2026-10-07.2` / editorialRevision `2026-10-09.4` / `draft`。六步教学、相机/盒子投影与临时照片可交互，只在浏览器组件内存；第六步说明练习未接入。只复制原审计批准片段及单课公开DTO，未将70课、题库答案或旧数学写API移入。
- 功能开关`KLH_MATH_READONLY=1`必须显式配置且有正式auth，默认关闭；服务端session/孩子身份/家长解锁与实时grant为唯一来源，现有Host/Origin/Cookie/CSRF/CSP维持。学习状态11业务表不变，认证必要last_seen/audit/session写入另计。
- MATH-01合并时Math实体Mac/Safari/手机/iPad/Android人工验收`NOT_RUN`；当时手机/iPad通过的是02B登录，MATH-01本身未操作NAS。后续MATH-NAS-01新增隔离实例与Mac自动化/截图视觉检查见本文当前交接，实体手机/iPad仍待用户反馈。真实Kevin学习记录未导入。

## 前置已合并

- IMPLEMENT-01/02A/02B：PR5/6/7已合并，原正式02B NAS试用镜像来源`7790da6`；NAS隔离试用归档PR8合并`8b99528`，仍保留原容器和临时CA。
- MATH-00：PR10合并`6864de8`，来源审计133文件/273依赖/70 draft元数据/9候选与首课只读合同，Issue9关闭。

## 下一关口：MATH-02（未授权实施）

MATH-02 将首次涉及数学学习阅读记录的持久化，需要单独范围审查和任务授权，不能基于MATH-01通过自动放开写入。开发前必须确认数据模型按learnerId+math+contentVersion隔离，服务端重新鉴权，命令schema/revision/幂等receipt/event落在同一SQLite事务，含重试、409冲突、权限撤销、SIGKILL重启、备份新卷恢复与多孩子隔离的独立测试；这仍**不是**练习、积分或蛋仔权限。每阶段独立分支、Draft PR、完整双事件CI及审查。

当前NAS隔离试用`restart=no`，旧8容器、原数学/英语站和真实数据不能触碰；7天CA有期限，不得降低TLS验证或自动替换生产证书。正式家庭使用仍须持续受信HTTPS、真实身份/密钥恢复、加密异地备份、新卷恢复、外部Tailscale路线与Node24/DSM Linux4.4支持评估。Issue13已授权并完成独立合成数学试用；任何生产部署、真实数据或本次边界外变更仍须另获明确授权。
