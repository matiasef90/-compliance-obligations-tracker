"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL!;

export async function updateObligation(
  locale: string,
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const body = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    due_date: formData.get("due_date") as string,
    owner: formData.get("owner") as string,
    requires_document: formData.get("requires_document") === "on",
    document_url: (formData.get("document_url") as string) || null,
    version: Number(formData.get("version")),
  };

  const res = await fetch(`${API_URL}/obligations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 409) {
      return { error: "CONFLICT" };
    }
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? "GENERIC" };
  }

  revalidatePath(`/${locale}/obligations/${id}`);
  revalidatePath(`/${locale}/obligations`);
  redirect(`/${locale}/obligations/${id}`);
}
