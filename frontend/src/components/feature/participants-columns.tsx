import { useMemo } from "react";
import { Link } from "react-router";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/base/table/sortable-header";
import { TextCell, DateCell, BadgeCell } from "@/components/base/table/cells";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SEX_BADGE,
  VITAL_STATUS_BADGE,
  CONSENT_STATUS_ICON,
  CONSENT_STATUS_COLOR,
} from "@/lib/badge-variants";
import { enumLabel } from "@/lib/enum-label";
import type { EnumsResponse } from "@/types/participant";
import type { Participant } from "@/types/participant";

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

interface UseParticipantsColumnsOptions {
  t: TFunc;
  lang: string;
  enums: EnumsResponse | undefined;
  participants: Participant[];
  selectedParticipantIds: Set<number>;
  addParticipants: (ids: number[]) => void;
  removeParticipants: (ids: number[]) => void;
}

export function useParticipantsColumns({
  t,
  lang,
  enums,
  participants,
  selectedParticipantIds,
  addParticipants,
  removeParticipants,
}: UseParticipantsColumnsOptions) {
  return useMemo<ColumnDef<Participant>[]>(
    () => [
      {
        id: "cart",
        size: 40,
        header: () => {
          const pageIds = participants.map((p) => p.id);
          const allInCart =
            pageIds.length > 0 &&
            pageIds.every((id) => selectedParticipantIds.has(id));
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full cursor-pointer"
              onClick={() => {
                if (allInCart) {
                  removeParticipants(pageIds);
                } else {
                  const toAdd = pageIds.filter(
                    (id) => !selectedParticipantIds.has(id),
                  );
                  addParticipants(toAdd);
                }
              }}
            >
              <ShoppingCart
                className={cn(
                  "size-4",
                  allInCart
                    ? "text-primary fill-primary/20"
                    : "text-muted-foreground",
                )}
              />
            </button>
          );
        },
        cell: ({ row }) => {
          const id = row.original.id;
          const inCart = selectedParticipantIds.has(id);
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (inCart) {
                  removeParticipants([id]);
                } else {
                  addParticipants([id]);
                }
              }}
            >
              <ShoppingCart
                className={cn(
                  "size-4",
                  inCart
                    ? "text-primary fill-primary/20"
                    : "text-muted-foreground",
                )}
              />
            </button>
          );
        },
      },
      {
        accessorKey: "id",
        size: 80,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.id")}
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <Link
            to={`/participants/${row.original.id}`}
            className="text-primary underline hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: "last_name",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.last_name")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">
            <TextCell>{getValue<string>()}</TextCell>
          </span>
        ),
      },
      {
        accessorKey: "first_name",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.first_name")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <TextCell>{getValue<string>()}</TextCell>,
      },
      {
        accessorKey: "date_of_birth",
        size: 130,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.date_of_birth")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <DateCell date={getValue<string | null>()} />,
      },
      {
        accessorKey: "sex_at_birth_code",
        size: 120,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.sex_at_birth")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={SEX_BADGE[code] ?? "secondary"}>
              {enumLabel(enums?.sex_at_birth, code, lang)}
            </BadgeCell>
          );
        },
      },
      {
        accessorKey: "vital_status_code",
        size: 120,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.vital_status")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={VITAL_STATUS_BADGE[code] ?? "secondary"}>
              {enumLabel(enums?.vital_status, code, lang)}
            </BadgeCell>
          );
        },
      },
      {
        accessorKey: "ramq",
        size: 150,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.ramq")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <TextCell>
            <span className="font-mono">{getValue<string | null>()}</span>
          </TextCell>
        ),
      },
      {
        id: "consent",
        header: () => (
          <span className="text-center w-full block font-semibold">
            {t("participants.columns.consent")}
          </span>
        ),
        columns: (
          [
            "consent_registry",
            "consent_recontact",
            "consent_external_linkage",
          ] as const
        ).map((key) => ({
          accessorKey: key,
          size: 90,
          header: () => (
            <span className="text-center w-full block text-xs">
              {t(`participants.columns.${key}`)}
            </span>
          ),
          cell: ({ getValue }: { getValue: () => string | null }) => {
            const code = getValue();
            if (!code)
              return (
                <span className="block text-center text-muted-foreground">
                  —
                </span>
              );
            const Icon = CONSENT_STATUS_ICON[code] ?? CheckCircle2;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex justify-center">
                    <Icon
                      className={`size-4 ${CONSENT_STATUS_COLOR[code] ?? "text-muted-foreground"}`}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {enumLabel(enums?.consent_status, code, lang)}
                </TooltipContent>
              </Tooltip>
            );
          },
        })),
      },
      {
        accessorKey: "created_at",
        size: 130,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.created_at")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <DateCell date={getValue<string | null>()} />,
      },
    ],
    [
      t,
      lang,
      enums,
      participants,
      selectedParticipantIds,
      addParticipants,
      removeParticipants,
    ],
  );
}
