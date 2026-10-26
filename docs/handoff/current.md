# Kevin 学习家园：当前交接

## 最新指令与 R3 进行状态

当前用户明确要求：继续同一 PR #18 的 R3 课本目录整改；真 NAS 验收后**直接进入** 849 题及其它可用数学功能，不再次等待阶段批准。此指令覆盖下面 R2 的“暂停”等旧交接语句；PR 仍保持 Draft，不能自行合并，不动旧项目、真实记录或正式积分。

main `ab73c9b` 的 [统一整合路线图](../implementation/KEVIN-HOME-INTEGRATION-ROADMAP.md) 已合入。17 单元/63 课与 7 衔接、知识点层、搜索、返回原单元、册内相邻课已实现；来源白名单和 102 字段 hash、23 Node 与 11 部署保护测试及三视口真实导航本地通过。正在准备 NAS R3 发布；当前 NAS 仍 R2。下一步：候选精确 SHA 镜像→版本化 owned 发布→真 NAS 导航和 210 场景→回退/保护检查→归档，再建立 Issue #16 独立 Draft PR，后续 #17 连续推进。[R3 报告](../implementation/MATH-FULL-01-NAS-R3-REPORT.md)。

以下是 R2 历史记录；后续版本化更新使用 `infra/math-preview/release.py`，不在新发布活跃时直接调用旧单课 `switch/rollback`。

## R2 已交付：NAS HTTP 免登录 70 课

入口 **http://192.168.2.100:38444/**，根路径直接显示数学教材目录。用户明确要求局域网 HTTP，证书方案停止；没有申请证书或改 Tailscale/DSM/DNS/系统权限。使用同一 PR #18、分支 `codex/math-full-01-70-lessons`、工作副本 `/Users/yako/Downloads/codex/kevin-learning-home-math-trial`，未新增工作树。

NAS 安装源码 `974fdee8134c833d718b574d79e18d96756a73e0`；内容镜像 `sha256:03fc82b25c501c8e8f71ef92ea66c3e5d14e1f0cc2fee7be8b0c1cb90b60d521`。后续仅变更测试/部署工具及证据，166 个运行/构建输入与发布源相同，实际 NAS seal 的 11 个静态文件等同浏览器测试构建。部署源码双 CI 成功：[push](https://github.com/lovestream/kevin-learning-home/actions/runs/40207392981) / [PR](https://github.com/lovestream/kevin-learning-home/actions/runs/40207396436)。最终证据 HEAD 的双 CI 另见 PR 正文，不能把上述旧 SHA 的成功当作新 HEAD 通过。

专用目录 `/volume2/homes/admin/klh-math-preview-20261025-c6ae9e7f`；app `klh-math-preview-20261025-c6ae9e7f-app`，网络同前缀 `-net`，单容器非 root `1024:100`、只读根、256 MiB、cpuset 0、零挂载，显式发布 NAS LAN IP 的 38444。此内容镜像没有正式身份服务、SQLite、fs-ext 或学习数据，不能添加真实账户或借此放宽正式服务保护。

真实 NAS HTTP 通过 30 代表课、210 全课/视口场景；普通 Mac Chrome 可见访问、0%→100% 折盒和返回目录均通过。实体手机/iPad 尚未操作，仍为 `NEEDS_USER_ACTION`。Mac `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 内已有 `打开NAS学习家园.webloc` 与 `NAS学习家园使用说明.md`；保留旧交付文件，不要求运行 Mac 本地服务器。

原 38444 TLS 容器 `a1629cb9635ed627aa927b969e12cf37ec0a827b9c5469f9ad5d35c1c3173f85` 当前停止但完整保留；旧 app `188bcd47bf4b8781376b5cccbf0c8c38752ea261ca34ed8385ba0ed2e813d49c` 持续运行。旧目录 `klh-math-trial-20261024-8f228391` 的合成数据库、CA/证书/密钥不变，不能删除或复制进新预览。已实际回退并恢复新入口；`python3 infra/math-preview/controller.py rollback` / `switch` 只核对并操作已归属容器。旧 38443、8 个生产服务等 11 个受保护容器保持原身份、镜像、启动时间及挂载，旧合成文件 hash 不变。

NAS 目录继承宽权限导致首次 stage 安全停止，核对本次 owner marker 后只收紧本次新目录；工具已补同样守卫和回归。第一次 NAS 浏览器探针因 HTTP 没有 Cache API 失败；修正为可用时枚举、不可用时确认无条目，Service Worker 同理，保留全部持久化阴性。原始错误、回退技术探针和证据均见 [R2 报告](../implementation/MATH-FULL-01-NAS-R2-REPORT.md)。

**当前只完成 70 课教学交付，不是整个数学站迁移完成。** 849 题（Issue #16）及数学侦探/思维卡等其它能力（Issue #17）后续独立 Draft PR 接入同一 NAS 学习家园。PR #18 保持 Draft、暂停等待审查；不合并，不动旧项目或真实数据，不自动进入正式账户/成绩持久化。
