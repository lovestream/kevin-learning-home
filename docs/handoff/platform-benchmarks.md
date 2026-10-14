# 平台验证交接（2026-10-14）

## 入口与停止状态

共享 [PR #2](https://github.com/lovestream/kevin-learning-home/pull/2)；Cloudflare [PR #3](https://github.com/lovestream/kevin-learning-home/pull/3)；Node/NAS [PR #4](https://github.com/lovestream/kevin-learning-home/pull/4)。三个草稿不合并，完成验证后等待ChatGPT独立审查；不进入正式开发/PR-1B、生产部署、真实数据导入或钱包合并。

[横向决策](../benchmarks/BENCH-03-side-by-side-decision.md)、[冻结共同协议](../benchmarks/BENCH-00-common-protocol.md)、[精确基准parity JSON](../benchmarks/results/shared/baseline-parity.json)为起点。两路线材料在各自PR分支，均以共享契约为基线；`docs/handoff/current.md`及PR #1保持原样。

Cloudflare本地：原算法、P01–P12、真实浏览器、直传/私有媒体、逻辑/物理本地恢复、2.1MB分片、S/M三轮负载通过。远端Worker/D1/R2/Access、CPU10ms、真实计费/复制/网络为BLOCKED_APPROVAL，无资源创建或订阅。

Node：相同Mac测试通过，现代Linux CI及非root容器删除重建持久化通过。NAS已获本次一个隔离容器、专用合成目录、1CPU/512MiB、回环端口和Docker专用sudo授权。SSH型号/内核/文件系统/权限已核实；交互Docker Server检查成功。原Docker Hub拉取EOF，已用CI官方amd64 Node24.15.0镜像归档进行SHA/tag/arch校验并传入本次目录，等待交互sudo启动；不改NAS网络、Docker权限、DSM/Tailscale或现有服务。

## 固定来源

任务三份来源branch SHA `086139adddcf3027a8ba4d128e9ac8ea86d92ccb`；main `46687ba370ca7e47764e500641bc371e2c0d4727`；PR1证据 `98d22980c2b0d984fde7f7d507ca98173001beb4`；未批准RFC `e76e92298057a083a373a15dd7ac24d48ca34e36`。

Math `8e9115442b3978eee0d4821750ce04f47954bd26`；WordQuest `d0b42a8872a7e87433b96770519203630223b6f2`。源源码锁、fixture/schema/contract摘要均在tests/platform-parity；未修改旧仓库或读取真实DB/.wordquest记录。源算法原始文件与抽取文本保持锁定；新adapter的会话/receipt/reward策略单独声明。

## 审查问题

1. 选定核心源算法与新增adapter语义是否足够保真，哪些原课题型/家长批阅还需追加？
2. 有界在线projection/不可变事件/冷归档是否满足10年以上增长？D1单库预算与跨库receipt路由如何审查？
3. 用户先关注几GB自用还是远期10TB素材？免费、对象存储/备份、硬件/电费与运维时间应分别计算。
4. 许可范围内NAS真机的结果与unsupported kernel风险是否支持直接计算，或选现代Linux计算＋NAS备份？
5. 真云后续许可和最小身份/媒体权限门槛如何定义？尚无正式部署许可。

各路线交接文档保存code/test SHA和CI证据。分支HEAD会因文档归档变化；测试实际SHA不可改写成后来HEAD。最新提交CI检查以GitHub PR checks为准，最终证据索引补齐后暂停。
