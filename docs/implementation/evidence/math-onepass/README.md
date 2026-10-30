# Issue23 证据索引

实际NAS源码：`e7b4302889da7b07fc081ae68447cba404a76ad3`，入口 http://192.168.2.100:38444/ 。本目录不包含账号、Cookie、页面能力token、真实记录或私密作业。

- `delivery.json`、`image.json`、`runtime.json`、`static-seal.json`、`nas-environment.json`：真实镜像、运行环境与19份构建资源验证。`release-inputs.json`是276项构建/共享验证输入的超集，正式server/合成仓库并未安装到NAS；`runtime-equivalence.json`证明后续文档提交没有更改运行字节。
- `source-ci.json`、`source-ci-jobs.json`、`foundation-ci.json`、`node-ci.xml`：精确源码的两套CI、逐step状态、原60/18/12/9及新增167项证据。GitHub源码push40977114435、PR40977118591。最终文档HEAD的两套CI链接见PR22正文，避免将旧CI冒称最新。
- `container-ci-summary.json`、`recovery-ci-summary.json`：CI专用合成正式底座的Docker/flock/SIGKILL/自动重启/恢复；不是在匿名NAS启用SQLite的声明。完整Compose1.28.5与容器步骤见source-ci-jobs及上述原始CI产物。
- `nas-suite.json`：13组真实NAS检查全部成功，最多两独立客户端；每组退出状态和耗时。`classrooms-nas.json`/`checkpoint-nas.json`/`navigation-nas.json`/`practice-nas.json`/`compatibility-nas.json`保存原全量回归；`business-http.json`/`cases-browser.json`/`training-results.json`/`models-results.json`/`experience-results.json`/`print-nas.json`保存新增真实业务。
- `rollback.json`：新版→原52e7814→新版实际HTTP回退；`old-projects-readonly.json`仅记录旧项目HEAD与工作区状态hash，不披露未跟踪条目名。
- `screenshots.json`与`screenshots/`：124张实际NAS全页/模型图片；`prints/`：六份20页实际教案PDF。实体手机/iPad/打印机未被自动化替代。R0旧图单独置于screenshots/r0，不能误认为最终版。
- `legacy-quality.json`及models-r1为原R1本地逐课人工观察；`legacy-quality-nas.json`为当前54课/270实际NAS视图。`visual-review-r2.json`明确人工看图范围、逐字节一致与原分辨率复看，`r2-final-pixel-comparison.json`保存109张对照的hash。
- `source-audit.json`/`source-import.json`/`study-source.json`/`reading-source.json`/`source-to-target.json`：固定源、选择性复用和164动作清单。`grade3-legacy-supersession.json`对照原50隐藏旧关及已安装概念去向，不把概念续接说成逐题或同年级等价。
- `focus-r2-failure.json`：首轮4fc8ad7真实NAS失败的最小诊断。其余首轮原始日志仅保留在同一工作区.evidence/math-onepass/attempt-4fc8ad7，不作为最终通过证据。

旧math-full-01/local-baseline.json是当时真实本地验证历史，不重标成当前版本；本次精确源码的原基础回归以本目录foundation-ci.json（PASS_CI）和源CI为准。原70/849/255离线hash闸门仍保留，NAS归档来自真实重新执行，未手改hash充数。

所有匿名解释均待人审，奖励为0；私人历史/家长复核/延迟复测只在隔离合成服务验证。保持PR18/21/22 Draft，等待集中独立审查，不合并或开启下一阶段。
