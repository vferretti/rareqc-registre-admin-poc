import ExcelJS from "exceljs";
import { enumLabel } from "@/lib/enum-label";
import { formatDate, formatPhone, formatAddress, todayISO } from "@/lib/format";
import type { Participant, Contact, EnumsResponse } from "@/types/participant";
import type {
  CartExportData,
  ConsentExportRow,
  ExternalIDExportRow,
} from "@/types/cart";

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

/** Generates and downloads a multi-sheet Excel report for cart participants. */
export async function generateCartExcelReport(
  data: CartExportData,
  enums: EnumsResponse | undefined,
  lang: string,
  t: TFunc,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const participants = [...data.participants].sort((a, b) => a.id - b.id);

  buildParticipantsSheet(wb, participants, enums, lang, t);
  buildConsentsSheet(wb, participants, data.consents, enums, lang, t);
  buildExternalIDsSheet(wb, participants, data.external_ids, t);
  buildGUIDsSheet(wb, participants, t);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport_participants_${todayISO()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function finalizeSheet(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  // Auto-fit column widths based on content
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });
}

// ── Sheet 1: Participants ──────────────────────────────────────────

function buildParticipantsSheet(
  wb: ExcelJS.Workbook,
  participants: Participant[],
  enums: EnumsResponse | undefined,
  lang: string,
  t: TFunc,
) {
  const ws = wb.addWorksheet(t("report.sheet_participants"));

  // Determine max number of non-self contacts across all participants
  const maxContacts = participants.reduce((max, p) => {
    const count = (p.contacts ?? []).filter(
      (c) => c.relationship_code !== "self",
    ).length;
    return Math.max(max, count);
  }, 0);

  // Build header
  const headers = [
    t("report.col_id"),
    t("report.col_first_name"),
    t("report.col_last_name"),
    t("report.col_dob"),
    t("report.col_sex"),
    t("report.col_ramq"),
    t("report.col_vital_status"),
    // Self contact columns
    t("report.col_email"),
    t("report.col_phone"),
    t("report.col_address"),
    t("report.col_city"),
    t("report.col_province"),
    t("report.col_postal_code"),
    t("report.col_language"),
  ];

  // Dynamic contact columns
  for (let i = 1; i <= maxContacts; i++) {
    const prefix = `${t("report.col_contact")} ${i}`;
    headers.push(
      `${prefix} — ${t("report.col_name")}`,
      `${prefix} — ${t("report.col_relationship")}`,
      `${prefix} — ${t("report.col_primary")}`,
      `${prefix} — ${t("report.col_email")}`,
      `${prefix} — ${t("report.col_phone")}`,
    );
  }

  ws.addRow(headers);

  for (const p of participants) {
    const self = p.contacts?.find((c) => c.relationship_code === "self");
    const others = (p.contacts ?? [])
      .filter((c) => c.relationship_code !== "self")
      .sort((a, b) =>
        a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1,
      );

    const row: (string | number | null)[] = [
      p.id,
      p.first_name,
      p.last_name,
      formatDate(p.date_of_birth),
      enumLabel(enums?.sex_at_birth, p.sex_at_birth_code, lang),
      p.ramq ?? "",
      enumLabel(enums?.vital_status, p.vital_status_code, lang),
      self?.email ?? "",
      formatPhone(self?.phone),
      self
        ? formatAddress(
            self.apartment_number,
            self.street_address,
            self.city,
            self.province,
            self.code_postal,
          )
        : "",
      self?.city ?? "",
      self?.province ?? "",
      self?.code_postal ?? "",
      self ? t(`enums.language.${self.preferred_language}`) : "",
    ];

    for (let i = 0; i < maxContacts; i++) {
      const c: Contact | undefined = others[i];
      if (c) {
        row.push(
          `${c.first_name} ${c.last_name}`,
          enumLabel(enums?.relationship, c.relationship_code, lang),
          c.is_primary ? t("report.col_yes") : "",
          c.email ?? "",
          formatPhone(c.phone),
        );
      } else {
        row.push("", "", "", "", "");
      }
    }

    ws.addRow(row);
  }

  finalizeSheet(ws);
}

// ── Sheet 2: Consents ──────────────────────────────────────────────

function buildConsentsSheet(
  wb: ExcelJS.Workbook,
  participants: Participant[],
  consents: ConsentExportRow[],
  enums: EnumsResponse | undefined,
  lang: string,
  t: TFunc,
) {
  const ws = wb.addWorksheet(t("report.sheet_consents"));

  // Determine all distinct clause types from enum data
  const clauseTypes = enums?.clause_type?.map((ct) => ct.code) ?? [];

  const headers = [
    t("report.col_id"),
    t("report.col_first_name"),
    t("report.col_last_name"),
    ...clauseTypes.map((ct) => enumLabel(enums?.clause_type, ct, lang)),
  ];
  ws.addRow(headers);

  // Index consents by participant_id → clause_type_code → status
  const consentMap = new Map<number, Map<string, string>>();
  for (const c of consents) {
    if (!consentMap.has(c.participant_id)) {
      consentMap.set(c.participant_id, new Map());
    }
    consentMap.get(c.participant_id)!.set(c.clause_type_code, c.status_code);
  }

  for (const p of participants) {
    const pConsents = consentMap.get(p.id);
    const row: (string | number)[] = [
      p.id,
      p.first_name,
      p.last_name,
      ...clauseTypes.map((ct) => {
        const status = pConsents?.get(ct);
        return status ? enumLabel(enums?.consent_status, status, lang) : "";
      }),
    ];
    ws.addRow(row);
  }

  finalizeSheet(ws);
}

// ── Sheet 3: External IDs ──────────────────────────────────────────

function buildExternalIDsSheet(
  wb: ExcelJS.Workbook,
  participants: Participant[],
  extIDs: ExternalIDExportRow[],
  t: TFunc,
) {
  const ws = wb.addWorksheet(t("report.sheet_external_ids"));

  // Determine all distinct system names
  const systems = [...new Set(extIDs.map((e) => e.system_name))].sort();

  const headers = [
    t("report.col_id"),
    t("report.col_first_name"),
    t("report.col_last_name"),
    ...systems,
  ];
  ws.addRow(headers);

  // Index by participant_id → system_name → external_id
  const idMap = new Map<number, Map<string, string>>();
  for (const e of extIDs) {
    if (!idMap.has(e.participant_id)) {
      idMap.set(e.participant_id, new Map());
    }
    idMap.get(e.participant_id)!.set(e.system_name, e.external_id);
  }

  for (const p of participants) {
    const pIDs = idMap.get(p.id);
    ws.addRow([
      p.id,
      p.first_name,
      p.last_name,
      ...systems.map((s) => pIDs?.get(s) ?? ""),
    ]);
  }

  finalizeSheet(ws);
}

// ── Sheet 4: GUIDs ─────────────────────────────────────────────────

function buildGUIDsSheet(
  wb: ExcelJS.Workbook,
  participants: Participant[],
  t: TFunc,
) {
  const ws = wb.addWorksheet(t("report.sheet_guids"));

  ws.addRow([
    t("report.col_id"),
    t("report.col_first_name"),
    t("report.col_last_name"),
    t("report.col_guid_basic"),
    t("report.col_guid_ramq"),
    t("report.col_guid_birthplace"),
  ]);

  for (const p of participants) {
    ws.addRow([
      p.id,
      p.first_name,
      p.last_name,
      p.guid?.guid_basic ?? "",
      p.guid?.guid_ramq ?? "",
      p.guid?.guid_birthplace ?? "",
    ]);
  }

  finalizeSheet(ws);
}
