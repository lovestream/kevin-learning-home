-- Safe rebuild: foreign_keys is disabled before BEGIN by the migration runner.
CREATE TABLE learners_v2(id TEXT PRIMARY KEY, label TEXT NOT NULL, synthetic INTEGER NOT NULL CHECK(synthetic IN (0,1))) STRICT;
INSERT INTO learners_v2 SELECT id,label,synthetic FROM learners;
DROP TABLE learners;
ALTER TABLE learners_v2 RENAME TO learners;
CREATE TABLE actors(id TEXT PRIMARY KEY, login_name TEXT NOT NULL UNIQUE CHECK(length(login_name) BETWEEN 3 AND 64), label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 120), kind TEXT NOT NULL CHECK(kind IN ('parent','learner')), learner_id TEXT UNIQUE REFERENCES learners(id), synthetic INTEGER NOT NULL CHECK(synthetic IN (0,1)), password_scheme TEXT NOT NULL, password_salt TEXT NOT NULL CHECK(length(password_salt)=32), password_hash TEXT NOT NULL CHECK(length(password_hash)=128), credential_version INTEGER NOT NULL CHECK(credential_version>0), disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1)), CHECK((kind='parent' AND learner_id IS NULL) OR (kind='learner' AND learner_id IS NOT NULL))) STRICT;
CREATE TABLE learner_grants(parent_id TEXT NOT NULL REFERENCES actors(id), learner_id TEXT NOT NULL REFERENCES learners(id), granted_at INTEGER NOT NULL, revoked_at INTEGER, PRIMARY KEY(parent_id,learner_id)) STRICT;
CREATE TRIGGER parent_grant_role_insert BEFORE INSERT ON learner_grants WHEN COALESCE((SELECT kind FROM actors WHERE id=NEW.parent_id),'')!='parent' BEGIN SELECT RAISE(ABORT,'PARENT_ROLE_REQUIRED'); END;
CREATE TRIGGER parent_grant_role_update BEFORE UPDATE ON learner_grants WHEN COALESCE((SELECT kind FROM actors WHERE id=NEW.parent_id),'')!='parent' BEGIN SELECT RAISE(ABORT,'PARENT_ROLE_REQUIRED'); END;
CREATE TABLE auth_controls(id INTEGER PRIMARY KEY CHECK(id=1), epoch INTEGER NOT NULL CHECK(epoch>0)) STRICT;
INSERT INTO auth_controls VALUES(1,1);
CREATE TABLE auth_sessions(token_digest TEXT PRIMARY KEY CHECK(length(token_digest)=64), csrf_digest TEXT NOT NULL CHECK(length(csrf_digest)=64), actor_id TEXT NOT NULL REFERENCES actors(id), credential_version INTEGER NOT NULL, epoch INTEGER NOT NULL, issued_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, idle_expires_at INTEGER NOT NULL, parent_unlock_until INTEGER NOT NULL DEFAULT 0, revoked_at INTEGER, CHECK(expires_at>issued_at AND idle_expires_at>issued_at)) STRICT;
CREATE INDEX auth_sessions_actor ON auth_sessions(actor_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_limits(bucket_digest TEXT PRIMARY KEY CHECK(length(bucket_digest)=64), attempts INTEGER NOT NULL CHECK(attempts>0), expires_at INTEGER NOT NULL) STRICT;
CREATE INDEX auth_limits_expiry ON auth_limits(expires_at);
CREATE TABLE auth_audit(id INTEGER PRIMARY KEY, event TEXT NOT NULL CHECK(event IN ('bootstrap','actor_created','login_ok','login_failed','logout','rotate','unlock','lock','credential_reset','authority_rotated','grant','revoke_grant','restore_invalidate')), actor_id TEXT REFERENCES actors(id), at INTEGER NOT NULL) STRICT;
CREATE TRIGGER auth_audit_immutable_update BEFORE UPDATE ON auth_audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUTH_AUDIT'); END;
CREATE TRIGGER auth_audit_immutable_delete BEFORE DELETE ON auth_audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUTH_AUDIT'); END;
