# NAS公开合成验收证据

所有问题、回答、作品说明均为人工测试fixture，不是儿童真实资料。35截图来自实际NAS的五种视口；它们不等于实体iPad/Safari人工验收。私有记录、图片/语音、家长报告与账户尚未启用。

`release-inputs.json`记录运行源码文件hash，后续文档提交不能悄然改变运行输入；`test-harnesses.json`记录真实执行代码。源码CI与最终文档HEAD的CI区分，后者以PR35检查及正文为准，避免追加CI编号又触发无限新提交。

重跑`tests/explore/browser.mjs --nas`前设置`KLH_PREVIEW_TEST_ORIGIN=http://192.168.2.100:38444`及精确`KLH_PREVIEW_EXPECT_SHA`；未知SHA直接拒绝。所有写请求限既有匿名合成评分/页内capability，不读写真实资料。

`harnesses`中的两份补充旧题HTTP探针按`test-harnesses.json`原路径（.evidence/math-onepass/probe-primary.mjs与probe-library.mjs）恢复可复现；其余测试在仓库tests下。`nas-math-regression.py`是完整执行清单的逐字节副本，不是执行了NAS部署的脚本。

`image.json`为CI镜像公开元数据，没有SSH密钥、token、配置环境或儿童记录。日志只含合成验收结果。
