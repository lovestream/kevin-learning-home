import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Store } from "../platform/store.ts";
import { AppError, sha256 } from "../contracts/index.ts";
import {
  hashPassword,
  verifyPassword,
  PASSWORD_SCHEME,
  type PasswordRecord,
} from "./password.ts";

import {
  authLoginName as loginName,
  authCredentialsSchema as credentialsSchema,
  parentUnlockSchema as unlockSchema,
  authLogoutSchema as logoutSchema,
  authEmptySchema as emptySchema,
} from "../contracts/auth.ts";
export {
  loginName,
  credentialsSchema,
  unlockSchema,
  logoutSchema,
  emptySchema,
};
interface Actor extends PasswordRecord {
  id: string;
  login_name: string;
  kind: "parent" | "learner";
  learner_id: string | null;
  credential_version: number;
  disabled: number;
}
export interface Session {
  token_digest: string;
  csrf_digest: string;
  actor_id: string;
  credential_version: number;
  epoch: number;
  issued_at: number;
  last_seen_at: number;
  expires_at: number;
  idle_expires_at: number;
  parent_unlock_until: number;
  revoked_at: number | null;
  actor: Actor;
  csrfToken: string;
}
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000,
  IDLE_MS = 30 * 60 * 1000,
  UNLOCK_MS = 5 * 60 * 1000;
const randomToken = () => randomBytes(32).toString("base64url");
function equalDigest(a: string, b: string) {
  return (
    /^[a-f0-9]{64}$/.test(a) &&
    timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  );
}

