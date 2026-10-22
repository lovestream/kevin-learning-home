# IMPLEMENT-02A 证据索引

这里只保存可公开的合成摘要、用例结果与版本信息；不保存SQLite库、单行口令hash、cookie/CSRF、密码、证书私钥或真实学习资料。GitHub短期artifact可含完整安全JUnit、构建日志和截图，长期结论需同时归档本目录。

[Draft PR #6](https://github.com/lovestream/kevin-learning-home/pull/6) 保持Draft。归档实现HEAD `8e7a9bdfb64bb40a31dd08b62366fe5c01eb17a5` 的[PR run 39702101580](https://github.com/lovestream/kevin-learning-home/actions/runs/39702101580)和[push run 39702076108](https://github.com/lovestream/kevin-learning-home/actions/runs/39702076108)均success；最后证据提交的精确HEAD/checks见PR正文，不能把实现父提交代替归档提交验证。

## 来源

- main/PR5 merge：`87ec45e95809d00b7104242702fb28ffbb6f7881`。
- 激活分支：`ea92a968a79a1ba3197fc21e542f86702e0d3dd1`；激活单blob `7794eb8ee76f75dac941b0e14c3901dcaf5842fa`。
- 母任务blob `99bc416a011bc53e43bf346fd328a5faf8c6ce5a`；R1/NAS原文blob分别 `b7e3d384484e5cf15f1d6543ae4b042241d1200d`、`ec2ddde691fe6a04ebf9954feed0911c6078f2de`。
- 冻结001 blob `b23f666a35a753ed78f6a181de449c24cc1d7cd6`；没有改001。

## 文件与复现

`protected-repositories-before.json` / `protected-repositories-after.json` 只记录旧项目HEAD、工作区条目数和Git状态输出的SHA-256，保护原有未提交修改，不读取其真实资料。`local/`归档本地全量结果；`ci/`归档实际GitHub Actions结果、53个用例名称/状态、迁移前后对账、100k健康检查、bootstrap与生产镜像验证摘要。ci/run.json与ci/archived-files.json分别记录run元数据和归档文件hash；生成时写出实际执行SHA及run URL；本地dirty实现运行不得冒充已提交HEAD。首次实现CI与最后证据归档CI分开标记，最终精确提交/checks链接在Draft PR正文。

复现：`npm ci`、`npx playwright install chromium`、`node scripts/verify.ts`。现代Linux CI另执行Compose1.28.5 parser和`npm run test:container`。后者构建临时镜像并测试原30项相关容器断言，另从`tests/auth/container-smoke.ts`验证启用auth的正式入口。所有Docker/测试资源在本机或Actions runner专用临时目录中清理，绝不指向NAS。

本地故障修复历史见[执行报告](../../IMPLEMENT-02A-execution-report.md)；CI失败（若有）必须单独附原run链接和修复原因。真实NAS02A、实体设备UI、生产TLS、真实数据导入均NOT_RUN。
