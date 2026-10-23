# Kevin Learning Home · 项目当前状态

> 更新日期：2026-10-23。**此文件位于 GitHub 默认分支 `main`，用于快速定位项目真实进度。**  
> 任何审查结果/任务书都应从本页或默认分支README能直达，不应只藏在`chatgpt/...`孤立分支里。所有历史报告保留原有时间口径。

## 现在究竟在哪里

| 工作 | 状态 | 直接入口 |
| --- | --- | --- |
| IMPLEMENT-01 工程底座：React/Node/SQLite/Docker | **已合并 main** | [PR #5](https://github.com/lovestream/kevin-learning-home/pull/5) |
| IMPLEMENT-02A 身份安全、家长授权、SQLite v2 | **已合并 main；主分支合并后CI成功** | [PR #6](https://github.com/lovestream/kevin-learning-home/pull/6) · [main CI](https://github.com/lovestream/kevin-learning-home/actions/runs/39765830063) |
| IMPLEMENT-02B 真实登录网页、孩子首页、家长中心、学科空入口 | **Draft PR #7：代码已完成/R1复审通过，但未合并 main** | [PR #7](https://github.com/lovestream/kevin-learning-home/pull/7) · [网页代码](https://github.com/lovestream/kevin-learning-home/tree/codex/implement-02b-shell/apps/web/src) |
| 02B 审查 | **验收通过，等用户决定是否合并 PR #7** | [独立复审验收报告](docs/reviews/KLH-IMPLEMENT-02B-R1-ACCEPTANCE.md) |
| 数学70课、英语Word Quest真实课程 | **尚未复制或整合** | [math-learning](https://github.com/lovestream/math-learning) · [word-request](https://github.com/lovestream/word-request) |
| NAS生产部署与真实学习记录 | **没有进行** | 不应将现代Linux CI或旧NAS原型当成正式上线 |

### 为什么打开 main 看不到02B的网页？

GitHub默认显示`main`；当前`main`已经有工程底座与02A，但**还没有合并PR #7的React新界面**。PR #7 的代码、截图和交接在`codex/implement-02b-shell`分支，具体入口：

- [02B网页源代码](https://github.com/lovestream/kevin-learning-home/tree/codex/implement-02b-shell/apps/web/src)
- [02B执行报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02b-shell/docs/implementation/IMPLEMENT-02B-execution-report.md)
- [R1整改报告](https://github.com/lovestream/kevin-learning-home/blob/codex/implement-02b-shell/docs/implementation/IMPLEMENT-02B-review-R1.md)
- [最终CI #39875247271](https://github.com/lovestream/kevin-learning-home/actions/runs/39875247271)：`f179b895`，Node60/60、真实界面18/18、原3视口、Docker/Compose，现代Linux成功
- [GitHub PR #7 Files](https://github.com/lovestream/kevin-learning-home/pull/7/files)：查看哪些内容待合并

**注意：GitHub里的代码和截图并不等于已在NAS启动可访问网站。** 当前仍没有正式部署；数学英语旧站保持独立。

## 下一步应该怎么做

1. **等待用户明确批准合并 PR #7**。批准后重新验证PR HEAD `f179b895dfdb0d7c2c1961832d813be8d91724d2`及当前main、两次CI和mergeability，Draft→Ready，正常GitHub合并；不得顺带合并其他实验PR。
2. **核对实际合并后的main完整CI**（事件`push`、分支`main`、SHA必须是新合并提交）成功，再确认02B结项；这一步可能需要解决README历史说明合并冲突，但不能丢失任何运行代码或审查记录。
3. **接下来分开处理两条任务线**：
   - 平台可运行验证：在经用户单独批准的DS918+隔离Docker和合成家庭身份上，验证真实网页、认证/HTTPS/权限、Mac/iPad体验、备份恢复。不触碰旧站和真实学习数据。
   - 学科迁移规划：分别冻结`math-learning`和`word-request`的源码版本，制定**复制后独立适配**方案，优先单科试点，旧站始终独立运行；无用户批准前不迁入完整课程或真实数据。
4. 真正让Kevin使用之前，另做密钥管理、HTTPS、长期加密异地备份与恢复验收、正式家长身份初始化与权限确认；不要用演示身份替代真实账号。

## 文档维护约定

- 每次代码PR完成后，先独立复审；获得用户明确的合并授权才合并，并验证合并后的`main` CI。
- 每次阶段结项后，同步更新**默认分支的README和本文件**，链接到PR、执行报告、源代码与验收结论；不能让默认README长期停在旧阶段。
- 开发分支的历史报告保留在原PR，独立审查报告同时归档`docs/reviews/`（默认分支），不重复在GitHub创建大量孤立的“已完成”分支。
- 所有测试、NAS行为与旧项目边界要准确描述`PASS_CI / PASS_NAS / NOT_RUN`，不能只因PR绿灯就宣称系统已经上线。
