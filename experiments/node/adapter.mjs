import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export class SQLiteAdapter {
  constructor(file){this.raw=new DatabaseSync(file);this.raw.exec(readFileSync(new URL('../shared/schema.sql',import.meta.url),'utf8'));this.raw.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');this.stats={queries:0,rowsReturned:0,rowsChanged:0,wallMs:0};}
  statement(sql,args=[]){this.stats.queries++;const stmt=this.raw.prepare(sql);if(stmt.columns().length){const rows=stmt.all(...args);this.stats.rowsReturned+=rows.length;return {results:rows,meta:{rowsReturned:rows.length}};}const result=stmt.run(...args);this.stats.rowsChanged+=Number(result.changes);return {results:[],meta:{rowsChanged:Number(result.changes)}};}
  async first(sql,args=[]){return this.statement(sql,args).results[0]??null;}
  async all(sql,args=[]){return this.statement(sql,args).results;}
  async run(sql,args=[]){return this.statement(sql,args);}
  async batch(items){this.raw.exec('BEGIN IMMEDIATE');try{const results=items.map(([sql,args])=>this.statement(sql,args));this.raw.exec('COMMIT');return results;}catch(e){this.raw.exec('ROLLBACK');throw e;}}
  recordWall(ms){this.stats.wallMs+=ms;}
  environment(){return {sqliteVersion:this.raw.prepare('SELECT sqlite_version() v').get().v,pragmas:Object.fromEntries(['journal_mode','synchronous','foreign_keys','busy_timeout'].map(k=>[k,Object.values(this.raw.prepare('PRAGMA '+k).get())[0]]))};}
  backup(file){this.raw.prepare('VACUUM INTO ?').run(file);}
  close(){this.raw.close();}
}
