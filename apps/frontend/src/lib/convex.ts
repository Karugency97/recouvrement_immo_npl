import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Configure it in apps/frontend/.env.local " +
      "(self-hosted: https://convex.immo.nplavocat.com).",
  );
}

// Single shared client for the whole frontend. Wrapped by ConvexAuthProvider
// in app/layout.tsx so all client components can use useQuery / useMutation.
export const convexClient = new ConvexReactClient(convexUrl);
