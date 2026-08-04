// Package auth implements the BFF (backend-for-frontend) authentication
// against Keycloak, mirroring the radiant-portal design: the backend is the
// confidential OIDC client, tokens live in signed httpOnly cookies and never
// reach the browser JavaScript.
package auth

import (
	"fmt"
	"log"
	"os"
	"strings"
)

// Config holds the Keycloak/BFF settings. Env var names mirror radiant-portal
// (.env.schema): KEYCLOAK_HOST, KEYCLOAK_REALM, KEYCLOAK_CLIENT,
// KEYCLOAK_CLIENT_SECRET, SESSION_SECRET, PORTAL_HOST.
type Config struct {
	// KeycloakHost is the browser-reachable Keycloak base URL (e.g. http://localhost:8081).
	KeycloakHost string
	// KeycloakInternalHost is the server-side reachable base URL (defaults to
	// KeycloakHost; differs when the API runs in a container: http://keycloak:8080).
	KeycloakInternalHost string
	Realm                string
	ClientID             string
	ClientSecret         string
	// SessionSecret signs the session cookies.
	SessionSecret string
	// PortalHost is the public URL of the portal (redirect URI base), e.g. http://localhost:5173.
	PortalHost string
	// ParticipantClientID and ParticipantClientSecret are the confidential
	// OIDC client used when the request originates from the participant
	// portal (A6). All other origins use ClientID/ClientSecret.
	ParticipantClientID     string
	ParticipantClientSecret string
	// ParticipantPortalHosts lists the origins served by the participant
	// portal (comma-separated in PARTICIPANT_PORTAL_HOSTS). They must match
	// the redirect URIs registered on the participant client in the realm.
	ParticipantPortalHosts []string
	// CookieSecure toggles the Secure flag on cookies (true outside dev).
	CookieSecure bool
}

// Realm roles enforced per route group: admin routes require RoleAdmin,
// participant routes (/me/...) require RoleParticipant.
const (
	RoleAdmin       = "registre_admin"
	RoleParticipant = "participant"
)

// insecure dev defaults, aligned with rareqc-infra's dev realm.
const (
	devSessionSecret           = "dev-only-session-secret-change-me"
	devClientSecret            = "dev-only-registre-admin-secret"
	devParticipantClientSecret = "dev-only-portail-participant-secret"
)

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// LoadConfig reads the auth configuration from the environment, falling back
// to dev defaults (with a warning) so `go run` works out of the box.
func LoadConfig() Config {
	cfg := Config{
		KeycloakHost:            getEnvOrDefault("KEYCLOAK_HOST", "http://localhost:8081"),
		Realm:                   getEnvOrDefault("KEYCLOAK_REALM", "rareqc"),
		ClientID:                getEnvOrDefault("KEYCLOAK_CLIENT", "registre-admin-bff"),
		ClientSecret:            getEnvOrDefault("KEYCLOAK_CLIENT_SECRET", devClientSecret),
		ParticipantClientID:     getEnvOrDefault("KEYCLOAK_PARTICIPANT_CLIENT", "portail-participant-bff"),
		ParticipantClientSecret: getEnvOrDefault("KEYCLOAK_PARTICIPANT_CLIENT_SECRET", devParticipantClientSecret),
		ParticipantPortalHosts:  splitHosts(getEnvOrDefault("PARTICIPANT_PORTAL_HOSTS", "http://localhost:5174,http://localhost:3002")),
		SessionSecret:           getEnvOrDefault("SESSION_SECRET", devSessionSecret),
		PortalHost:              getEnvOrDefault("PORTAL_HOST", "http://localhost:5173"),
		CookieSecure:            getEnvOrDefault("COOKIE_SECURE", "false") == "true",
	}
	cfg.KeycloakInternalHost = getEnvOrDefault("KEYCLOAK_INTERNAL_HOST", cfg.KeycloakHost)

	if cfg.SessionSecret == devSessionSecret || cfg.ClientSecret == devClientSecret ||
		cfg.ParticipantClientSecret == devParticipantClientSecret {
		log.Println("WARNING: auth is using dev-only secrets — set SESSION_SECRET, KEYCLOAK_CLIENT_SECRET and KEYCLOAK_PARTICIPANT_CLIENT_SECRET outside dev")
	}
	return cfg
}

// splitHosts parses a comma-separated origin list, trimming whitespace and
// trailing slashes so entries compare equal to request origins.
func splitHosts(raw string) []string {
	var hosts []string
	for _, h := range strings.Split(raw, ",") {
		if h = strings.TrimRight(strings.TrimSpace(h), "/"); h != "" {
			hosts = append(hosts, h)
		}
	}
	return hosts
}

// oauth2URL builds a Keycloak openid-connect endpoint URL, mirroring
// radiant's getKeycloakOauth2Url. Public endpoints (browser redirects) use
// KeycloakHost; server-side calls use the internal variant.
func (c Config) oauth2URL(endpoint string) string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/%s", c.KeycloakHost, c.Realm, endpoint)
}

func (c Config) internalOauth2URL(endpoint string) string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/%s", c.KeycloakInternalHost, c.Realm, endpoint)
}

// Issuer returns the token issuer as seen by browsers and scripts
// (Keycloak stamps tokens with the public URL).
func (c Config) Issuer() string {
	return fmt.Sprintf("%s/realms/%s", c.KeycloakHost, c.Realm)
}

// RedirectURI is the OAuth2 callback URL registered in the realm.
func (c Config) RedirectURI() string {
	return c.PortalHost + "/api/auth/callback"
}
