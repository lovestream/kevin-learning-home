# HOME-01 实际执行证据

`source.json`是实际NAS运行源码，`source-ci.json`是该源码的两套完整CI；最终文档HEAD的完整双CI链接在PR36正文。`completion.json`、`runtime.json`和所有nas路径来自真实NAS；local与experience-local为开发期本地结果。手机/iPad实体设备没有操作，不据此标人工验收成功。

`manifest.json`列出归档文件hash。所有材料均为公开内容/合成测试，不含私密控制器状态、SSH材料、认证凭据或真实记录。

## 运行器来源

`harness/download-release.py`原路径`.evidence/math-onepass/download-release.py`，只下载此仓库指定提交的Actions镜像并验证大小/hash；临时认证值与签名URL不输出、不归档。

- `harness/publish.py`原路径`.evidence/home/publish.py`；它在源码双CI成功、精确HEAD和干净工作区后才使用既有`infra/math-preview/release.py`发布，失败自动回退。
- `harness/nas-math-regression.py`原路径`.evidence/home/nas-math-regression.py`，调用仓库内的13组脚本和先行checkpoint，共14组，使用两个独立浏览器客户端。
- `harness/probe-primary.mjs`与`probe-library.mjs`原路径分别是`.evidence/math-onepass/`内同名文件；保留实际执行字节。其相对import按原路径解析，复现时须先恢复该位置。二者只针对既定NAS38444和明确的`KLH_PREVIEW_EXPECT_SHA`，使用安装库内的合成答案，对照逐题HTTP结果，不接触数据库。

仅复制脚本不能代替部署授权；不要直接在别的HEAD重放发布器。NAS回归可在确认目标版本后，从仓库根目录、恢复两个探针原路径，再运行归档的回归器并显式传入源码SHA。打印检查依赖Mac本地pdftotext路径。源脚本、目标、参数、结果与限制均保留，未以新写结果替换实际回执。
