// Synthetic offline fixture provisioning only; no production endpoint or testContext.
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../packages/auth/password.ts";
import { authFixture, secret } from "../auth/helpers.ts";
export async function mathFixture(tls = false, enabled = true) {
  const f = await authFixture(tls, false, enabled),
    password2 = secret(),
    parentLogin2 = "p2-" + randomUUID().slice(0, 8),
    parent2 = randomUUID();
  const hash = await hashPassword(password2);
  // 02A intentionally has only one bootstrap CLI. Insert a genuine scrypt actor in
  // the isolated synthetic DB; tests still authenticate through real HTTP/cookies.
  f.store.transaction(() =>
    f.store.db
      .prepare("INSERT INTO actors VALUES(?,?,?,?,?,1,?,?,?,1,0)")
      .run(
        parent2,
        parentLogin2,
        "Synthetic parent B",
        "parent",
        null,
        hash.password_scheme,
        hash.password_salt,
        hash.password_hash,
      ),
  );
  const childPassword2 = secret(),
    childLogin2 = "c2-" + randomUUID().slice(0, 8),
    child2 = await f.auth.provisionLearner(
      parent2,
      childLogin2,
      "Synthetic child B",
      childPassword2,
    );
  return {
    ...f,
    parent2,
    parentLogin2,
    password2,
    child2,
    childLogin2,
    childPassword2,
  };
}
export const pathFor = (learner: string, lesson = "G3-U01-B01") =>
  "/api/v1/learners/" + learner + "/subjects/math/lessons/" + lesson;
