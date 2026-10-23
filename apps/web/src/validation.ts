import { z } from "zod";
// Must evaluate before importing any browser schemas: Zod otherwise probes
// new Function, which strict CSP reports even when the library catches it.
// Plain validation is sufficient for these small DTOs; CSP stays unchanged.
z.config({ jitless: true });
