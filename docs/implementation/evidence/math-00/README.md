# MATH-00来源审计证据

- [source-inventory.json](source-inventory.json)：133项固定Git blob的SHA256、allow/adapt/exclude、每项用途/目标/许可、MATH-01 selector、273依赖边、原17基线、70课元数据与首课taskId/隐藏字段路径。无课程正文/正式答案值或源码文件拷贝。
- [readonly-contract.json](readonly-contract.json)：下一阶段的严格DTO字段、权限、错误、hash定义、inline SVG/CSP、只读范围。status=PROPOSED_MATH01_NOT_IMPLEMENTED，不能当成现存API。
- [source-boundaries.json](source-boundaries.json)：数学/英语HEAD与工作区status指纹前后一致；英语只读状态、blob读取0，原未跟踪文件保留。无真实数据读取、NAS访问或旧构建执行。
- [local-checks.json](local-checks.json)：本机生成/离线一致性检查、12项审计测试、原workflow约束目标测试结果；完整60/18/3/Docker/Compose由精确HEAD的两套Actions证据与Draft PR正文定位。

[执行报告](../../MATH-00-EXECUTION-REPORT.md)、[来源审计与逐文件表](../../MATH-00-SOURCE-AUDIT.md)与[下一轮只读验收任务书](../../MATH-01-READONLY-ACCEPTANCE.md)提供人工审查结论。

重生成只能指向已有冻结math-learning仓库：`python3 scripts/math-audit/generate.py --source-repo <local-path>`；HEAD不同立即失败，绝不自动checkout/取最新或运行旧生成器。它只输出元数据。随后重核文档中hash与逐文件表，不以更新证据掩盖新增来源。CI只执行`python3 scripts/math-audit/check.py`和`python3 -m unittest discover -s tests/math-audit -p 'test_*.py'`，不下载旧repo、不SSH NAS。
