# 当前交接

2026-10-23：用户明确授权后，PR7已正常merge，`7790da6c07e118da93d8e3221b20a4fcf78c727f`。[真正push→main的完整CI39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578)成功，60项Node、18项UI（原13+R1新增5）、旧3视口和Docker/Compose均保留。此默认分支文档提交只修正合并后的状态，不引入试运行工具或课程代码；历史R1报告保持原有时点。

当前[Draft PR8](https://github.com/lovestream/kevin-learning-home/pull/8)包含NAS隔离试运行工具、证据和数学复制适配方案，未合并。[本轮执行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/IMPLEMENT-02B-NAS-TRIAL.md)、[数学规划](https://github.com/lovestream/kevin-learning-home/blob/codex/02b-nas-trial/docs/implementation/MATH-COPY-ADAPTATION-PLAN.md)、[合并CI归档](https://github.com/lovestream/kevin-learning-home/tree/codex/02b-nas-trial/docs/implementation/evidence/02b-nas-trial/main-ci)。NAS准确应用版本仍7790da6，无auth/UI运行代码重写。

DS918+本地ext4已建立专用合成数据目录、正式app与TLS代理两个非root只读根文件系统容器。真实离线TTY工具创建虚构家庭；应用Node24.15.0/SQLite3.51.3/WAL/v2就绪，LAN HTTPS入口可达。群晖新目录继承0777被正式隐私守卫拒绝后，仅收紧本次自有目录；Docker internal桥发布不生效后，只给TLS代理加专用入口网络，app仍内部。既有8个容器状态/启动时间/重启计数不变。测试CA没有安装到任何设备，密码和私钥本地私有且忽略，不入GitHub。

用户只需LAN，外部使用既有Tailscale；不改Tailscale或开放公网。手机/iPad实体体验等待用户操作，不能以模拟视口替代。Linux4.4不在Node24官方支持内核范围，继续列为风险。试用容器restart=no，保留给用户验收，结束只清理精确拥有的资源。

数学/英语旧站未改，未导入真实数据；数学只做冻结、差异与后续分批PR方案，不复制70课、不合并积分/蛋仔。后续实际接入、真实身份/正式HTTPS/备份恢复/上线验收分别独立审查。本轮完成后等待ChatGPT审查PR8，不自行合并或继续课程开发。
