package server

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/auth"
	"registre-admin/internal/types"
)

// ListAdminUsersHandler returns the Keycloak accounts holding the
// registre_admin role. Read-only: account management happens in the
// Keycloak console.
//
// @Summary     List administrator accounts
// @Description Returns the Keycloak accounts holding the registre_admin realm role (read-only)
// @Tags        admin
// @Produce     json
// @Success     200 {array} auth.AdminUser
// @Failure     500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router      /admin-users [get]
func ListAdminUsersHandler(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		users, err := authService.ListAdminUsers(c.Request.Context())
		if err != nil {
			slog.Error("failed to list admin users", "error", err)
			c.JSON(http.StatusInternalServerError,
				types.ErrorResponse{Error: "Failed to list administrator accounts"})
			return
		}
		c.JSON(http.StatusOK, users)
	}
}
