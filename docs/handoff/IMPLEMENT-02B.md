# IMPLEMENT-02B 交接

2026-10-23 R1当前交接：继续同一PR7，修复5秒复核卸载页面与内部JSX组件类型变化，原60/13保留，新增5项UI=18。完整本地60/18/3已通过；查看[整改报告](../implementation/IMPLEMENT-02B-review-R1.md)及[R1证据](../implementation/evidence/02b-r1/README.md)，最终HEAD及双事件完整CI由PR7正文提供。旧站/真实数据/NAS不操作，保持Draft，完成后停止等ChatGPT复审。以下保留02B初轮交接。

2026-10-22。本轮获准建设网页外壳，从 main `f2c42c2475d0ae85c1688b13e437bc4332d12315` 建立 `codex/implement-02b-shell`。PR6 已合并，其真正 main push [CI 39765830063](https://github.com/lovestream/kevin-learning-home/actions/runs/39765830063) 成功。02A/R1旧报告保留历史时点，不再据其停止线阻止已经批准的02B。

任务单原字节归档于[KLH-IMPLEMENT-02B-UI-SHELL.md](../tasks/KLH-IMPLEMENT-02B-UI-SHELL.md)，来自 `chatgpt/klh-implement-02b-start@aaf8fe6936f780b94f6aa55b7bbf3c1768bc52a9`，blob `f2fd44b8c5b8cde0fd7caa0d575119acfb2e2728`。完整来源见[provenance.json](../implementation/evidence/02b/provenance.json)。

## 审查入口

- [执行报告/B01–B15](../implementation/IMPLEMENT-02B-execution-report.md)
- [页面、角色状态机与学科插槽](../implementation/IMPLEMENT-02B-ui-architecture.md)
- [会话/撤销/CSP/路由安全评估](../implementation/IMPLEMENT-02B-security-review.md)
- [自动化证据与截图索引](../implementation/evidence/02b/README.md)

实现统一中文登录、孩子空家园、家长解锁/选择/报告占位、响应式导航。React同源访问原02A真实cookie接口；没有前端假角色、持久化token、课程/积分模拟。SubjectModule是版本化类型，数学/英语仍disabled待迁入。原55项Node保留，增加5项契约测试、13项真实React/Node场景；原3视口回归不改。Linux镜像/恢复/Compose结果需读取实际CI证据，不将Mac通过算作NAS通过。

## 需要理解的设计边界

页面刷新/新文档主动通过真实parent-lock回到锁定态，未改变02A底座“服务重启后有效会话仍可延续”的语义。家长授权切换现查、解锁期间每5秒复核；服务端撤销立即生效，UI不宣称实时推送。失焦/隐藏/离线/错误/到期即隐藏私有信息，恢复重新确认；迟到响应不能越过到期重新显示资料。

待确认退出/锁定意图只在当前页面内存保存，断网退出不得显示成功；关闭或刷新后只能根据实际服务端状态恢复，并重新锁定家长。认证默认禁用及生产HTTPS/Origin/CSRF策略保持原样。浏览器Zod使用jitless来遵守原CSP，未放宽unsafe-eval。

旧数学和英语仓库未修改、未调用其内部接口、未复制课程或记录；只比较其Git状态摘要，原有未提交条目保留。无真实账户/记录、无NAS连接/部署、无云资源或公网配置。实体iPad/Safari、生产TLS代理、NAS02B兼容性均NOT_RUN。

## 当前停止线

提交独立Draft PR，完整push及pull_request CI通过并归档后停止。最终精确HEAD及其永久Actions链接放在PR正文，避免文档引用自身提交SHA形成循环；执行报告记录已归档的实现提交结果。不得自动合并、进入学科迁移/下阶段、创建真实家庭身份或部署生产。ChatGPT独立复审后再由用户决定下一步；NAS新容器、权限/生产HTTPS及真实数据操作仍须另行明确授权。

已创建[Draft PR #7](https://github.com/lovestream/kevin-learning-home/pull/7)。实现/CI修正提交`b08defe2b37604b77609ebad3bafa99b88c7cb3b`的[完整PR CI39801465973](https://github.com/lovestream/kevin-learning-home/actions/runs/39801465973)成功，60/3/13、Linux Docker恢复与Compose1.28.5安全证据已归档；最后归档提交本身及push/PR最终checks以PR7正文为准。保持Draft，不合并、不进入下一阶段。

同实现SHA的[push run39801457690](https://github.com/lovestream/kevin-learning-home/actions/runs/39801457690)已completed/success，独立下载artifact再次核对60/3/13、原55保留、14截图与Docker/Compose；见[push元数据](../implementation/evidence/02b/ci/push-run.json)。最终归档提交的双事件完整CI以PR7正文的准确HEAD及永久链接为准，不将实现提交的绿灯代替最终HEAD。
