// Runtime boundary for this content process only; formal auth never imports it.
import { isIPv4 } from "node:net";
import { networkInterfaces } from "node:os";
export type PreviewRuntime = {
  runtime?: "local" | "isolated-container";
  bindAddress?: string;
  publicOrigin?: string;
  peers?: string[];
};
export function privateIPv4(value: string) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map(Number);
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}
export function exactLANOrigin(origin: string) {
  const parsed = new URL(origin);
  if (
    parsed.origin !== origin ||
    parsed.protocol !== "http:" ||
    !privateIPv4(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw Error("EXACT_PRIVATE_HTTP_ORIGIN_REQUIRED");
  return parsed;
}
const numberIP = (ip: string) =>
  ip.split(".").reduce((n, x) => n * 256 + Number(x), 0) >>> 0;
export function peerAllowed(address: string, cidrs: string[]) {
  const ip = address.replace(/^::ffff:/, "");
  return cidrs.some((cidr) => {
    const [base, bits] = cidr.split("/");
    const prefix = Number(bits),
      first = Number(base.split(".")[0]);
    const overlay =
      isIPv4(base) &&
      first === 100 &&
      Number(base.split(".")[1]) >= 64 &&
      Number(base.split(".")[1]) <= 127;
    const minimum =
      first === 192 ? 16 : first === 172 ? 12 : first === 100 ? 10 : 8;
    if (
      !isIPv4(base) ||
      (!privateIPv4(base) && !overlay && first !== 127) ||
      !Number.isInteger(prefix) ||
      prefix < minimum ||
      prefix > 32
    )
      throw Error("PRIVATE_PEER_CIDR_REQUIRED");
    if (!isIPv4(ip)) return false;
    const mask =
      prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
    return (numberIP(ip) & mask) === (numberIP(base) & mask);
  });
}
export function runtimeBoundary(options: PreviewRuntime = {}) {
  if (options.runtime === undefined || options.runtime === "local") {
    if (options.bindAddress !== undefined || options.publicOrigin !== undefined)
      throw Error("CONTAINER_MODE_REQUIRED_FOR_NETWORK_OPTIONS");
    return {
      bind: "127.0.0.1",
      origin: null,
      allowPeer: (_ip: string) => true,
    };
  }
  if (
    options.runtime !== "isolated-container" ||
    !options.bindAddress ||
    !options.publicOrigin
  )
    throw Error("EXPLICIT_CONTAINER_BOUNDARY_REQUIRED");
  const bind = options.bindAddress;
  if (
    !privateIPv4(bind) ||
    !Object.values(networkInterfaces())
      .flat()
      .some((x) => x?.address === bind && !x.internal)
  )
    throw Error("ASSIGNED_PRIVATE_CONTAINER_IP_REQUIRED");
  if (!options.peers?.length || options.peers.length > 8)
    throw Error("EXPLICIT_PRIVATE_PEERS_REQUIRED");
  for (const peer of options.peers) peerAllowed("127.0.0.1", [peer]);
  return {
    bind,
    origin: exactLANOrigin(options.publicOrigin),
    allowPeer: (ip: string) => peerAllowed(ip, options.peers!),
  };
}
