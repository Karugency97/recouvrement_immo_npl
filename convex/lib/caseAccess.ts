import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { NPL_FULL_ACCESS_ROLES } from "./auth";
import { forbidden } from "./errors";

// ─────────────────────────────────────────────────────────────────
// Garde d'appartenance d'un case à l'org de l'appelant — réutilisable
// en query ET mutation (le assertCaseInOrg de secib.ts est action-only).
// Rôles NPL full access (admin/assistant) : accès total. Syndic : le case
// doit appartenir à son org. Retourne le case chargé.
// ─────────────────────────────────────────────────────────────────

function check(
  caseDoc: Doc<"cases"> | null,
  user: { role: string; organizationId: Id<"organizations"> },
): Doc<"cases"> {
  if (!caseDoc) {
    throw forbidden(user.role, NPL_FULL_ACCESS_ROLES);
  }
  const isNplFull = (NPL_FULL_ACCESS_ROLES as readonly string[]).includes(
    user.role,
  );
  if (!isNplFull && caseDoc.organizationId !== user.organizationId) {
    throw forbidden(user.role, NPL_FULL_ACCESS_ROLES);
  }
  return caseDoc;
}

export async function assertCaseAccessQuery(
  ctx: QueryCtx,
  caseId: Id<"cases">,
  user: { role: string; organizationId: Id<"organizations"> },
): Promise<Doc<"cases">> {
  return check(await ctx.db.get(caseId), user);
}

export async function assertCaseAccessMutation(
  ctx: MutationCtx,
  caseId: Id<"cases">,
  user: { role: string; organizationId: Id<"organizations"> },
): Promise<Doc<"cases">> {
  return check(await ctx.db.get(caseId), user);
}
