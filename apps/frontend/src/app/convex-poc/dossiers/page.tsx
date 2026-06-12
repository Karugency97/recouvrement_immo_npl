"use client";

import { useAction, useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useState } from "react";

// Type-erased references (we don't import _generated/api here to avoid
// coupling the frontend tsconfig to the convex codegen output).
const meQuery = makeFunctionReference<"query">("users:me");
const cabinetInfoAction = makeFunctionReference<"action">("secib:cabinetInfo");
const dossiersRechercherAction = makeFunctionReference<"action">("secib:dossiersRechercher");
const dossiersDuSyndicAction = makeFunctionReference<"action">("secib:dossiersDuSyndic");

type ActionResult = { label: string; data: unknown } | null;
type ActionError = { label: string; message: string; details?: unknown } | null;

function PlaygroundContent() {
  const me = useQuery(meQuery);
  const cabinetInfo = useAction(cabinetInfoAction);
  const dossiersRechercher = useAction(dossiersRechercherAction);
  const dossiersDuSyndic = useAction(dossiersDuSyndicAction);

  const [result, setResult] = useState<ActionResult>(null);
  const [error, setError] = useState<ActionError>(null);
  const [pending, setPending] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setPending(label);
    setResult(null);
    setError(null);
    try {
      const data = await fn();
      setResult({ label, data });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const details = (e as { data?: unknown })?.data;
      setError({ label, message, details });
    } finally {
      setPending(null);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>SECIB Actions Playground</h1>

      {/* Identity */}
      <section style={{ background: "#f5f5f5", padding: "1rem", borderRadius: 8, marginTop: 16 }}>
        {me === undefined ? (
          <p>Loading identity…</p>
        ) : me === null ? (
          <p>Authenticated but no Convex user row provisioned. Ask an admin to run seed:provisionNplUser.</p>
        ) : (
          <div style={{ fontSize: 14 }}>
            <div><strong>{me.name}</strong> ({me.email})</div>
            <div>Role: <code>{me.role}</code></div>
            <div>Org: {me.organizationName ?? "?"} (<code>{me.organizationKind ?? "?"}</code>)</div>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <a href="/api/logto/sign-out" style={{ fontSize: 13, color: "#666" }}>Sign out</a>
        </div>
      </section>

      {/* Action buttons */}
      <section style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => run("cabinetInfo", () => cabinetInfo({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "cabinetInfo")}
        >
          {pending === "cabinetInfo" ? "Running…" : "cabinetInfo"}
        </button>
        <button
          onClick={() => run("dossiersRechercher", () => dossiersRechercher({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "dossiersRechercher")}
        >
          {pending === "dossiersRechercher" ? "Running…" : "dossiersRechercher"}
        </button>
        <button
          onClick={() => run("dossiersDuSyndic", () => dossiersDuSyndic({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "dossiersDuSyndic")}
        >
          {pending === "dossiersDuSyndic" ? "Running…" : "dossiersDuSyndic"}
        </button>
      </section>

      {/* Result */}
      {result && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>✓ {result.label}</h2>
          <pre style={preStyle(false)}>{JSON.stringify(result.data, null, 2)}</pre>
        </section>
      )}

      {/* Error */}
      {error && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#b91c1c" }}>✗ {error.label}</h2>
          <pre style={preStyle(true)}>{error.message}</pre>
          {error.details ? (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 13, cursor: "pointer" }}>ConvexError payload</summary>
              <pre style={preStyle(true)}>{JSON.stringify(error.details, null, 2)}</pre>
            </details>
          ) : null}
        </section>
      )}
    </main>
  );
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: loading ? "#e5e7eb" : "white",
    cursor: loading ? "default" : "pointer",
    fontSize: 14,
  };
}

function preStyle(error: boolean): React.CSSProperties {
  return {
    background: error ? "#fef2f2" : "#f9fafb",
    border: `1px solid ${error ? "#fecaca" : "#e5e7eb"}`,
    padding: 12,
    borderRadius: 6,
    fontSize: 12,
    overflow: "auto",
    maxHeight: 400,
  };
}

export default function DossiersPlaygroundPage() {
  return (
    <>
      <AuthLoading>
        <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
          <p>Loading auth…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>SECIB Actions Playground</h1>
          <p style={{ marginTop: 16 }}>You must sign in to test the SECIB actions.</p>
          <a href="/api/logto/sign-in" style={{ display: "inline-block", marginTop: 16, padding: "8px 16px", background: "#1e40af", color: "white", borderRadius: 6, textDecoration: "none" }}>Sign in</a>
        </main>
      </Unauthenticated>
      <Authenticated>
        <PlaygroundContent />
      </Authenticated>
    </>
  );
}
