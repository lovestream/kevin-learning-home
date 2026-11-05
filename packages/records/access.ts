import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError, sha256 } from "../contracts/index.ts";
import { hashPassword, verifyPassword, type PasswordRecord } from "../auth/password.ts";
import type { RecordsDatabase } from "./database.ts";
import type { Principal } from "./contracts.ts";
const token=()=>randomBytes(32).toString("base64url");
export class FamilyAccess {
  readonly store:RecordsDatabase;
  readonly now:()=>number;
  constructor(store:RecordsDatabase, now:()=>number=Date.now) {this.store=store;this.now=now;}
  async setup(login:string,password:string,label:string) {
    if(!/^[a-zA-Z0-9._-]{3,64}$/.test(login)||!label.trim()||label.length>120)
      throw new AppError("FAMILY_INPUT_INVALID",422);
    const record=await hashPassword(password);
    return this.store.transaction(()=>{
      if(this.store.db.prepare("SELECT id FROM households").get())throw new AppError("FAMILY_ALREADY_CONFIGURED",409);
      return this.insertFamily(login,record,label);
    });
  }
  private insertFamily(login:string,password:PasswordRecord,label:string) {
    const householdId=randomUUID(),learnerId=randomUUID();
    this.store.db.prepare("INSERT INTO households VALUES(?,?,?,1,?)").run(householdId,login,JSON.stringify(password),this.now());
    this.store.db.prepare("INSERT INTO private_learners VALUES(?,?,?)").run(learnerId,householdId,label);
    this.store.audit("family_setup",householdId);
    return {householdId,learnerId};
  }
  /** Multiple isolated households only for adversarial fixtures, never HTTP provisioning. */
  async syntheticHousehold(login:string,password:string) {
    if(!this.store.synthetic||process.env.NODE_ENV!=="test")throw new AppError("SYNTHETIC_ONLY",403);
    const record=await hashPassword(password);
    return this.store.transaction(()=>this.insertFamily(login,record,"合成学习者"));
  }
  configured(){return !!this.store.db.prepare("SELECT id FROM households").get();}
  private epoch(){return Number(this.store.db.prepare("SELECT epoch FROM metadata WHERE id=1").get()!.epoch);}
  private issue(householdId:string,learnerId:string|null,role:Principal["role"]) {
    const cookie=token(),csrf=token(),now=this.now(),life=role==="parent"?15*60_000:30*86400_000;
    const row=this.store.db.prepare("SELECT credential_version FROM households WHERE id=?").get(householdId)!;
    this.store.db.prepare("INSERT INTO private_sessions VALUES(?,?,?,?,?,?,?,?,?,?,0)").run(sha256(cookie),householdId,learnerId,role,csrf,this.epoch(),row.credential_version!,now,now+life,now+(role==="parent"?life:7*86400_000));
    return {cookie,csrf,maxAge:life/1000};
  }
  async login(login:string,password:string,source:string) {
    if(typeof login!=="string"||typeof password!=="string"||login.length>64||password.length>128)throw new AppError("AUTH_INVALID",401);
    const key=sha256("login:"+source),now=this.now();
    this.store.transaction(()=>{
      const limit=this.store.db.prepare("SELECT * FROM private_limits WHERE bucket=?").get(key);
      if(limit&&Number(limit.until_at)>now&&Number(limit.attempts)>=8)throw new AppError("AUTH_RATE_LIMIT",429);
      this.store.db.prepare("INSERT INTO private_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN until_at>? THEN attempts+1 ELSE 1 END,until_at=CASE WHEN until_at>? THEN until_at ELSE excluded.until_at END").run(key,now+15*60_000,now,now);
    });
    const row=this.store.db.prepare("SELECT * FROM households WHERE login=?").get(login);
    const dummy:PasswordRecord={password_scheme:"scrypt-v1-N32768-r8-p3",password_salt:"00".repeat(16),password_hash:"00".repeat(64)};
    const valid=await verifyPassword(password,row?JSON.parse(String(row.password)):dummy);
    if(!row||!valid){this.store.audit("login_failed");throw new AppError("AUTH_INVALID",401);}
    return this.store.transaction(()=>{
      const live=this.store.db.prepare("SELECT credential_version FROM households WHERE id=?").get(row.id!);
      if(!live||live.credential_version!==row.credential_version)throw new AppError("AUTH_CHANGED",401);
      this.store.db.prepare("DELETE FROM private_limits WHERE bucket=?").run(key);
      this.store.audit("parent_login",String(row.id));
      return this.issue(String(row.id),null,"parent");
    });
  }
  session(cookie:string):Principal {
    if(!/^[A-Za-z0-9_-]{43}$/.test(cookie))throw new AppError("SESSION_REQUIRED",401);
    return this.live(sha256(cookie));
  }
  private live(digest:string):Principal {
    const s=this.store.db.prepare("SELECT s.*,h.credential_version live_version FROM private_sessions s JOIN households h ON h.id=s.household_id WHERE digest=?").get(digest),now=this.now();
    if(!s||s.revoked||s.epoch!==this.epoch()||s.credential_version!==s.live_version||Number(s.expires_at)<=now||Number(s.idle_expires_at)<=now)
      throw new AppError("SESSION_REQUIRED",401);
    if(s.role==="child")this.store.db.prepare("UPDATE private_sessions SET idle_expires_at=min(expires_at,?) WHERE digest=?").run(now+7*86400_000,digest);
    return {digest,householdId:String(s.household_id),learnerId:s.learner_id?String(s.learner_id):null,role:s.role as Principal["role"],csrf:String(s.csrf)};
  }
  authorize(p:Principal,learnerId:string,role?:Principal["role"]) {
    const live=this.live(p.digest);
    if(role&&live.role!==role)throw new AppError("ROLE_FORBIDDEN",403);
    if(live.role==="child"&&live.learnerId!==learnerId)throw new AppError("NOT_FOUND",404);
    if(!this.store.db.prepare("SELECT id FROM private_learners WHERE id=? AND household_id=?").get(learnerId,live.householdId))throw new AppError("NOT_FOUND",404);
    return live;
  }
  csrf(p:Principal,value:unknown) {
    const live=this.live(p.digest);
    if(typeof value!=="string"||value.length!==live.csrf.length||!timingSafeEqual(Buffer.from(value),Buffer.from(live.csrf)))throw new AppError("CSRF_REJECTED",403);
  }
  learners(p:Principal) {
    const live=this.live(p.digest);
    return this.store.db.prepare("SELECT id,label FROM private_learners WHERE household_id=?"+(live.role==="child"?" AND id=?":"")).all(...(live.role==="child"?[live.householdId,live.learnerId!]:[live.householdId]));
  }
  enroll(p:Principal,learnerId:string) {
    const live=this.authorize(p,learnerId,"parent");
    return this.store.transaction(()=>{this.store.audit("device_authorized",live.householdId);return this.issue(live.householdId,learnerId,"child");});
  }
  revokeDevices(p:Principal) {
    const live=this.live(p.digest);if(live.role!=="parent")throw new AppError("ROLE_FORBIDDEN",403);
    this.store.db.prepare("UPDATE private_sessions SET revoked=1 WHERE household_id=? AND role='child'").run(live.householdId);
    this.store.audit("devices_revoked",live.householdId);
  }
  logout(p:Principal){this.live(p.digest);this.store.db.prepare("UPDATE private_sessions SET revoked=1 WHERE digest=?").run(p.digest);}
  async changePassword(p:Principal,password:string) {
    const live=this.live(p.digest);if(live.role!=="parent")throw new AppError("ROLE_FORBIDDEN",403);
    const record=await hashPassword(password);
    return this.store.transaction(()=>{
      this.live(p.digest);
      this.store.db.prepare("UPDATE households SET password=?,credential_version=credential_version+1 WHERE id=?").run(JSON.stringify(record),live.householdId);
      this.store.db.prepare("UPDATE private_sessions SET revoked=1 WHERE household_id=?").run(live.householdId);
      this.store.audit("password_changed",live.householdId);
    });
  }
}
