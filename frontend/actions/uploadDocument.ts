"use server";

import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL!;

export async function uploadDocument(
  locale: string,
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/obligations/${id}/upload-document`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "GENERIC" };
  }

  revalidatePath(`/${locale}/obligations/${id}`);
  return {};
}
