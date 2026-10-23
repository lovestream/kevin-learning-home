# IMPLEMENT-02B Linux CI归档

已核对实现/环境修正提交 `b08defe2b37604b77609ebad3bafa99b88c7cb3b` 的 [pull_request run 39801465973](https://github.com/lovestream/kevin-learning-home/actions/runs/39801465973) completed/success。artifact `implement-02b-evidence`，执行HEAD相同、worktreeDirty=false；现代Linux x64 / Node24.15.0 / kernel7.0.0-1017-azure。不是NAS、实体iPad或生产HTTPS验证。

- [完整命令与环境](verification.json)、[Actions所有step结果](pull-request-run.json)
- [60项Node清单](test-cases.json)：原55名称完整保留，新增5，无skip/error/failure
- [13项真实React/Node场景](shell-browser.json)：未过滤、零失败，真实cookie后端，Origin/CSRF审计，零CSP违规/外部请求/console泄密/浏览器持久化，旧学习表不变
- [原3视口回归](browser.json)、[14幅CI截图](../README.md#截图)
- [基础Docker](container.json)：非root/readonly、flock竞争者不能抢占、SIGKILL恢复、unless-stopped实际自动重启计数1、持久卷/媒体/全部表哈希/恢复后ready
- [auth-enabled Docker](auth-container.json)：重启/重建、logout持久失效、backup/restore撤销旧会话、恢复凭据及grant、锁定parent隐藏范围、shell/auth夹具排除
- [Compose1.28.5解析](compose-v1.yml)、[readiness](r1-readiness.json)、[flock异常恢复](r1-ownership.json)、[迁移](auth-migration.json)、[备份恢复](recovery.json)、[合成bootstrap](auth-bootstrap.json)
- [SHA256清单](checksums.json)：归档原始安全文件与截图的字节校验，不包含后写的说明文档/清单自身

只复制明确允许的安全JSON/YAML和截图；不复制原始日志、数据库、凭据、cookie、CSRF值、trace/HAR。认证正例不mock；注册表/断网/延迟/CSRF故障注入是负例，见安全评估。原镜像恢复测试用隔离合成数据，与真实孩子学习无关。

CI中文字体来自官方[notofonts/noto-cjk固定提交](https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c)，OTF SHA256 `2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b`，仅CI用户字体目录。未打包字体进网页/镜像，未放宽CSP或增加浏览器外部请求。

同实现SHA的push run及归档提交最终push/PR完整CI必须另行核对，最后精确HEAD/永久URL放在[Draft PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)正文。归档实现证据和最终归档HEAD明确区分，避免文档引用自身SHA循环。本轮保持Draft、等待ChatGPT复审，不合并或部署。

同实现SHA的[push run39801457690](https://github.com/lovestream/kevin-learning-home/actions/runs/39801457690)已completed/success，独立下载artifact再次核对60/3/13、原55保留、14截图与Docker/Compose；见[push元数据](push-run.json)。最终归档提交的双事件完整CI以PR7正文的准确HEAD及永久链接为准，不将实现提交的绿灯代替最终HEAD。
