# Kevin Learning Home · Kevin 学习家园

**[打开 NAS 学习家园](http://192.168.2.100:38444/)**：局域网 HTTP、免登录，无需证书或 Mac 本地服务器。数学目录有上册 9 单元/39 课、下册 8 单元/24 课和 7 衔接课；每课第六步“自己验证”可进入全量 849 道练习。

当前 NAS 源码 `d835f8c7fbd5a341cc30cf44dea5c6dc62f65d12`，精确源码完整 push / PR CI 成功。实际 NAS 全 849 终答、三视口/84 练习流程、30/210 课堂、教材导航及回退恢复均通过。178 个发布输入及 11 静态 seal 与测试构建一致。11 个受保护容器和旧合成文件 hash 不变；不影响原 38443、8 服务和真实数据。

首答→三项自查→终答→提示/订正，335 解释题始终待家长核对。体验只留页面内存，刷新清空；没有真实账号、成绩、积分或蛋仔。实体手机/iPad及本轮普通 Chrome 实操待用户，不把三视口自动化称为实体设备验收。Mac 原 `/Users/yako/Documents/Kevin-Learning-Home-Trial/` 快捷方式仍指向同一入口，无需新增项目文件夹。

[Draft PR #21](https://github.com/lovestream/kevin-learning-home/pull/21) 叠加 [Draft PR #18](https://github.com/lovestream/kevin-learning-home/pull/18) 的稳定 R3，两个 PR 均不合并。按用户最新指令，练习验收后直接继续 Issue #17 的其他现成数学能力；它们尚未部署，不能称整个数学网站完成。英语与统一积分/蛋仔另属后续授权阶段。

## 复现与证据

Node 24.15.0 / npm 11.12.1：`npm ci`，`npm run build:math-preview`，`npm run preview:math`；本机 http://127.0.0.1:4179/ 仅用于开发复现，用户交付是 NAS。

- [849 题报告、接口、来源与 NAS 验收](docs/implementation/MATH-FULL-02-REPORT.md)
- [849 逐题矩阵](docs/implementation/evidence/math-full-02/tasks-coverage.json) · [NAS 回执](docs/implementation/evidence/math-full-02/delivery.json)
- [R3 课本目录历史报告](docs/implementation/MATH-FULL-01-NAS-R3-REPORT.md)
- [项目状态](PROJECT_STATUS.md) · [当前交接](docs/handoff/current.md) · [统一路线图](docs/implementation/KEVIN-HOME-INTEGRATION-ROADMAP.md)

`node scripts/verify.ts` 保留 60 Node / 18 UI / 12 数学 Node / 9 数学浏览器；CI 同时执行 Docker/Compose/恢复。新增来源哈希、严格 schema、全量确定/人审 golden、真实 HTTP、三视口练习与原 30/210 课堂门禁，命令见练习报告。最终归档 HEAD 双 CI 单独记在 PR 正文，不能把旧 SHA 成功当成新 HEAD 成功。

原数学和英语项目完全独立，所有复用只在新学习家园副本修改；不导入真实学习记录，不自行合并 Draft。
