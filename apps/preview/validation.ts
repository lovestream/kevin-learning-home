// Configure before constructing schemas, including lazily loaded hooks. A caught
// Function capability probe still violates strict CSP in a real browser.
import { z } from "zod";
z.config({ jitless: true });
export { z };
