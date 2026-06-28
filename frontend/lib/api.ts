import type { Obligation, ObligationListResult, ObligationStats } from "./types";

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("API_URL environment variable is not set");
}

export async function fetchObligations(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<ObligationListResult> {
  const url = new URL(`${API_URL}/obligations`);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
  if (params.search) url.searchParams.set("search", params.search);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch obligations: ${res.status}`);
  return res.json() as Promise<ObligationListResult>;
}

export async function fetchObligationStats(): Promise<ObligationStats> {
  const res = await fetch(`${API_URL}/obligations/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json() as Promise<ObligationStats>;
}

export async function fetchObligation(id: string): Promise<Obligation> {
  const res = await fetch(`${API_URL}/obligations/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch obligation ${id}: ${res.status}`);
  return res.json() as Promise<Obligation>;
}
