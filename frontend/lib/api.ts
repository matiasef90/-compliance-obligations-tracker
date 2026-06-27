import type { Obligation } from "./types";

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("API_URL environment variable is not set");
}

export async function fetchObligations(): Promise<Obligation[]> {
  const res = await fetch(`${API_URL}/obligations`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch obligations: ${res.status}`);
  const data = await res.json();
  return data.items as Obligation[];
}

export async function fetchObligation(id: string): Promise<Obligation> {
  const res = await fetch(`${API_URL}/obligations/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch obligation ${id}: ${res.status}`);
  return res.json() as Promise<Obligation>;
}
