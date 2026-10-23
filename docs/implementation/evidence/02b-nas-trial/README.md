# 02B合并与NAS试运行证据

2026-10-23，正式应用精确源码7790da6，runId见plan。无真实数据或凭据。

- [总验收摘要](acceptance-summary.json)：4项真实NAS浏览器场景、5幅截图、学习表不变；实体手机/iPad待用户操作。
- [孩子三视口](browser-child.json)：真实LAN HTTPS/Node/SQLite登录，Secure/HttpOnly/Strict、刷新、家长越权拒绝、退出撤销、Origin/CSRF、CSP/外部请求/console/存储检查。
- [家长连续复核](browser-parent.json)：实际12秒、2次自动复核；DOM/键盘焦点/提升期限稳定，未解锁ID隐藏、锁定/刷新重新锁定。背景poll计数在12秒检查点截取，不含其后的主动解锁响应。
- [NAS环境/隔离/旧服务指纹](nas-status.json)、[空闲采样/目录用量](resource-sample.json)。Docker PID统计0不可靠，不代表无进程或PID配额有效。
- [问题历史](bringup-notes.json)、[新目录守卫首次拒绝](initial-directory-rejection.json)、[探针调试触发限流的历史失败](historical-browser-limit.json)。最后一项已等自然过期后复测通过，不覆盖或隐藏失败。
- [真正merge后main CI](main-ci/run.json)及该CI安全JSON；[数学来源冻结](source-freeze.json)。未复制原项目文件，未读取真实学习记录。
- 截图：`nas-child-390.png`、`nas-child-768.png`、`nas-child-1280.png`、`nas-parent-locked.png`、`nas-parent-continuity.png`，均无密码输入值。

无数据库、私钥、随机密码、cookie/CSRF值、raw控制台、HAR/trace、原NAS服务清单。文件SHA见checksums。当前容器保留给用户实体设备试用，非生产部署；收尾controller只识别本次marker/labels/精确ID，不全局清理。
