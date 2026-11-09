import { RecordsDatabase } from "../../packages/records/database.ts";
const [root,phase]=process.argv.slice(2),db=new RecordsDatabase(root,true);
if(phase==="uncommitted")db.transaction(()=>{db.audit("synthetic_uncommitted");process.stdout.write("UNCOMMITTED\n");Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000);});
else{db.transaction(()=>db.audit("synthetic_committed"));process.stdout.write("COMMITTED\n");setInterval(()=>{},1000);}
