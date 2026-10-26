// Pure SHA-256 works on LAN HTTP too; no secure-context/WebCrypto bypass.
import { sha256 } from "@noble/hashes/sha2.js";
import { canonical } from "./contract.ts";
export function contentDigest(value: unknown) {
  return Array.from(sha256(new TextEncoder().encode(canonical(value))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
