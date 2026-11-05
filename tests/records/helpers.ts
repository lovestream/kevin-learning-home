import { mkdtempSync,rmSync,realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { RecordsDatabase } from "../../packages/records/database.ts";
import { PrivateRecords } from "../../packages/records/service.ts";
process.env.NODE_ENV="test";
export const PASSWORD="Synthetic test parent phrase 2026!";
export async function fixture() {
  const root=realpathSync(mkdtempSync(join(tmpdir(),"klh-records-synthetic-"))),store=new RecordsDatabase(join(root,"records"),true),records=new PrivateRecords(store);
  const ids=await records.access.setup("synthetic-parent",PASSWORD,"合成学习者"),parentCookie=await records.access.login("synthetic-parent",PASSWORD,"fixture"),parent=records.access.session(parentCookie.cookie),childCookie=records.access.enroll(parent,ids.learnerId),child=records.access.session(childCookie.cookie);
  return {root,store,records,...ids,parent,parentCookie,child,childCookie,create:(question="合成问题：纸桥怎样改变？")=>records.create(child,ids.learnerId,{requestId:randomUUID(),projectId:randomUUID(),question,origin:"child",subjectRefs:[]}),close:()=>{store.close();rmSync(root,{recursive:true,force:true});}};
}
