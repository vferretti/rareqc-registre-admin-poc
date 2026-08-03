package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// tokenClaims are the JWT claims we read from Keycloak tokens.
type tokenClaims struct {
	jwt.RegisteredClaims
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	Email             string `json:"email"`
	RealmAccess       struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
}

var jwtParser = jwt.NewParser()

// decodeClaims parses a JWT WITHOUT verifying its signature. Only safe for
// tokens taken from our own signed session cookies (the BFF obtained them
// directly from Keycloak) — Bearer tokens from the outside are verified
// against the Keycloak JWKS in the middleware instead.
func decodeClaims(token string) (*tokenClaims, bool) {
	claims := &tokenClaims{}
	if _, _, err := jwtParser.ParseUnverified(token, claims); err != nil {
		return nil, false
	}
	return claims, true
}

// isTokenValid mirrors radiant's tokens.ts: decode and check the expiry.
func isTokenValid(token string) bool {
	if token == "" {
		return false
	}
	claims, ok := decodeClaims(token)
	if !ok {
		return false
	}
	if claims.ExpiresAt == nil {
		return true
	}
	return claims.ExpiresAt.After(time.Now())
}

// hasRole reports whether the claims carry the given realm role.
func (c *tokenClaims) hasRole(role string) bool {
	for _, r := range c.RealmAccess.Roles {
		if r == role {
			return true
		}
	}
	return false
}
