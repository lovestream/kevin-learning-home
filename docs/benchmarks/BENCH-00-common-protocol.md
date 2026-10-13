# BENCH-00 共用比较协议与冻结基线

任务来源分支SHA `086139adddcf3027a8ba4d128e9ac8ea86d92ccb`；main基准 `46687ba370ca7e47764e500641bc371e2c0d4727`；PR1已有证据SHA `98d22980c2b0d984fde7f7d507ca98173001beb4`；未批准架构RFC来源SHA `e76e92298057a083a373a15dd7ac24d48ca34e36`。原三任务逐字节复制到docs/tasks，RFC只是参照，不成为已接受ADR。

先冻结[测试契约](../../tests/platform-parity/contract-v1.md)、[合成fixture](../../tests/platform-parity/fixture-v1.json)、[请求schema](../../tests/platform-parity/schema-v1.json)、[来源源码锁](../../tests/platform-parity/source-lock.json)、[夹具摘要](../../tests/platform-parity/fixture-lock.json)。两路线从同一冻结shared分支派生，分别独立PR，均不覆盖PR1。

遵守原任务P01-P16、S/M/L与三轮公平性。最小数学题与英语单词为合成内容，数学18个依赖源码字节不改，英语10个函数文本不改。仅验证所调用核心行为，未声称全部旧app迁移，完整课程/浏览器回归仍是正式迁移门槛。所有记录虚构；旧仓库仅git show冻结源码，没有旧服务启动/真实数据库读取。

实际限制：Cloudflare只本地D1模拟，远端BLOCKED_APPROVAL；NAS按用户最新安排延后，既有权限证据单独引用，不重新索取SSH密码。Node本机与现代LinuxCI先完成。真实CPU额度、网络/复制/R2/NAS服务和断电不能用localhost替代。

实验预算：本机仅少量合成对象总约6.1MiB；M档100000事件/100000媒体引用本地生成，L档只模型；每侧每负载档三轮，各并发2/50/100，200请求/轮+20预热； correctness的100次并发独立另计。GitHubCI仅测试同样合成数据，无部署步骤/云凭据。

来源与断言变更必须版本化、说明原因并重跑双方。适配HTTP、会话、SQL和对象mock代码是实验新实现，不借其通过声称原课程/真实迁移已完成。云资源、NAS新服务和生产开发均不在当前写入范围。
