package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"golang.org/x/oauth2/clientcredentials"
)

// AdminUser is a Keycloak account holding the registre_admin realm role,
// as listed (read-only) in the administration page. Account management
// itself happens in the Keycloak console.
type AdminUser struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Enabled   bool   `json:"enabled" validate:"required"`
	// ServiceAccount marks machine clients (service-account-*) that hold
	// the role — worth surfacing in an access review.
	ServiceAccount bool `json:"service_account" validate:"required"`
}

// ListAdminUsers queries the Keycloak admin API for the users holding the
// registre_admin realm role. The BFF authenticates with its own service
// account (client_credentials), which only carries the realm-management
// view-users role — read-only by design.
func (s *Service) ListAdminUsers(ctx context.Context) ([]AdminUser, error) {
	cc := clientcredentials.Config{
		ClientID:     s.cfg.ClientID,
		ClientSecret: s.cfg.ClientSecret,
		TokenURL:     s.cfg.internalOauth2URL("token"),
	}

	endpoint := fmt.Sprintf("%s/admin/realms/%s/roles/%s/users?max=500",
		s.cfg.KeycloakInternalHost, url.PathEscape(s.cfg.Realm), url.PathEscape(RoleAdmin))
	resp, err := cc.Client(ctx).Get(endpoint)
	if err != nil {
		return nil, fmt.Errorf("keycloak admin API call failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("keycloak admin API returned %d (is the view-users role granted to the %s service account?)",
			resp.StatusCode, s.cfg.ClientID)
	}

	var raw []struct {
		Username  string `json:"username"`
		Email     string `json:"email"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Enabled   bool   `json:"enabled"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode keycloak response: %w", err)
	}

	users := make([]AdminUser, 0, len(raw))
	for _, u := range raw {
		users = append(users, AdminUser{
			Username:       u.Username,
			Email:          u.Email,
			FirstName:      u.FirstName,
			LastName:       u.LastName,
			Enabled:        u.Enabled,
			ServiceAccount: strings.HasPrefix(u.Username, "service-account-"),
		})
	}
	return users, nil
}
