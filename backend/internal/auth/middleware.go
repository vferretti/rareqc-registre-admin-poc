package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Gin context keys for the authenticated identity.
const (
	ctxSub   = "auth.sub"
	ctxName  = "auth.name"
	ctxRoles = "auth.roles"
)

// UserSub returns the authenticated user's Keycloak subject (stable ID).
func UserSub(c *gin.Context) string {
	return c.GetString(ctxSub)
}

// UserName returns the authenticated user's display name.
func UserName(c *gin.Context) string {
	return c.GetString(ctxName)
}

// Middleware protects API routes in dual mode:
//   - `Authorization: Bearer` (scripts/services): full JWT verification
//     against the Keycloak JWKS;
//   - session cookies (portal users): radiant-style requireAuth — token
//     present and unexpired, with transparent refresh when expired.
//
// In both modes the realm role cfg.RequiredRole is enforced (403 otherwise)
// and the identity is stored in the Gin context.
func (s *Service) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if header := c.GetHeader("Authorization"); strings.HasPrefix(header, "Bearer ") {
			s.authenticateBearer(c, strings.TrimPrefix(header, "Bearer "))
			return
		}
		s.authenticateSession(c)
	}
}

// authenticateBearer verifies an externally-supplied JWT (signature, issuer,
// expiry) and enforces the required role.
func (s *Service) authenticateBearer(c *gin.Context, rawToken string) {
	if _, err := s.verifier.Verify(c.Request.Context(), rawToken); err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	claims, ok := decodeClaims(rawToken)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	s.authorize(c, claims)
}

// authenticateSession mirrors radiant's requireAuth + refreshAccessToken:
// valid session cookies, transparent refresh on expiry, otherwise 401.
func (s *Service) authenticateSession(c *gin.Context) {
	user, userOK := s.sessions.sessionUser(c)
	token, tokenOK := s.sessions.sessionAccessToken(c)
	if !userOK || !tokenOK {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	if !isTokenValid(token) {
		newToken, err := s.refreshAccessToken(c)
		if err != nil {
			s.sessions.clearSession(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}
		token = newToken
	}

	claims, ok := decodeClaims(token)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}
	// Prefer the userinfo identity stored at login for the display name.
	if user.Name != "" {
		claims.Name = user.Name
	}
	s.authorize(c, claims)
}

// authorize enforces the required realm role and exposes the identity.
func (s *Service) authorize(c *gin.Context, claims *tokenClaims) {
	if !claims.hasRole(s.cfg.RequiredRole) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "missing required role"})
		return
	}

	name := claims.Name
	if name == "" {
		name = claims.PreferredUsername
	}
	if name == "" {
		name = claims.Subject
	}
	c.Set(ctxSub, claims.Subject)
	c.Set(ctxName, name)
	c.Set(ctxRoles, claims.RealmAccess.Roles)
	c.Next()
}
