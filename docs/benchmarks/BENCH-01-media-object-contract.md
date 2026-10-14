# BENCH-01 薄媒体契约、权限与可恢复性

课程只引用 `{assetId, version}`。MediaAsset记录assetId/version、SHA256、sizeBytes、mimeType、visibility、可选synthetic learner、storageRef(providerAlias/objectKey)、sourceLicense；只在gateway的provider映射解析URL，不把NAS路径或供应商域名放入题库。未导入任何私人素材。

## 已实现及边界

公开资源为synthetic-generated，GET对象使用版本化immutable缓存；API元数据为private缓存，learning/session返回no-store。私有资源必须匹配server session learner，直接猜URL、其他learner、错误Origin/Referer被拒绝，合法访问返回no-store。缓存Vary Cookie/Origin，浏览器跨端口credentials+CORS实际测试通过。

当前provider是**本地对象mock**，模拟HMAC签名60秒、独立对象进程、流式PUT、配置切换。它不是S3协议服务器，不实现R2 binding、真实multipart、云端CORS/ACL、跨区域复制或CDN缓存。签名地址没有保存到Git，私钥每次生成并只在本地权限受限配置中使用。local-a→local-b后课程JSON完全相同，下载hash相同；这个结果只证明provider接口解耦，不是跨云迁移完成。

公开32KiB PNG、私有1MiB WAV、公开5MiB二进制由脚本生成；另浏览器直传1MiB数据。browser先获取parent-only upload-intent，再直接PUT到对象mock，最后发元数据commit；学习服务不接收素材主体。签名绑定大小/hash/mime/learner/method/expiry；上传验证大小、SHA和PNG/WAV魔数；commit再次检查上传owner、mime和hash。故障不会写入错误manifest，但本PoC的commit尚未做幂等发布/垃圾回收，失败重试及并发发布仍需正式实现。

私有mock额外要求应用cookie。真正R2/S3裸预签URL是bearer能力；拿到未过期URL的人可能下载，**不能沿用mock的“其他cookie拒绝”结果**。生产私有材料建议由应用MediaGateway验证身份后流式读取R2或受控signed能力，短TTL、no-store、日志脱敏、对象owner审计；需要在受许可的真实服务上测过期、盗链、撤销与缓存反例。大文件使用直传/multipart，限制chunk、并发和配额，不在Worker把GB素材arrayBuffer到内存。

课程发布为parent-only数据写入新version，原version不覆盖；无需重部署app。PoC只有version选择API，尚无完整编辑器、发布审计、版本垃圾回收或生产回滚界面。未启用统一奖励池。

## 导出与恢复

逻辑档案保存九张业务表JSONL、对象文件及count/SHA/size清单。新空库按依赖顺序导入，逐表哈希和所有对象比对；缺对象、被篡改备份、错误mime均可检测。无真实session/密码/token导出；本地测试对象metadata仅包含虚构learner和mime。物理Miniflare目录快照是模拟器检查点，**不是云D1备份**。真正D1需受许可执行标准SQL export/import并检查约束、row数、revision和receipt；[官方导入导出文档](https://developers.cloudflare.com/d1/best-practices/import-export-data/)与Time Travel应分别使用，不能把同供应商短期回滚窗口当作异地备份。

未来跨provider迁移：生成对象清单→按hash复制到新provider→读取校验mime/size/SHA→只更改gateway映射→保留旧provider只读回退→新空环境恢复演练后才清理旧副本。10TB只做清单/成本模型；没有实际上传。未测S3交互与跨云恢复，是独立验收门槛。
