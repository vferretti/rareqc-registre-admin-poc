package auth

import (
	"crypto/sha256"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/securecookie"
)

// Cookie names mirror radiant-portal's three session cookies.
const (
	cookieUser         = "session.user"
	cookieAccessToken  = "session.token"
	cookieRefreshToken = "session.r.token"
	// cookieOAuthState holds the OAuth2 state during the login redirect
	// (radiant's remix-auth uses an equivalent "oauth2" cookie).
	cookieOAuthState = "oauth2"
)

// User is the session user identity, mirroring radiant's IAuthUser
// (Keycloak userinfo response).
type User struct {
	Sub               string `json:"sub"`
	EmailVerified     bool   `json:"email_verified"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
	Email             string `json:"email"`
}

// sessions signs and reads the httpOnly session cookies.
type sessions struct {
	codec  *securecookie.SecureCookie
	secure bool
}

func newSessions(cfg Config) *sessions {
	// Derive a fixed-size hash key from the secret (securecookie wants 32/64 bytes).
	key := sha256.Sum256([]byte(cfg.SessionSecret))
	return &sessions{
		codec:  securecookie.New(key[:], nil), // signed, like radiant's cookie sessions
		secure: cfg.CookieSecure,
	}
}

func (s *sessions) set(c *gin.Context, name string, value interface{}, maxAge int) error {
	encoded, err := s.codec.Encode(name, value)
	if err != nil {
		return err
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     name,
		Value:    encoded,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (s *sessions) get(c *gin.Context, name string, dst interface{}) bool {
	cookie, err := c.Cookie(name)
	if err != nil {
		return false
	}
	return s.codec.Decode(name, cookie, dst) == nil
}

func (s *sessions) clear(c *gin.Context, names ...string) {
	for _, name := range names {
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   s.secure,
			SameSite: http.SameSiteLaxMode,
		})
	}
}

// clearSession destroys the three session cookies (radiant's clearSession).
func (s *sessions) clearSession(c *gin.Context) {
	s.clear(c, cookieUser, cookieAccessToken, cookieRefreshToken)
}

// sessionUser returns the user stored in the session cookie (radiant's getSessionUser).
func (s *sessions) sessionUser(c *gin.Context) (User, bool) {
	var u User
	ok := s.get(c, cookieUser, &u)
	return u, ok
}

// sessionAccessToken returns the access token cookie (radiant's getSessionAccessToken).
func (s *sessions) sessionAccessToken(c *gin.Context) (string, bool) {
	var t string
	ok := s.get(c, cookieAccessToken, &t)
	return t, ok
}

// sessionRefreshToken returns the refresh token cookie (radiant's getSessionRefreshToken).
func (s *sessions) sessionRefreshToken(c *gin.Context) (string, bool) {
	var t string
	ok := s.get(c, cookieRefreshToken, &t)
	return t, ok
}
