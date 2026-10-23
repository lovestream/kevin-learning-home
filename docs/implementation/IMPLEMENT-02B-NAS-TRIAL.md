# 02B合并、NAS局域网隔离试运行与下一步规划

2026-10-23。按用户明确授权依次完成PR7合并、合并后CI、NAS合成家庭试运行和数学复制适配规划。用户只要求LAN，外部沿用其既有Tailscale；不配置公网、不修改Tailscale。新工具/证据/方案归档[Draft PR8](https://github.com/lovestream/kevin-learning-home/pull/8)，不自行合并，等待ChatGPT审查。

## 结论与准确版本

- [PR7](https://github.com/lovestream/kevin-learning-home/pull/7)已正常merge，保留原提交历史；实际merge SHA `7790da6c07e118da93d8e3221b20a4fcf78c727f`。合并前main另有3条文档提交，与R1最终f179b89相比没有新增应用运行代码。
- 真正event=push、branch=main、head=7790da6的[完整CI39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578)success，artifact独立下载并核对SHA、干净工作区、原60测试名集合、18真实UI（原13+新增5）、原3视口和15截图；Docker/Compose/恢复/自动重启均保留。[安全归档](evidence/02b-nas-trial/main-ci)。没有以PR绿灯替代合并后CI。
- default main另有仅README/PROJECT_STATUS/current.md状态修正文档，明确区分当前与历史描述；正式试用应用始终冻结7790da6。最新main文档提交/CI及PR8精确HEAD的结果见PR8正文与Checks，应用镜像没有随文档变化重建。
- NAS正式Node24.15.0、SQLite3.51.3/WAL/schema2、fs-ext/flock底座及真实离线合成身份初始化成功；`/health/ready`就绪，LAN HTTPS经专用CA校验可达。[真实NAS摘要](evidence/02b-nas-trial/nas-status.json)。具体浏览器结果见下表与证据索引，不把历史PR5通过替代02A/02B真机验证。

## 隔离范围、运行状态与资源

精确runId/source见[plan](../../infra/trial/plan.json)。只读检查先确认DS918+、x86_64、Linux4.4.180+、Docker20.10.3、Compose1.28.5、admin UID1024/GID100，本地ext4可写且空间充足，目标目录和监听端口原不存在。使用现有Docker-only sudo，不新增sudoers、SSH认证或管理权限。

GitHub[镜像workflow39951955618](https://github.com/lovestream/kevin-learning-home/actions/runs/39951955618)先核验merge的main CI，再用原样正式Dockerfile和lock从7790da6构建linux/amd64，保存专用临时artifact（非registry发布、无NAS SSH）；NAS接收后复核归档SHA256、imageID与revision/run label。imageID=`sha256:c73bb23119b339b99d2a46926223b8f9e6c26155fb06ce19d6971a61fd70c6a7`，归档hash见NAS摘要。

| 自有资源 | 限制和目的 |
| --- | --- |
| 新建带owner-marker的专用合成root | 仅其内部data/media/content/tls/code/artifacts，根/目录0700；不读写旧学习目录、旧挂载或真实记录 |
| 正式app容器 | UID1024:100、rootfs只读、cap-drop ALL、no-new-privileges、init、单逻辑CPU、512MiB、restart=no、限量日志；只在专用internal桥，无宿主HTTP端口 |
| 独立TLS代理容器 | 同一正式image仅覆写Node入口加载试用proxy，128MiB及相同安全限制；加入自有edge+internal桥，仅LAN指定IP的一个高位HTTPS端口，非host网络/0.0.0.0发布 |
| 证书/身份 | 独立7天测试CA和server证书；真实离线TTY auth-admin --synthetic生成2个虚构身份。密码/私钥只在忽略的私有本地/专用NAS目录；不打包或提交GitHub，不装设备信任 |
| 原有NAS服务 | 前后8个容器的完整ID/状态/StartedAt/RestartCount一致；只归档count和SHA，不公开其名称/配置。无系统、Docker daemon、DSM、防火墙、Tailscale或旧容器配置修改 |

即时采样app约38MiB、TLS约20MiB；自有目录约92MB，[原始安全摘要](evidence/02b-nas-trial/resource-sample.json)。这是空闲采样，不是性能基准或长期SLA；约1GB只是操作预算，无硬磁盘配额。DSM的Docker PIDs统计报告0，不能解释为无进程或有效PID上限，未为此更改内核/cgroup。

## 真实NAS浏览器验收

客户端为Mac上的真实无头Chromium，经实际LAN HTTPS→TLS代理→正式React/Node→NAS SQLite，无mock身份、时钟、数据服务或课程写入。浏览器显式接受专用测试证书；另用curl --cacert实际验证CA/SAN。没有宣称测试CA已受系统或实体设备信任。

| 检查 | 结果/证据 |
| --- | --- |
| Node24/fs-ext启动、v2/WAL和ready | PASS_NAS，正式镜像实际启动，未降低Node版本或放宽seccomp |
| 孩子真实登录、刷新保留、家长直达拒绝、退出旧cookie失效 | 390/768/1280视口真实NAS检查；精确结果见browser-child.json，不代表实体手机/iPad |
| Cookie与浏览器边界 | Secure/HttpOnly/Strict；JS不可读cookie；LocalStorage/SessionStorage零；实际POST Origin匹配，登录之外写入有CSRF；无外部请求、页面错误、CSP违例或密码console泄露 |
| 家长未解锁 | learnerIds为空、姓名不显示；正式二次密码解锁后只显示合成已授权孩子 |
| 连续操作/后台权限复核 | 实际墙钟>12s，至少2次成功自动复核；DOM/导航/选择按钮/键盘焦点稳定，提升期限不续期；[parent结果](evidence/02b-nas-trial/browser-parent.json) |
| 主动锁定/刷新 | 隐藏孩子元数据；重新解锁后reload又锁定，退出成功 |
| 学习记录 | 浏览器前后11项旧学习表全行规范摘要和计数相同，学习事件/命令回执仍为空；仅认证会话/限流/认证审计变化 |
| Mac Safari、实体手机/Android、实体iPad Safari | NEEDS_USER_ACTION，已给用户LAN地址、本地私密指南和可选公有CA文件；不自动安装证书，不用视口冒充 |
| Tailscale外部路径/公网 | NOT_RUN；不改Tailscale，当前canonical origin仅LAN IP；100.x直连或subnet route可达性未测试，不承诺现有设置自动支持该入口 |
| 本轮SIGKILL/重建/自动重启/备份新卷恢复 | NOT_RUN；本轮是UI合成试用，未重复PR5的真机破坏性gate；merge CI仍保留全套现代Linux回归。真实身份/生产恢复验收另设关卡 |

## 遇到的问题与修复边界

1. 群晖ACL让新mkdir继承0777，即使umask077。正式数据库守卫报`DATA_DIRECTORY_PRIVATE_REQUIRED`，未创建数据库，正确fail closed。核对本次marker后只收紧自有新目录0700/文件0600，旋转未使用测试证书，正式guard未改。[首次安全拒绝](evidence/02b-nas-trial/initial-directory-rejection.json)。
2. Docker20.10在internal桥中，HostConfig有PortBindings但NetworkSettings.Ports为空，实际连接拒绝。仅重建自有TLS代理并增加自有edge桥，app仍内部；controller现在同时检查实际runtime发布，不能以配置字段代替可达。
3. 浏览器探针最初使用了与现有UI不一致的退出/heading选择器、把登录误要求为已有会话CSRF，已按实际合同修正探针，未修改应用。多次真实孩子登录触发5次/15min正式限流，等待自然过期后再验，不清空限流、不绕过认证。
4. PR8增加完整push CI分支时，原R1测试严格匹配旧分支清单，导致[39954705171](https://github.com/lovestream/kevin-learning-home/actions/runs/39954705171)失败；只在同一原测试的期待列表添加试用分支，保留所有main/PR/完整job/禁止skip检查，原60测试不减少。修复后目标测试本地PASS，最终完整CI另核对；不掩盖失败历史。

更多诊断见[bringup notes](evidence/02b-nas-trial/bringup-notes.json)。没有为测试方便重置限流、降低认证、关闭安全guard、提升容器权限或修改NAS配置。

## 保留试用与后续收尾

容器保留运行供用户跨设备验收，restart=no，重启NAS不会自动恢复；试用不是生产常驻。入口、随机临时密码和CA说明只在本地`.trial-private/START-HERE.md`，GitHub不保存密码、CA私钥、server私钥、数据库、raw服务清单、cookie/CSRF值、HAR或trace。

本轮结束后不擅自清掉用户尚需访问的试用。收尾使用`python3 infra/trial/controller.py cleanup --lan-ip <本轮LAN-IP>`，需要相同私有state，逐个核对run label、完整container/image/network ID、marker和root realpath，仅删除本次对象并核对原8个容器一致，不使用prune。controller不会修改未知目录、生产服务或系统信任。仅在用户结束试用后执行；临时CA若用户安装了，由用户删除设备信任。

## 下一步与停止线

数学[复制适配方案](MATH-COPY-ADAPTATION-PLAN.md)已完成冻结/白名单候选/准确差异/接口草案/分批PR及测试门槛；旧数学/英语源码未写入，实际复制文件数0，真实数据未打开。先审查数学方案再开发，英语独立随后，不合并钱包或蛋仔。

长期风险：DSM内核4.4低于Node24官方支持基线；此次真机通过不能变成十年稳定承诺。正式使用前需确认维护/换机路线、真实家庭身份与密钥恢复、持续LAN/Tailscale HTTPS、加密异地备份与新卷恢复、实体设备兼容性和上线/回滚验收。当前短期CA/合成密码不可直接转生产。

本轮不合并PR8、不复制完整课程、不迁Kevin记录、不部署NAS生产、不开始下一阶段开发，交给ChatGPT独立审查。
