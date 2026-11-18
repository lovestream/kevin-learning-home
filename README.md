# Kevin Learning Home · Kevin 学习家园

**[打开本机学习家园](http://127.0.0.1:38444/)**。2026-11-18起按用户要求直接在这台 Mac 后台运行，不再依赖 NAS。关闭终端或浏览器不会停止服务；Mac 关机或休眠时不能访问。

- 数学：三年级70个课堂入口、六步课堂与三项自查、849道正式练习、已审思维卡、数学小侦探和方法工具箱。
- 英语：四库6631词卡/665组、128教材练习页、发音与拼写、考试冲刺、本次生词本和本机机器人PK。
- **当前是匿名体验，记录只在本次页面会话中保留，刷新/离开/重启会结束会话。**未启用真实学习库、统一积分或蛋仔成长；没有导入或更改 Kevin 的历史学习数据。

## 本机启动

在项目目录双击 **`启动学习家园.command`**，会启动后台并打开网页。停止使用 **`停止学习家园.command`**；停止不会删除课程或旧学习库。后台由当前用户的 macOS LaunchAgent 管理，启动后下次登录也会运行；执行停止后不会自行重启。

```sh
node scripts/local/service.mjs start
node scripts/local/service.mjs status
node scripts/local/service.mjs restart
node scripts/local/service.mjs stop
```

首次安装需 Node24.15.0/npm11.12.1、`npm ci` 和经校验的本机 `.english-family` 素材包。启动器在需要时执行 `build:math-preview`，不会连接 NAS 或读取旧学习库。更新后应先结束本次练习，再执行 `restart`。详见[本机运行说明与验收](docs/implementation/LOCAL-RUN.md)。

仍在同一 [Draft PR38](https://github.com/lovestream/kevin-learning-home/pull/38) 中开发，未合并 main。历史 NAS 回执只证明当时的版本，不能代表当前本机运行状态。[最新交接](docs/handoff/current.md) · [交付队列](docs/implementation/LEARNING-HOME-DELIVERY-QUEUE.md) · [英语模块台账](docs/english/MODULE-MATRIX.md)。
