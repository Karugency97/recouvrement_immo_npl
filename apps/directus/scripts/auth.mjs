/**
 * Shared authentication helper for Directus setup scripts.
 *
 * Supports two modes:
 * 1. Static token: DIRECTUS_ADMIN_TOKEN env var
 * 2. Email/password: DIRECTUS_ADMIN_EMAIL + DIRECTUS_ADMIN_PASSWORD env vars
 *
 * Returns the access token to use for API calls.
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/$/, '');

export async function getAccessToken() {
  if (!DIRECTUS_URL) {
    throw new Error('DIRECTUS_URL env var is required');
  }

  // Mode 1: static token
  const staticToken = process.env.DIRECTUS_ADMIN_TOKEN;
  if (staticToken && staticToken !== 'your-admin-static-token') {
    return staticToken;
  }

  // Mode 2: email/password
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Auth required. Set either DIRECTUS_ADMIN_TOKEN or DIRECTUS_ADMIN_EMAIL + DIRECTUS_ADMIN_PASSWORD'
    );
  }

  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data.access_token;
}

export function getDirectusUrl() {
  return DIRECTUS_URL;
}
