import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

const locales = ["es", "en"];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen bg-content-bg">
        <Sidebar locale={locale} />
        <div className="flex-1 ml-[220px]">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
