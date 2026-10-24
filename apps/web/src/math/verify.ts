import {
  mathResponseSchema,
  publicMathFields,
  PUBLIC_DTO_SHA,
  type MathResponse,
} from "../../../../packages/contracts/math-readonly.ts";
function canonical(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.entries(x)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, y]) => [k, sort(y)]),
          )
        : x;
  return JSON.stringify(sort(v));
}
export async function verifyMathResponse(
  value: unknown,
  learnerId: string,
  visualDigest: string,
): Promise<MathResponse> {
  const dto = mathResponseSchema.parse(value);
  if (
    dto.learnerId !== learnerId ||
    !visualDigest ||
    dto.manifest.visualArtifactSha256 !== visualDigest
  )
    throw Error("MATH_RESPONSE_MISMATCH");
  const bytes = new TextEncoder().encode(canonical(publicMathFields(dto)));
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== PUBLIC_DTO_SHA) throw Error("MATH_PUBLIC_HASH_MISMATCH");
  return dto;
}
