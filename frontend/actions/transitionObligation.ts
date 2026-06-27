"use server";

import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL!;

export async function transitionObligation(
  locale: string,
  id: string,
  toStatus: string,
  version: number
): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/obligations/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_status: toStatus, version }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "ERROR" };
  }

  revalidatePath(`/${locale}/obligations/${id}`);
  return {};
}
