# Kevin 学习家园：当前交接

2026-10-24。当前分支是 Issue #11 / MATH-01 的独立只读实现，**尚未合并、尚未部署**。main 与 NAS 现有版本不能因为本分支代码完成而被视为已包含数学课堂。

## 当前审查关口：MATH-01

- [Issue #11](https://github.com/lovestream/kevin-learning-home/issues/11)；分支 `codex/math-01-readonly-lesson`，从 main `a40d97495d0065cd4f9ce2e8706372de122f2179` 建立。独立 Draft PR 的精确最终 HEAD、push/PR 两套 CI URL、下载核验结论见 PR 描述；报告与源码同一分支归档。
- [执行报告/A01–A12矩阵/失败与修复/许可](../implementation/MATH-01-EXECUTION-REPORT.md)、[来源→目标hash](../implementation/evidence/math-01/origins.json)、[单课逐字段等价](../implementation/evidence/math-01/public-projection-check.json)、[原仓边界](../implementation/evidence/math-01/source-boundaries.json)。CI 原60 Node/18 UI/原3视口/Docker/Compose保留，新增12 Node/9真实浏览器/flag-on生产镜像回归单列。
- 首课 `G3-U01-B01` / `2026-10-07.2` / `2026-10-09.4` / draft，保持原教学文本/几何；只复制9候选的必要片段与单课公开投影，没有70课/题库/答案/旧API。新GET与页面遵循[合同](../implementation/MATH-01-READONLY-ACCEPTANCE.md)。
- `KLH_MATH_READONLY=1` 必须显式启用且正式auth已配置；默认关闭，英语/钱包不变。孩子绑定session learner，家长二次解锁+实时grant；无测试身份捷径。相机/照片/六步仅组件内存，刷新重置，第六步显示练习尚未接入；11张学习业务表不变，认证必要写入保留。
- MATH-00勘误：BoxCamera原有3处inline color已换math作用域CSS；快速连续箭头用原目标方向驱动控制，防动画旧值丢键，几何不改。原审计历史保留，改动明示于本报告。
- 本轮无NAS连接，无旧仓文件变更、真实账户/记录/备份/.env/inbox/私有词包读取。数学课堂的实体Mac/手机/iPad/Android人工验收 `NOT_RUN`；本机/CI Chromium视口不能替代实体设备。

## 已合并的历史事实

- IMPLEMENT-01/02A/02B 的 PR5/6/7 已合并。正式02B版本 `7790da6c07e118da93d8e3221b20a4fcf78c727f`；[main CI39950875578](https://github.com/lovestream/kevin-learning-home/actions/runs/39950875578) 成功。
- [PR8](https://github.com/lovestream/kevin-learning-home/pull/8) NAS合成隔离试用/工具已审查合并 `8b99528dbbfca186770f629007225903a89b2875`。用户2026-10-23反馈手机/iPad实体访问和登录成功；这是旧02B登录反馈，不是数学课程或生产上线验收。详见[试用报告](../implementation/IMPLEMENT-02B-NAS-TRIAL.md)。
- MATH-00 [PR10](https://github.com/lovestream/kevin-learning-home/pull/10) 审查通过合并 `6864de8779953348c031faafdd18571447c38e0c`，[Issue9](https://github.com/lovestream/kevin-learning-home/issues/9)已关闭。133来源/273依赖/9候选、70 draft、12审计测试归档；[独立审查评论](https://github.com/lovestream/kevin-learning-home/pull/10#issuecomment-6378456178)。该阶段未复制课程；本分支首次实现单课只读。
- 基线 main 的merge CI [40052074154](https://github.com/lovestream/kevin-learning-home/actions/runs/40052074154)、文档CI [40052148061](https://github.com/lovestream/kevin-learning-home/actions/runs/40052148061)与[40052150824](https://github.com/lovestream/kevin-learning-home/actions/runs/40052150824)均已核实成功。

## 严格停止线

提交 Draft PR、确认最终HEAD双事件完整CI与artifact后暂停，等待ChatGPT独立审查；不合并、不自动关闭Issue11、不进入MATH-02/03或英语适配、不启用阅读保存/练习/钱包/蛋仔、不迁真实身份/记录。

NAS现有试用仍为02B且 `restart=no`，不得清理/重建/覆盖、改旧8容器、端口、DSM/Docker/Tailscale/sudoers或7天CA。后续课程试用需另获授权及实体设备验收。真实家庭使用尚需受信持续HTTPS、生产身份、加密异地备份/新卷恢复、上线回滚、外部Tailscale及Node24/DSM Linux4.4长期支持评估；不以降低TLS检查绕过。
