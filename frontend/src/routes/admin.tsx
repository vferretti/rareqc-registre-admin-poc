import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  FileText,
  Database,
  Link,
  Download,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/base/page/page-header";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/base/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/base/ui/alert-dialog";
import { Button } from "@/components/base/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import {
  useConsentTemplates,
  type ConsentTemplate,
} from "@/hooks/useConsentTemplates";
import { useConsentClauses, type ConsentClause } from "@/hooks/useConsentClauses";
import { ConsentTemplateDialog } from "@/components/feature/consent-template-dialog";
import { CodeTableCard } from "@/components/feature/code-table-card";
import { useCodeTables } from "@/hooks/useCodeTables";
import { ExternalSystemCard } from "@/components/feature/external-system-card";
import { useExternalSystems } from "@/hooks/useExternalSystems";

const CLAUSE_TYPES = ["registry", "recontact", "external_linkage"] as const;

export default function Admin() {
  const { t, i18n } = useTranslation();
  const { templates, mutate: mutateTemplates } = useConsentTemplates();
  const { clauses, mutate: mutateClauses } = useConsentClauses();
  const { codeTables, mutate: mutateCodeTables } = useCodeTables();
  const { systems, mutate: mutateExternalSystems } = useExternalSystems();
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ConsentTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ConsentTemplate | null>(null);

  const findClause = (templateId: number, typeCode: string): ConsentClause | undefined =>
    clauses.find(
      (c) => c.template_document_id === templateId && c.clause_type_code === typeCode,
    );

  const clausesForTemplate = (templateId: number) =>
    clauses.filter((c) => c.template_document_id === templateId);

  const clauseText = (clause: ConsentClause) =>
    i18n.language === "en" ? clause.clause_en : clause.clause_fr;

  const refresh = () => {
    mutateTemplates();
    mutateClauses();
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    try {
      await api.delete(`/consent-templates/${deleteTemplate.id}`);
      refresh();
    } finally {
      setDeleteTemplate(null);
    }
  };

  const openEdit = (tpl: ConsentTemplate) => {
    setEditTemplate(tpl);
    setTemplateDialogOpen(true);
  };

  const openCreate = () => {
    setEditTemplate(null);
    setTemplateDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />
      <div className="p-8">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
        >
          {/* Users section */}
          <AccordionItem value="users">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="opacity-50 cursor-not-allowed">
                    <AccordionTrigger disabled>
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="size-5 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">{t("admin.users")}</div>
                          <div className="text-sm text-muted-foreground">
                            {t("admin.users_description")}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t("admin.coming_soon")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </AccordionItem>

          {/* Consent forms section */}
          <AccordionItem value="consents">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">{t("admin.consents")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("admin.consents_description")}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.consents")}</CardTitle>
                  <CardAction>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="size-4 mr-2" />
                      {t("admin.add_template")}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.no_templates")}
                    </p>
                  ) : (
                    <TooltipProvider delayDuration={200}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4 font-medium">
                              {t("admin.template_name")}
                            </th>
                            {CLAUSE_TYPES.map((ct) => (
                              <th
                                key={ct}
                                className="py-2 px-4 font-medium text-center"
                              >
                                {t(`enums.clause_type.${ct}`)}
                              </th>
                            ))}
                            <th className="py-2 px-4 font-medium text-center">
                              {t("admin.template_file")}
                            </th>
                            <th className="py-2 pl-4 font-medium text-center">
                              {t("common.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.map((tpl) => (
                            <tr key={tpl.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">{tpl.name}</td>
                              {CLAUSE_TYPES.map((ct) => {
                                const clause = findClause(tpl.id, ct);
                                return (
                                  <td key={ct} className="py-2 px-4 text-center">
                                    {clause ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex cursor-default">
                                            <Check className="size-4 text-green-600" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="bottom"
                                          className="max-w-sm text-left"
                                        >
                                          {clauseText(clause)}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <span className="inline-flex">
                                        <X className="size-4 text-red-500" />
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-4 text-center">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`/api/documents/${tpl.id}/file`} download>
                                    <Download className="size-4" />
                                  </a>
                                </Button>
                              </td>
                              <td className="py-2 pl-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={tpl.has_consents}
                                          onClick={() => openEdit(tpl)}
                                        >
                                          <Pencil className="size-4" />
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {tpl.has_consents && (
                                      <TooltipContent>
                                        {t("admin.template_cannot_edit")}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={tpl.has_consents}
                                          onClick={() => setDeleteTemplate(tpl)}
                                        >
                                          <Trash2 className={`size-4 ${tpl.has_consents ? "" : "text-destructive"}`} />
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {tpl.has_consents && (
                                      <TooltipContent>
                                        {t("admin.template_cannot_delete")}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TooltipProvider>
                  )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Code tables section */}
          <AccordionItem value="code-tables">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Database className="size-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">{t("admin.code_tables.title")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("admin.code_tables.description")}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {codeTables.map((ct) => (
                  <CodeTableCard
                    key={ct.table}
                    table={ct.table}
                    entries={ct.entries}
                    referencedCodes={ct.referenced_codes}
                    onMutate={mutateCodeTables}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* External systems section */}
          <AccordionItem value="external-systems">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Link className="size-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">{t("admin.external_systems.title")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("admin.external_systems.description")}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ExternalSystemCard
                systems={systems}
                onMutate={mutateExternalSystems}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <ConsentTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSuccess={refresh}
        editTemplateId={editTemplate?.id}
        editTemplateName={editTemplate?.name}
        editFileName={editTemplate?.file_name}
        editClauses={editTemplate ? clausesForTemplate(editTemplate.id) : undefined}
      />

      <AlertDialog
        open={deleteTemplate !== null}
        onOpenChange={(o) => { if (!o) setDeleteTemplate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.delete_template_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.delete_template_confirm", { name: deleteTemplate?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
