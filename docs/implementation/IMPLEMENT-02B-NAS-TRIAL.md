# 02B 合并与 NAS 局域网隔离试运行

2026-10-23。用户已授权合并PR7，随后按顺序进行NAS合成账户试运行、数学复制适配规划、英语规划；正式身份/HTTPS/加密备份/上线验收另设关卡。用户明确仅需局域网，外网沿用自己的Tailscale；本轮不配置公网或修改Tailscale。

## 已完成的合并关卡

[PR7](https://github.com/lovestream/kevin-learning-home/pull/7)已合并，实际main merge SHA `7790da6c07e118da93d8e3221b20a4fcf78c727f`；真正event=push、branch=main的[CI39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578) completed/success，不用PR上的绿灯代替。合并前main额外三条提交仅补PROJECT_STATUS/README/独立验收报告，合并树相对f179b89没有新的应用代码。正常merge保留原提交历史。

PROJECT_STATUS原有“未合并”文字已过时；阶段收尾会同步更新默认分支状态，不改写历史审查的当时时点。

## 已授权的具体隔离范围

- 新资源名前缀、精确源码及主分支CI见[plan.json](../../infra/trial/plan.json)。在只读确认的admin本地ext4可写父目录中创建全新同名目录与owner-marker，不复用旧BENCH/NAS GATE或学习目录。
- 专用正式app镜像：从已经合并的7790da6、原样Dockerfile/lock构建linux/amd64；GitHub Actions仅构建/输出带hash的临时artifact，不连接NAS、不推registry、不打包合成账号或证书。
- 一个正式app容器和一个试运行TLS代理容器，非root UID、read-only rootfs、cap-drop ALL/no-new-privileges、专用internal Docker网络；app无宿主HTTP端口。仅代理发布一个NAS局域网IP的HTTPS端口；无公网绑定/防火墙改动。单逻辑CPU，app512MiB、proxy128MiB；restart=no，不作为生产常驻部署。
- 数据/media/content都是专用空目录；真实学习记录、原网站挂载、docker.sock与宿主PID/network均不挂入。镜像/归档与小型合成库约束在约1GB预期占用内，此为操作预算，不虚称文件系统硬配额。
- 使用正式离线`auth-admin.ts --synthetic`初始化虚构家长/孩子，真实登录接口和Secure/HttpOnly/SameSite=Strict Cookie保持原样；临时登录凭据、私钥只留本地/NAS的私有目录，绝不提交GitHub。
- 局域网测试仍需TLS；专用短期自签测试证书，不读取或复用DSM/旧站正式私钥，不安装系统/设备信任或配置真实域名。自动化可显式接受该测试证书；真实Safari/iPad是否信任、能否登录必须由设备实际操作验证，不能由视口截图冒充。
- 前后比较既有8个容器完整ID、状态、启动时间和重启计数；私有原始清单本地留存，GitHub只留一致性摘要。任何清理仅针对run marker/label和精确ID，不global prune、不删除现有镜像或目录。

## 当前进度与限制

只读检查：DS918+、Linux4.4.180+、Docker20.10.3、Compose1.28.5，专用父目录在本地ext4、可写、剩余空间充足；Docker-only sudo现有认证正常。没有修改DSM、sudoers、Docker daemon或旧容器。

试运行入口/测试结果与精确image ID将在实际部署后补充。最新02A/02B尚未在NAS执行；原PR5真机通过不代替本次。Linux4.4低于Node24官方支持内核基线的风险继续保留，不升级系统或放宽安全策略掩盖风险。

Mac真实浏览器、手机和iPad分别记录PASS_NAS/NEEDS_USER_ACTION/NOT_RUN；用户需要在实体设备打开局域网地址并完成登录，不能以Chromium390/768视口冒充实体Safari。网站只包含学习家园外壳，数学/英语尚未迁入，原站继续独立。NAS验收完成后先制定数学冻结复制适配方案，不修改旧仓库或开始完整课程迁移。
