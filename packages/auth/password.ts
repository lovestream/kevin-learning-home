import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AppError } from "../contracts/index.ts";

export const PASSWORD_SCHEME = "scrypt-v1-N32768-r8-p3";
export interface PasswordRecord {
  password_scheme: string;
  password_salt: string;
  password_hash: string;
}
let active = 0; // Work admission only; never an identity/session authority.
async function derive(password: string, salt: string): Promise<Buffer> {
  if (active >= 2) throw new AppError("AUTH_BUSY", 429);
  active++;
  try {
    return await new Promise((resolve, reject) =>
      scrypt(
        password,
        Buffer.from(salt, "hex"),
        64,
        { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
        (e, b) => (e ? reject(e) : resolve(b)),
      ),
    );
  } finally {
    active--;
  }
}
export function checkPasswordPolicy(password: string) {
  if (
    Array.from(password).length < 15 ||
    password.length > 128 ||
    Buffer.byteLength(password) > 512 ||
    Buffer.from(password).toString() !== password ||
    !password.trim() ||
    /[\x00-\x1f\x7f]/.test(password)
  )
    throw new AppError("PASSWORD_POLICY", 422);
}
export async function hashPassword(password: string): Promise<PasswordRecord> {
  checkPasswordPolicy(password);
  const salt = randomBytes(16).toString("hex"),
    key = await derive(password, salt);
  try {
    return {
      password_scheme: PASSWORD_SCHEME,
      password_salt: salt,
      password_hash: key.toString("hex"),
    };
  } finally {
    key.fill(0);
  }
}
export async function verifyPassword(password: string, record: PasswordRecord) {
  if (
    record.password_scheme !== PASSWORD_SCHEME ||
    !/^[a-f0-9]{32}$/.test(record.password_salt) ||
    !/^[a-f0-9]{128}$/.test(record.password_hash)
  )
    throw new AppError("CREDENTIAL_FORMAT_UNSUPPORTED", 503);
  const key = await derive(password, record.password_salt);
  try {
    return (
      timingSafeEqual(key, Buffer.from(record.password_hash, "hex")) &&
      Buffer.from(password).toString() === password
    );
  } finally {
    key.fill(0);
  }
}
