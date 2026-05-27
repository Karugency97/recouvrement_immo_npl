"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

function secibHeaders(): HeadersInit {
  const apiKey = process.env.SECIB_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SECIB_GATEWAY_API_KEY is not set. Configure it in Convex env vars (npx convex env set SECIB_GATEWAY_API_KEY <key>).",
    );
  }
  return {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
}

export const cabinetInfo = action({
  args: {},
  handler: async () => {
    const res = await fetch(`${SECIB_BASE_URL}/cabinet/info`, {
      headers: secibHeaders(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway ${res.status}: ${body}`);
    }
    return await res.json();
  },
});

export const gatewayHealth = action({
  args: {},
  handler: async () => {
    const res = await fetch(`${SECIB_BASE_URL}/admin/health`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway health ${res.status}: ${body}`);
    }
    return await res.json();
  },
});

export const dossiersRechercher = action({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams();
    if (args.page !== undefined) params.set("page", String(args.page));
    if (args.pageSize !== undefined) params.set("pageSize", String(args.pageSize));

    const qs = params.toString();
    const url = `${SECIB_BASE_URL}/dossiers${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, { headers: secibHeaders() });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway ${res.status}: ${body}`);
    }
    return await res.json();
  },
});
