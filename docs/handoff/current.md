# 当前交接

2026-10-23：用户明确授权后，PR7已正常merge，`7790da6c07e118da93d8e3221b20a4fcf78c727f`。[真正push→main的完整CI39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578)成功，60项Node、18项UI（原13+R1新增5）、旧3视口和Docker/Compose均保留。此默认分支文档提交只修正合并后的状态，不引入试运行工具或课程代码；历史R1报告保持原有时点。

当前[Draft PR8](https://github.com/lovestream/kevin-learning-home/pull/8)包含NAS隔离试运行工具、证据和数学复制适配方案，未合并。[本轮执行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/IMPLEMENT-02B-NAS-TRIAL.md)、[数学规划](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/MATH-COPY-ADAPTATION-PLAN.md)、[合并CI归档](https://github.com/lovestream/kevin-learning-home/tree/codex/02b-nas-trial/docs/implementation/evidence/02b-nas-trial/main-ci)。NAS准确应用版本仍7790da6，无auth/UI运行代码重写。

DS918+本地ext4已建立专用合成数据目录、正式app与TLS代理两个非root只读根文件系统容器。真实离线TTY工具创建虚构家庭；应用Node24.15.0/SQLite3.51.3/WAL/v2就绪，LAN HTTPS入口可达。群晖新目录继承0777被正式隐私守卫拒绝后，仅收紧本次自有目录；Docker internal桥发布不生效后，只给TLS代理加专用入口网络，app仍内部。既有8个容器状态/启动时间/重启计数不变。测试CA没有安装到任何设备，密码和私钥本地私有且忽略，不入GitHub。

用户只需LAN，外部使用既有Tailscale；不改Tailscale或开放公网。手机/iPad实体体验等待用户操作，不能以模拟视口替代。Linux4.4不在Node24官方支持内核范围，继续列为风险。试用容器restart=no，保留给用户验收，结束只清理精确拥有的资源。

数学/英语旧站未改，未导入真实数据；数学只做冻结、差异与后续分批PR方案，不复制70课、不合并积分/蛋仔。后续实际接入、真实身份/正式HTTPS/备份恢复/上线验收分别独立审查。本轮完成后等待ChatGPT审查PR8，不自行合并或继续课程开发。

## PR8本轮最终执行补充

NAS自动化验收完成：3种孩子视口（390/768/1280）和1项家长实际12秒/两次后台复核均PASS_NAS，5幅无凭据截图，Secure/HttpOnly/Strict、权限隔离、刷新/锁定/退出、Origin/CSRF/CSP、学习表全行hash不变均核对。[总摘要](../implementation/evidence/02b-nas-trial/acceptance-summary.json)、[执行报告](../implementation/IMPLEMENT-02B-NAS-TRIAL.md)、[数学复制适配方案](../implementation/MATH-COPY-ADAPTATION-PLAN.md)。正式app仍7790da6；最新main仅状态文档`164ddbf22781bba5300652038436a0cf207d9469`，完整main CI run39955232856与PR8最终HEAD双事件CI须收尾核绿，准确链接归PR8正文。

新增工具仅isolated trial目录、controller、HTTPS proxy与手动NAS浏览器验收脚本；CI只跑离线语法/proxy测试并保留原完整60/18/3/Docker。为新试用分支增加push触发并在原workflow约束测试显式加入该分支，未删改其余安全断言。首次新增分支的CI清单不匹配失败已记录，修复后完整CI重新核验。

手机/iPad实体测试仍NEEDS_USER_ACTION；已在会话提供LAN入口与本机私密指南，密码/密钥不入GitHub。trial restart=no、8个原容器不变，保留试用入口给用户；未做本轮生产恢复/外部Tailscale路径/正式身份。等待ChatGPT审查PR8，不合并、不进入课程开发。
