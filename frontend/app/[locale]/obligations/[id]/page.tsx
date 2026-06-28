import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchObligation } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { AuditTrail } from "@/components/obligations/AuditTrail";
import { DocumentUpload } from "@/components/obligations/DocumentUpload";
import { TransitionButtons } from "@/components/obligations/TransitionButtons";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ObligationDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  let obligation;
  try {
    obligation = await fetchObligation(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404")) notFound();
    throw err;
  }

  const [t, tObl] = await Promise.all([
    getTranslations({ locale, namespace: "detail" }),
    getTranslations({ locale, namespace: "obligations" }),
  ]);

  return (
    <div>
      <Topbar title={t("title")} locale={locale} editHref={`/${locale}/obligations/${obligation.id}/edit`} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda — datos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{obligation.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{tObl(`type_labels.${obligation.type}`)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {obligation.overdue && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      {tObl("overdue")}
                    </span>
                  )}
                  <Badge status={obligation.status} label={tObl(`status.${obligation.status}`)} />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 font-medium">{tObl("dueDate")}</dt>
                  <dd className="text-gray-900 mt-0.5">{formatDate(obligation.due_date, locale)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">{tObl("owner")}</dt>
                  <dd className="text-gray-900 mt-0.5">{obligation.owner}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">{t("taxId")}</dt>
                  <dd className="text-gray-900 mt-0.5 font-mono">{obligation.company_tax_id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">{t("requiresDocument")}</dt>
                  <dd className="text-gray-900 mt-0.5">{obligation.requires_document ? t("yes") : t("no")}</dd>
                </div>
                {obligation.requires_document ? (
                  <DocumentUpload
                    id={obligation.id}
                    locale={locale}
                    documentUrl={obligation.document_url}
                  />
                ) : obligation.document_url ? (
                  <div className="col-span-2">
                    <dt className="text-gray-500 font-medium">{t("documentUrl")}</dt>
                    <dd className="mt-0.5">
                      <a href={obligation.document_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
                        {obligation.document_url}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {obligation.description && (
                  <div className="col-span-2">
                    <dt className="text-gray-500 font-medium">{t("description")}</dt>
                    <dd className="text-gray-900 mt-0.5">{obligation.description}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Transiciones */}
            {obligation.valid_transitions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{t("transition")}</h3>
                <TransitionButtons
                  id={obligation.id}
                  validTransitions={obligation.valid_transitions}
                  version={obligation.version}
                  locale={locale}
                />
              </div>
            )}
          </div>

          {/* Columna derecha — audit trail */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t("auditTrail")}</h3>
            <AuditTrail entries={obligation.audit_trail} createdAt={obligation.created_at} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
