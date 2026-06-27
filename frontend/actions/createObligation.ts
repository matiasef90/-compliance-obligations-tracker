"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL!;

export async function createObligation(
  locale: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const body = {
    title: formData.get("title") as string,
    type: formData.get("type") as string,
    description: (formData.get("description") as string) || null,
    due_date: formData.get("due_date") as string,
    owner: formData.get("owner") as string,
    requires_document: formData.get("requires_document") === "on",
    document_url: (formData.get("document_url") as string) || null,
    company_tax_id: formData.get("company_tax_id") as string,
  };

  const res = await fetch(`${API_URL}/obligations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? data.detail ?? "Error al crear la obligación." };
  }

  const created = await res.json();
  revalidatePath(`/${locale}/obligations`);
  redirect(`/${locale}/obligations/${created.id}`);
}
