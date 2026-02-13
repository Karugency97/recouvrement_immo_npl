import { createDirectus, rest, staticToken, authentication } from "@directus/sdk";

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * Public Directus client (no auth) — for login/register flows
 */
export function getPublicClient() {
  return createDirectus(directusUrl).with(rest());
}

/**
 * Authenticated Directus client — uses static token
 */
export function getDirectusClient(token: string) {
  return createDirectus(directusUrl)
    .with(staticToken(token))
    .with(rest())
    .with(authentication("json"));
}

/**
 * Create a static token client for server-side operations
 */
export function getServerClient(token: string) {
  return createDirectus(directusUrl)
    .with(staticToken(token))
    .with(rest());
}
