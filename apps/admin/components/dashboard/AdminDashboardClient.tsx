"use client";

import { useEffect, useState } from "react";

type DashboardState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: unknown };

function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    cache: "no-store",
  }).finally(() => clearTimeout(timer));
}

export default function AdminDashboardClient() {
  const [state, setState] = useState<DashboardState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });

      try {
        const res = await fetchWithTimeout("/api/admin/dashboard", 15000);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Dashboard API failed: ${res.status} ${text}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error && err.name === "AbortError"
              ? "Dashboard request timed out (15s)."
              : err instanceof Error
                ? err.message
                : "Unknown error.";
          setState({ status: "error", message });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin Dashboard</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin Dashboard</h1>
        <p style={{ opacity: 0.8 }}>{state.message}</p>
        <button type="button" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (state.status === "ready") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin Dashboard</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}
