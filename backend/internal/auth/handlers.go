package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

// Service implements the BFF OAuth2 flows against Keycloak, mirroring
// radiant-portal's auth.server.ts (login, callback, refresh, logout).
type Service struct {
	cfg      Config
	sessions *sessions
	oauth    *oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// NewService wires the OAuth2 client and the Bearer JWT verifier.
func NewService(cfg Config) *Service {
	oauthCfg := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI(),
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
		Endpoint: oauth2.Endpoint{
			// Browser-facing redirect uses the public host; the code→token
			// exchange happens server-side and uses the internal host.
			AuthURL:  cfg.oauth2URL("auth"),
			TokenURL: cfg.internalOauth2URL("token"),
		},
	}

	// Bearer tokens (scripts/services) are fully verified: signature against
	// the Keycloak JWKS, issuer as stamped in the tokens (public URL).
	keySet := oidc.NewRemoteKeySet(context.Background(), cfg.internalOauth2URL("certs"))
	verifier := oidc.NewVerifier(cfg.Issuer(), keySet, &oidc.Config{
		// Keycloak sets aud=account by default; the realm role check is our
		// authorization gate, so skip strict audience matching.
		SkipClientIDCheck: true,
	})

	return &Service{cfg: cfg, sessions: newSessions(cfg), oauth: oauthCfg, verifier: verifier}
}

// RegisterRoutes mounts the public auth endpoints on the /api group.
func (s *Service) RegisterRoutes(api *gin.RouterGroup) {
	api.GET("/auth/login", s.loginHandler)
	api.GET("/auth/callback", s.callbackHandler)
	api.POST("/auth/logout", s.logoutHandler)
	api.GET("/auth/me", s.meHandler)
}

// loginHandler starts the OAuth2 code flow: state in a short-lived cookie
// (radiant's "oauth2" cookie), then redirect to the Keycloak login page.
func (s *Service) loginHandler(c *gin.Context) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "state generation failed"})
		return
	}
	state := base64.RawURLEncoding.EncodeToString(buf)
	if err := s.sessions.set(c, cookieOAuthState, state, 300); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session error"})
		return
	}
	c.Redirect(http.StatusFound, s.oauth.AuthCodeURL(state))
}

// callbackHandler mirrors radiant's login(): exchange the code for tokens,
// fetch userinfo, store user + tokens in the three session cookies, redirect
// to the portal.
func (s *Service) callbackHandler(c *gin.Context) {
	var expectedState string
	if !s.sessions.get(c, cookieOAuthState, &expectedState) ||
		c.Query("state") != expectedState || c.Query("state") == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
		return
	}
	s.sessions.clear(c, cookieOAuthState)

	tokens, err := s.oauth.Exchange(c.Request.Context(), c.Query("code"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "code exchange failed"})
		return
	}

	user, err := s.fetchUserInfo(c.Request.Context(), tokens.AccessToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "userinfo failed"})
		return
	}

	refreshToken, _ := tokens.Extra("refresh_token").(string)
	if err := s.commitSession(c, user, tokens.AccessToken, refreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session error"})
		return
	}
	c.Redirect(http.StatusFound, s.cfg.PortalHost+"/home")
}

// logoutHandler mirrors radiant's logout(): back-channel Keycloak logout with
// the refresh token, then destroy the session cookies.
func (s *Service) logoutHandler(c *gin.Context) {
	if refreshToken, ok := s.sessions.sessionRefreshToken(c); ok {
		body := url.Values{
			"refresh_token": {refreshToken},
			"client_id":     {s.cfg.ClientID},
			"client_secret": {s.cfg.ClientSecret},
		}
		req, _ := http.NewRequestWithContext(c.Request.Context(), http.MethodPost,
			s.cfg.internalOauth2URL("logout"), strings.NewReader(body.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if resp, err := http.DefaultClient.Do(req); err == nil {
			resp.Body.Close()
		}
	}
	s.sessions.clearSession(c)
	c.JSON(http.StatusOK, gin.H{"status": "logged_out"})
}

// meHandler returns the session user with their realm roles (for the SPA).
func (s *Service) meHandler(c *gin.Context) {
	user, ok := s.sessions.sessionUser(c)
	token, tokenOK := s.sessions.sessionAccessToken(c)
	if !ok || !tokenOK {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	// Refresh transparently if the access token expired (radiant's refreshAccessToken).
	if !isTokenValid(token) {
		newToken, err := s.refreshAccessToken(c)
		if err != nil {
			s.sessions.clearSession(c)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}
		token = newToken
	}

	roles := []string{}
	if claims, ok := decodeClaims(token); ok {
		roles = claims.RealmAccess.Roles
	}
	c.JSON(http.StatusOK, gin.H{
		"sub":                user.Sub,
		"name":               user.Name,
		"email":              user.Email,
		"preferred_username": user.PreferredUsername,
		"given_name":         user.GivenName,
		"family_name":        user.FamilyName,
		"roles":              roles,
	})
}

// refreshAccessToken mirrors radiant's refreshAccessToken: exchange the
// refresh token for a new access token and re-commit the cookie. Returns an
// error when the refresh token itself is invalid (→ caller logs out).
func (s *Service) refreshAccessToken(c *gin.Context) (string, error) {
	refreshToken, ok := s.sessions.sessionRefreshToken(c)
	if !ok || !isTokenValid(refreshToken) {
		return "", fmt.Errorf("refresh token invalid")
	}

	src := s.oauth.TokenSource(c.Request.Context(), &oauth2.Token{RefreshToken: refreshToken})
	tokens, err := src.Token()
	if err != nil {
		return "", err
	}

	if err := s.sessions.set(c, cookieAccessToken, tokens.AccessToken, 0); err != nil {
		return "", err
	}
	// Keycloak rotates refresh tokens: persist the new one when provided.
	if tokens.RefreshToken != "" && tokens.RefreshToken != refreshToken {
		if err := s.sessions.set(c, cookieRefreshToken, tokens.RefreshToken, 0); err != nil {
			return "", err
		}
	}
	return tokens.AccessToken, nil
}

// fetchUserInfo calls the Keycloak userinfo endpoint (radiant does the same
// in its OAuth2Strategy verify callback).
func (s *Service) fetchUserInfo(ctx context.Context, accessToken string) (User, error) {
	var user User
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.cfg.internalOauth2URL("userinfo"), nil)
	if err != nil {
		return user, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return user, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return user, fmt.Errorf("userinfo returned %d", resp.StatusCode)
	}
	return user, json.NewDecoder(resp.Body).Decode(&user)
}

// commitSession stores user + tokens in the three session cookies
// (radiant's login() commit).
func (s *Service) commitSession(c *gin.Context, user User, accessToken, refreshToken string) error {
	if err := s.sessions.set(c, cookieUser, user, 0); err != nil {
		return err
	}
	if err := s.sessions.set(c, cookieAccessToken, accessToken, 0); err != nil {
		return err
	}
	return s.sessions.set(c, cookieRefreshToken, refreshToken, 0)
}
