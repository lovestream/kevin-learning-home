# IMPLEMENT-01 一致性备份与空环境恢复

## 冻结边界与检查点

本轮选择**离线维护**，不是伪在线全站备份。应用停止并释放单writer锁后，维护工具取得同一把锁；所有合作写入方及外部媒体/内容发布必须停止。已发布对象版本不可变，禁止管理员在备份时手动替换同key文件。

流程：校验DB/FK/媒体内容→SQLite `VACUUM INTO`独立快照（不复制活动WAL主库）→64KiB块复制媒体→复制版本化内容manifest→记录schema/app/node版本、逐文件SHA256/size和11表count/hash→再次校验源内容→fsync文件/目录→同父目录rename发布。任一步失败删除未发布staging；旧命名备份不覆盖、不写success。不能备份进源data/media/content树。锁占用明确失败，不绕过活跃服务。

检查点包含learning.sqlite、media/、content/和manifest.json；DB只有元数据，不含媒体BLOB。manifest含sourceLicense/visibility的版本记录，无凭证或私密URL。配置模板、镜像digest、私有运行配置与密钥的另行保密保全需真实上线前制定，不能将当前无身份的合成备份当真实个人数据安全方案。

```sh
# 针对本PR自己生成的合成root，先停app。
node scripts/maintenance.ts backup --root .foundation-work/synthetic-only --out .foundation-work/checkpoints/sample-01
node scripts/maintenance.ts restore --from .foundation-work/checkpoints/sample-01 --to .foundation-work/restored-host
```

恢复目标必须不存在；不允许覆盖现有空目录或现有服务。先在新临时目录创建data/media/content；限制清单路径、拒绝软链接/路径穿越；分块复制时逐文件核SHA/size；验证schema checksum/shape、FK、SQLite quick_check、媒体/课程manifest；逐表counts/hash、revision、原event/receipt比较后才rename发布。失败保留源备份与原服务，删除未发布恢复目录。恢复后用同版本app配置新root，验证ready再决定是否切入口；本轮只在Mac/现代Linux CI合成环境演练。

## 实测与边界

测试生成1个合成learner、1个禁用demo科目、1条命令事件/receipt、1个38字节text/plain合成对象及版本课程manifest。实际大小、11表count/hash及时间见 [恢复JSON](evidence/local-recovery.json)；CI原件另见Actions artifact。两条新环境恢复、再次请求原commandId返回原receipt，hash一致；媒体/DB损坏、非法manifest路径、备份发布前故障与目标存在均被拒绝；原备份不变。Linux CI另用同一镜像从恢复目录启动健康检查。

这里不包含Kevin真实学习记录、原课程数据库、家庭媒体、cookie/PIN、统一钱包或密钥。没有验证M/L规模灾备、十TB复制、断电/坏盘、异地传输，也没设置定时任务/云上传。SHA用于完整性校验，不等于防恶意替换的签名或加密；真实备份需独立可信清单/加密与访问控制。

## 换NAS/换Linux主机runbook

1. 获授权后停旧app写入，记录reviewed app tag/digest、linux/amd64、Node/schema版本与私有环境配置；创建完整checkpoint并核hash。保留原机原数据不动。
2. 新主机先只读preflight，再为新data/media/content/backup目录与非root UID/GID申请部署授权。SQLite仅本地FS；media与content独立volume，当前app只读挂载。
3. 将同一镜像和检查点安全拷到新机；在新目录恢复，复核文件与表摘要，恢复后用新UID/GID访问检查（不自动chown未知目录）。
4. 同一Compose配置换路径变量/镜像引用/允许端口；ready、占位导航、403禁用接口和备份复验通过后，才在独立许可下更新未来HTTPS入口。
5. 不成功就停止新app，保留旧机/checkpoint；不将不兼容新schema降级打开，不将恢复失败覆盖原库。切换产生新数据后回退必须先保全新事件，不能简单丢弃。

不改变subjectId/assetId/contentVersion，也不改未来学科代码。Android/ARM尚未验证，不能承诺直接运行此amd64镜像。RPO为最后完整checkpoint，RTO需按设备/数据量实测，当前没有生产SLA。

## 异常退出与未来备份计划

正常SIGTERM停止会释放writer锁；SIGKILL/掉电可能留下锁，启动明确失败。管理员须确认原进程、容器、挂载均已停止，才可在新备份后单独处理陈旧锁；工具不会根据PID猜测并删除。Linux CI本轮仅验证正常容器停止/删除重建，不冒充突然断电自动恢复。

未来上线前提出NAS之外的一份独立加密备份、介质/频率/保留期限、定期空机恢复与责任人；跨服务商存储与费用先审查。本轮未开启实际计划任务、七牛/R2/S3备份或MinIO。
