import { useTranslation } from "react-i18next";
import { Badge } from "@/components/base/badges/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { Skeleton } from "@/components/base/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";

function displayName(user: AdminUser) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.username;
}

/**
 * Read-only table of the Keycloak accounts holding the registre_admin
 * role. Account management (creation, roles, deactivation) happens in the
 * Keycloak console.
 */
export function AdminUsersSection() {
  const { t } = useTranslation();
  const { users, error, isLoading } = useAdminUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.users")}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive">{t("admin.users_error")}</p>
        )}
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!error && !isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.user_name")}</TableHead>
                <TableHead>{t("admin.user_email")}</TableHead>
                <TableHead>{t("admin.user_username")}</TableHead>
                <TableHead>{t("admin.user_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">
                    {displayName(user)}
                  </TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {user.username}
                      {user.service_account && (
                        <Badge variant="neutral">
                          {t("admin.user_service_account")}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.enabled ? (
                      <Badge variant="green">{t("admin.user_enabled")}</Badge>
                    ) : (
                      <Badge variant="destructive">
                        {t("admin.user_disabled")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-sm text-muted-foreground mt-4">
          {t("admin.users_managed_in_keycloak")}
        </p>
      </CardContent>
    </Card>
  );
}
