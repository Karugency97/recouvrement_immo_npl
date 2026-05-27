"use client";

import { ConvexProviderWithAuth } from "convex/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { convexClient } from "@/lib/convex";

// Bridges Logto session (httpOnly cookie, server-side) to Convex WebSocket
// auth (needs JWT access token client-side). The hook:
//   1. Probes /api/logto/me on mount to learn isAuthenticated.
//   2. Returns a fetchAccessToken() that calls /api/logto/token on demand.
// Convex calls fetchAccessToken when it needs to auth the socket, then
// re-calls it with forceRefreshToken=true when the cached token expires.
function useLogtoAuthForConvex() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/logto/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((ctx) => {
        if (cancelled) return;
        setIsAuthenticated(Boolean(ctx?.isAuthenticated));
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // The Logto SDK handles its own refresh-token logic on the server side;
      // we just call the endpoint again. forceRefreshToken is currently
      // advisory — we always hit the route (cache: no-store) so the SDK
      // returns the freshest token from session.
      void forceRefreshToken;
      const res = await fetch("/api/logto/token", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { token: string | null };
      return data.token ?? null;
    },
    [],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useLogtoAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
