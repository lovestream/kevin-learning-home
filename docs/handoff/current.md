# Kevin 学习家园：当前交接

## Issue #16 已交付 NAS，继续 Issue #17

当前分支 `codex/math-full-02-practice`、独立叠加 Draft PR #21；基于 PR #18 的稳定 R3 8628f0a。当前 NAS 源码 `d835f8c7fbd5a341cc30cf44dea5c6dc62f65d12`，镜像 `sha256:15de948d7a34fe00286aee8b59b96bae48b81afce95478a56fb45c3fe30568c1`；源码完整 push 40274239518 / PR 40274276385 成功。后续归档提交不改变 178 发布输入，最终精确 HEAD 双 CI 见 PR 正文。

同一 HTTP 38444 已含 70 课与 849 题；五组/五型、首答/三自查/终答、335 解释题人审、刷新清空。实际 NAS 849 HTTP、三视口/84 练习流程、30/210 课堂、教材导航及练习版→R3→练习版均通过；11 个受保护容器与旧合成文件不变。普通 Chrome 此轮连接不可用，未修改设置或绕过警告；实体手机/iPad及普通 Chrome 仍待用户体验。

当前容器 `klh-math-preview-20261025-c6ae9e7f-d835f8c7fbd5-app`，ID `ae61af1c1b40524ac8a872eaf840321d98686e295afff2301325d94f05a6010b`，IP 172.30.244.4；零挂载/只读根/非 root/256 MiB/cpuset 0。R3 容器 159ef39…及镜像 942c300…保留停止，作为当前直接回退；R2 与初始合成单课同样保留。

[完整报告](../implementation/MATH-FULL-02-REPORT.md) · [回执](../implementation/evidence/math-full-02/delivery.json) · [输入清单](../implementation/evidence/math-full-02/release-inputs.json)。管理仍用 `infra/math-preview/release.py` 和现有私密 owner ledger，不能调用旧 controller switch/rollback，不改 daemon/DSM/Tailscale/权限。

按最新人类指令继续 Issue #17，不在此暂停。只读审计已确认 17 已审思维卡、14 公开匿名模拟案卷、54 高年级旧版课/432 题与 28 方法条目（6 完整指南）；43 暂缓卡/168 蓝图不当作可运行。准备资料位于忽略的 `.evidence/math-full-remainder/`，未修改当前 runtime、旧仓库或真实数据；将在同一工作副本建立 `codex/math-full-03-capabilities`、叠加 PR #21 的独立 Draft，实际接入同一 NAS 后再验收。不要合并任何 Draft、接入私密案卷/上传箱、正式身份/真实成绩/钱包/宠物。

## 以下为 R3 时点归档，当前运行版本以上文为准

## R3 已在 NAS 验收，直接连续推进 Issue #16/#17

用户最新指令覆盖历史暂停点：在同一 PR #18 完成 R3 后，直接继续 849 题和其它可用数学功能；各 PR 保持 Draft、不合并，不等待重复阶段授权。main `ab73c9b` 的统一路线图已合入。工作副本仍 `/Users/yako/Downloads/codex/kevin-learning-home-math-trial`，不增加工作树。

入口 **http://192.168.2.100:38444/**，免登录、无证书。运行源码 `020ceb9a6792a18e8d020914ec4250b631ef13d0`；镜像 `sha256:942c3001a5f703a38c8d90cd7ca2a21b0360f6b05f7c262d3c11c26641d31690`。部署源码双 CI 成功：[push](https://github.com/lovestream/kevin-learning-home/actions/runs/40253781809) / [PR](https://github.com/lovestream/kevin-learning-home/actions/runs/40253785707)。最终证据提交的精确 HEAD CI 见 PR 正文，不沿用旧 SHA。

上册 9/39、下册 8/24、7 衔接、原知识点/顺序/印刷页、搜索与单元返回已经在实际 NAS 通过三视口导航；30 代表课及 210 课堂场景全通过。普通 Mac Chrome 已实际打开课堂并返回混合运算。实体手机/iPad 仍为 NEEDS_USER_ACTION。Mac 原交付目录 `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 的快捷方式和说明已验证可用，没有新建副本。

[R3 执行报告](../implementation/MATH-FULL-01-NAS-R3-REPORT.md) · [原始交付回执](../implementation/evidence/math-full-r3/delivery.json) · [169 发布输入](../implementation/evidence/math-full-r3/release-inputs.json)。R3 实际静态 seal 的 11 文件与测试构建一致，后续仅文档证据提交不能被标为部署 SHA。

## 已登记的隔离运行与回退

专用 NAS 目录 `/volume2/homes/admin/klh-math-preview-20261025-c6ae9e7f`；网络同前缀 `-net`。当前 app `klh-math-preview-20261025-c6ae9e7f-020ceb9a6792-app`，ID `159ef39bdc11e872045dfb42e286eb7c7c59844c1cabf52939c16f67fe51642a`，IP 172.30.244.3，发布 NAS LAN 38444。非 root 1024:100、只读根、零挂载、256 MiB、cpuset 0、no-new-privileges、cap-drop ALL；无 SQLite/账户/真实数据。

已实测 R3→R2 HTTP→R3。R2 app `ed08a3afdf924f1c349f4c0bcdd13e38f9b1bc55f87f6057a3ba4a7384ca79fc` 及 `sha256:03fc82b25c501c8e8f71ef92ea66c3e5d14e1f0cc2fee7be8b0c1cb90b60d521` 保留但停止。初始 TLS 容器 `a1629cb9635ed627aa927b969e12cf37ec0a827b9c5469f9ad5d35c1c3173f85` 保留停止，旧 app `188bcd47bf4b8781376b5cccbf0c8c38752ea261ca34ed8385ba0ed2e813d49c` 持续运行。11 个受保护容器与旧合成数据/证书 hash 不变，不删除它们。

后续仅使用 `infra/math-preview/release.py stage/activate/rollback` 版本化操作。私密 `.math-preview-private/state.json` 是 owner/完整 ID/前后保护快照登记，必须保留、不提交 GitHub。不要在版本化发布活跃时调用旧 controller 的 switch/rollback。Docker 仅通过 nas-codex 的已配置 sudo -n；不得改 daemon、DSM、Tailscale、权限或任何原服务。

## 下一批实施

Issue #16 在稳定 R3 上建立 `codex/math-full-02-practice` 独立 Draft PR；PR #18 未合并时基于其分支叠加，保留清晰差异。复用冻结原题库与纯评分器，在同一课堂接入五组 849 题、首答→三自查→终答；335 解释题保持待家长核对；只做内存状态及无状态评分，不落真实成绩、积分。完成并交付同一 NAS，再继续 Issue #17 的已公开可用数学能力。旧数学/英语只读，不迁真实记录，不自行合并或提前做正式身份/奖励持久化。