export class AuthService {
  readonly store: Store;
  private clock: () => number;
  private dummy: PasswordRecord = {
    password_scheme: PASSWORD_SCHEME,
    password_salt: randomBytes(16).toString("hex"),
    password_hash: "0".repeat(128),
  };
  constructor(store: Store, clock = Date.now) {
    if (store.schemaVersion !== 2)
      throw new AppError("AUTH_SCHEMA_REQUIRED", 503);
    this.store = store;
    this.clock = clock;
  }
  private audit(event: string, actor: string | null = null) {
    this.store.db
      .prepare("INSERT INTO auth_audit(event,actor_id,at) VALUES(?,?,?)")
      .run(event, actor, this.clock());
  }
  private actor(id: string) {
    return this.store.db
      .prepare("SELECT * FROM actors WHERE id=?")
      .get(id) as unknown as Actor | undefined;
  }
  private parent(id: string) {
    const a = this.actor(id);
    if (!a || a.kind !== "parent" || a.disabled)
      throw new AppError("PARENT_ACCESS_REQUIRED", 403);
    return a;
  }
  private epoch() {
    return Number(
      this.store.db.prepare("SELECT epoch FROM auth_controls WHERE id=1").get()!
        .epoch,
    );
  }
  private consumeLimit(
    scope: string,
    source: string,
    limit: number,
    window: number,
  ) {
    const now = this.clock(),
      key = sha256(scope + ":" + source),
      db = this.store.db;
    this.store.transaction(() => {
      db.prepare(
        "DELETE FROM auth_limits WHERE bucket_digest IN (SELECT bucket_digest FROM auth_limits WHERE expires_at<=? LIMIT 128)",
      ).run(now);
      const old = db
        .prepare("SELECT attempts FROM auth_limits WHERE bucket_digest=?")
        .get(key);
      if (old && Number(old.attempts) >= limit)
        throw new AppError("AUTH_RATE_LIMITED", 429);
      if (
        !old &&
        Number(db.prepare("SELECT count(*) n FROM auth_limits").get()!.n) >=
          4096
      )
        throw new AppError("AUTH_RATE_LIMITED", 429);
      db.prepare(
        "INSERT INTO auth_limits VALUES(?,1,?) ON CONFLICT(bucket_digest) DO UPDATE SET attempts=attempts+1",
      ).run(key, now + window);
    });
  }
  private limits(login: string, source: string) {
    this.consumeLimit("transport", source, 60, 5 * 60 * 1000);
    this.consumeLimit("credential", login, 5, 15 * 60 * 1000);
  }
  private pruneSessions() {
    const now = this.clock();
    // Finite auth storage and bounded request work. Expired/revoked tokens remain unusable even after deletion.
    this.store.db
      .prepare(
        "DELETE FROM auth_sessions WHERE token_digest IN (SELECT token_digest FROM auth_sessions WHERE revoked_at IS NOT NULL OR expires_at<=? OR idle_expires_at<=? LIMIT 128)",
      )
      .run(now, now);
    if (
      Number(
        this.store.db.prepare("SELECT count(*) n FROM auth_sessions").get()!.n,
      ) >= 4096
    )
      throw new AppError("AUTH_BUSY", 429);
  }
  private issue(
    actor: Actor,
    unlockUntil = 0,
    absoluteExpiry = this.clock() + ABSOLUTE_MS,
  ) {
    this.pruneSessions();
    const now = this.clock(),
      token = randomToken(),
      csrf = randomToken();
    const expires = Math.min(absoluteExpiry, now + ABSOLUTE_MS),
      idle = Math.min(expires, now + IDLE_MS);
    this.store.db
      .prepare("INSERT INTO auth_sessions VALUES(?,?,?,?,?,?,?,?,?,?,NULL)")
      .run(
        sha256(token),
        sha256(csrf),
        actor.id,
        actor.credential_version,
        this.epoch(),
        now,
        now,
        expires,
        idle,
        Math.min(unlockUntil, expires),
      );
    return {
      cookie: token + "." + csrf,
      csrfToken: csrf,
      maxAge: Math.max(0, Math.floor((expires - now) / 1000)),
    };
  }
  /** HTTP must serialize view(), never this server-only verified context. */
  session(cookie: string | undefined): Session {
    return this.loadSession(cookie, true);
  }
  private loadSession(cookie: string | undefined, touch: boolean): Session {
    // Rotation/revocation revalidate inside their existing transaction and need
    // no idle touch; starting a nested transaction would fail after 60 seconds.
    const parts = cookie?.split(".") ?? [];
    if (parts.length !== 2 || parts.some((x) => !/^[A-Za-z0-9_-]{43}$/.test(x)))
      throw new AppError("SESSION_REQUIRED", 401);
    const row = this.store.db
      .prepare("SELECT * FROM auth_sessions WHERE token_digest=?")
      .get(sha256(parts[0])) as unknown as
      Omit<Session, "actor" | "csrfToken"> | undefined;
    const now = this.clock(),
      a = row ? this.actor(row.actor_id) : undefined;
    if (
      !row ||
      !a ||
      a.disabled ||
      row.revoked_at !== null ||
      row.expires_at <= now ||
      row.idle_expires_at <= now ||
      row.credential_version !== a.credential_version ||
      row.epoch !== this.epoch() ||
      !equalDigest(row.csrf_digest, sha256(parts[1]))
    )
      throw new AppError("SESSION_REQUIRED", 401);
    if (touch && now - row.last_seen_at >= 60000)
      this.store.transaction(() =>
        this.store.db
          .prepare(
            "UPDATE auth_sessions SET last_seen_at=?,idle_expires_at=? WHERE token_digest=?",
          )
          .run(now, Math.min(row.expires_at, now + IDLE_MS), row.token_digest),
      );
    return { ...row, actor: a, csrfToken: parts[1] };
  }
  csrf(session: Session, token: unknown) {
    if (
      typeof token !== "string" ||
      !equalDigest(session.csrf_digest, sha256(token))
    )
      throw new AppError("CSRF_FAILED", 403);
  }
  async login(login: string, password: string, source: string) {
    const normalized = loginName.parse(login);
    this.limits(normalized, source);
    const a = this.store.db
      .prepare("SELECT * FROM actors WHERE login_name=?")
      .get(normalized) as unknown as Actor | undefined;
    let valid = false;
    try {
      valid = await verifyPassword(password, a ?? this.dummy);
    } catch (e) {
      if (
        !(e instanceof AppError) ||
        e.code !== "CREDENTIAL_FORMAT_UNSUPPORTED"
      )
        throw e;
      // An offline-corrupted credential must not become a username oracle.
      await verifyPassword(password, this.dummy);
    }
    return this.store.transaction(() => {
      const current = a ? this.actor(a.id) : undefined;
      if (
        !valid ||
        !a ||
        !current ||
        current.disabled ||
        current.credential_version !== a.credential_version ||
        current.password_hash !== a.password_hash
      ) {
        this.audit("login_failed");
        return null;
      }
      const issued = this.issue(current);
      this.audit("login_ok", current.id);
      return issued;
    });
  }
  view(session: Session) {
    const a = session.actor;
    const parentUnlocked =
      a.kind === "parent" && session.parent_unlock_until > this.clock();
    const grants =
      a.kind === "learner"
        ? [a.learner_id!]
        : !parentUnlocked
          ? []
          : this.store.db
              .prepare(
                "SELECT learner_id FROM learner_grants WHERE parent_id=? AND revoked_at IS NULL ORDER BY learner_id LIMIT 33",
              )
              .all(a.id)
              .map((r) => String(r.learner_id));
    if (grants.length > 32) throw new AppError("GRANT_SCOPE_CAPACITY", 503);
    return {
      schemaVersion: 1,
      actor: { id: a.id, role: a.kind },
      learnerIds: grants,
      parentUnlocked,
      parentUnlockExpiresAt: session.parent_unlock_until || null,
      expiresAt: session.expires_at,
      csrfToken: session.csrfToken,
    };
  }
  learners(session: Session, id?: string) {
    if (
      session.actor.kind === "parent" &&
      session.parent_unlock_until <= this.clock()
    )
      throw new AppError("PARENT_ACCESS_REQUIRED", 403);
    const scope = this.view(session).learnerIds;
    if (id && !scope.includes(id)) throw new AppError("LEARNER_FORBIDDEN", 403);
    return scope
      .filter((x) => !id || x === id)
      .map((x) =>
        this.store.db
          .prepare("SELECT id,label FROM learners WHERE id=?")
          .get(x),
      );
  }
  private rotateVerified(
    cookie: string,
    unlocked: number,
    event: "rotate" | "unlock" | "lock",
  ) {
    const s = this.loadSession(cookie, false);
    this.store.db
      .prepare(
        "UPDATE auth_sessions SET revoked_at=?,parent_unlock_until=0 WHERE token_digest=?",
      )
      .run(this.clock(), s.token_digest);
    const issued = this.issue(s.actor, unlocked, s.expires_at);
    this.audit(event, s.actor_id);
    return issued;
  }
  rotate(cookie: string) {
    return this.store.transaction(() =>
      this.rotateVerified(cookie, 0, "rotate"),
    );
  }
  lock(cookie: string) {
    return this.store.transaction(() => {
      const s = this.loadSession(cookie, false);
      if (s.actor.kind !== "parent")
        throw new AppError("PARENT_ACCESS_REQUIRED", 403);
      return this.rotateVerified(cookie, 0, "lock");
    });
  }
  async unlock(cookie: string, password: string, source: string) {
    const s = this.session(cookie);
    if (s.actor.kind !== "parent")
      throw new AppError("PARENT_ACCESS_REQUIRED", 403);
    this.limits("unlock:" + s.actor_id, source);
    const valid = await verifyPassword(password, s.actor);
    return this.store.transaction(() => {
      const current = this.loadSession(cookie, false);
      if (
        !valid ||
        current.actor.credential_version !== s.actor.credential_version
      ) {
        this.audit("login_failed");
        return null;
      }
      return this.rotateVerified(cookie, this.clock() + UNLOCK_MS, "unlock");
    });
  }
  logout(cookie: string, allDevices = false) {
    this.store.transaction(() => {
      const s = this.loadSession(cookie, false);
      this.store.db
        .prepare(
          "UPDATE auth_sessions SET revoked_at=?,parent_unlock_until=0 WHERE " +
            (allDevices ? "actor_id=?" : "token_digest=?"),
        )
        .run(this.clock(), allDevices ? s.actor_id : s.token_digest);
      this.audit("logout", s.actor_id);
    });
  }
  // Offline administrative capabilities. No HTTP handler exposes provisioning/reset/grants.
  async bootstrap(login: string, label: string, password: string) {
    const record = await hashPassword(password),
      name = loginName.parse(login);
    return this.store.transaction(() => {
      if (
        Number(
          this.store.db.prepare("SELECT count(*) n FROM actors").get()!.n,
        ) !== 0
      )
        throw new AppError("ALREADY_BOOTSTRAPPED", 409);
      const id = this.insertActor(name, label, "parent", null, record);
      this.audit("bootstrap", id);
      return id;
    });
  }
  private insertActor(
    login: string,
    label: string,
    kind: Actor["kind"],
    learner: string | null,
    record: PasswordRecord,
  ) {
    if (label.length < 1 || label.length > 120)
      throw new AppError("LABEL_INVALID", 422);
    if (
      Number(this.store.db.prepare("SELECT count(*) n FROM actors").get()!.n) >=
      128
    )
      throw new AppError("FAMILY_CAPACITY", 409);
    const id = randomUUID();
    this.store.db
      .prepare("INSERT INTO actors VALUES(?,?,?,?,?,1,?,?,?,1,0)")
      .run(
        id,
        login,
        label,
        kind,
        learner,
        record.password_scheme,
        record.password_salt,
        record.password_hash,
      );
    return id;
  }
  async provisionLearner(
    parent: string,
    login: string,
    label: string,
    password: string,
  ) {
    const name = loginName.parse(login),
      record = await hashPassword(password);
    return this.store.transaction(() => {
      this.parent(parent);
      const learner = randomUUID();
      this.store.db
        .prepare("INSERT INTO learners VALUES(?,?,1)")
        .run(learner, label);
      const actor = this.insertActor(name, label, "learner", learner, record);
      this.grantWithinTransaction(parent, learner);
      this.audit("actor_created", actor);
      return { actorId: actor, learnerId: learner };
    });
  }
  grant(parent: string, learner: string) {
    this.store.transaction(() => this.grantWithinTransaction(parent, learner));
  }
  private grantWithinTransaction(parent: string, learner: string) {
    this.parent(parent);
    if (
      Number(
        this.store.db
          .prepare(
            "SELECT count(*) n FROM learner_grants WHERE parent_id=? AND learner_id!=? AND revoked_at IS NULL",
          )
          .get(parent, learner)!.n,
      ) >= 32
    )
      throw new AppError("FAMILY_CAPACITY", 409);
    this.store.db
      .prepare(
        "INSERT INTO learner_grants VALUES(?,?,?,NULL) ON CONFLICT(parent_id,learner_id) DO UPDATE SET granted_at=excluded.granted_at,revoked_at=NULL",
      )
      .run(parent, learner, this.clock());
    this.audit("grant", parent);
  }
  revokeGrant(parent: string, learner: string) {
    this.store.transaction(() => {
      this.parent(parent);
      this.store.db
        .prepare(
          "UPDATE learner_grants SET revoked_at=? WHERE parent_id=? AND learner_id=?",
        )
        .run(this.clock(), parent, learner);
      this.audit("revoke_grant", parent);
    });
  }
  async offlineParent(login: string, password: string) {
    const result = await this.login(login, password, "offline-local");
    if (!result) throw new AppError("AUTH_INVALID", 401);
    const s = this.session(result.cookie);
    try {
      this.parent(s.actor_id);
      return s.actor_id;
    } finally {
      this.logout(result.cookie);
    }
  }
  async resetCredential(login: string, password: string) {
    const name = loginName.parse(login),
      record = await hashPassword(password);
    this.store.transaction(() => {
      const a = this.store.db
        .prepare("SELECT id FROM actors WHERE login_name=?")
        .get(name);
      if (!a) throw new AppError("ACTOR_NOT_FOUND", 404);
      this.store.db
        .prepare(
          "UPDATE actors SET password_scheme=?,password_salt=?,password_hash=?,credential_version=credential_version+1 WHERE id=?",
        )
        .run(
          record.password_scheme,
          record.password_salt,
          record.password_hash,
          a.id!,
        );
      this.store.db
        .prepare(
          "UPDATE auth_sessions SET revoked_at=?,parent_unlock_until=0 WHERE actor_id=?",
        )
        .run(this.clock(), a.id!);
      this.audit("credential_reset", String(a.id));
    });
  }
  rotateAuthority() {
    this.store.transaction(() => {
      this.store.db.exec("UPDATE auth_controls SET epoch=epoch+1 WHERE id=1");
      this.store.db
        .prepare("UPDATE auth_sessions SET revoked_at=?,parent_unlock_until=0")
        .run(this.clock());
      this.audit("authority_rotated");
    });
  }
}
