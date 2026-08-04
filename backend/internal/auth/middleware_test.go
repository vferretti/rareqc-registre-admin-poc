package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func testConfig() Config {
	return Config{
		KeycloakHost:            "http://localhost:8081",
		KeycloakInternalHost:    "http://localhost:8081",
		Realm:                   "rareqc",
		ClientID:                "registre-admin-bff",
		ClientSecret:            "test-secret",
		ParticipantClientID:     "portail-participant-bff",
		ParticipantClientSecret: "test-participant-secret",
		ParticipantPortalHosts:  []string{"http://localhost:5174", "http://localhost:3002"},
		SessionSecret:           "test-session-secret",
		PortalHost:              "http://localhost:5173",
	}
}

// sessionRequest builds a request carrying valid signed session cookies for
// a user whose access token holds the given realm roles.
func sessionRequest(t *testing.T, svc *Service, target string, roles []string) *http.Request {
	t.Helper()
	token := mintToken(t, jwt.MapClaims{
		"sub":          "user-sub-1",
		"name":         "Test User",
		"exp":          time.Now().Add(time.Hour).Unix(),
		"realm_access": map[string]any{"roles": roles},
	})

	encUser, err := svc.sessions.codec.Encode(cookieUser, User{Sub: "user-sub-1", Name: "Test User"})
	if err != nil {
		t.Fatalf("failed to encode user cookie: %v", err)
	}
	encToken, err := svc.sessions.codec.Encode(cookieAccessToken, token)
	if err != nil {
		t.Fatalf("failed to encode token cookie: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, target, nil)
	req.AddCookie(&http.Cookie{Name: cookieUser, Value: encUser})
	req.AddCookie(&http.Cookie{Name: cookieAccessToken, Value: encToken})
	return req
}

func protectedRouter(svc *Service, role string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", svc.Middleware(role), func(c *gin.Context) {
		c.String(http.StatusOK, UserSub(c))
	})
	return r
}

func TestMiddlewareRejectsAnonymous(t *testing.T) {
	svc := NewService(testConfig())
	r := protectedRouter(svc, RoleAdmin)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
	if w.Code != http.StatusUnauthorized {
		t.Errorf("anonymous request: status = %d, want 401", w.Code)
	}
}

func TestMiddlewareRejectsInvalidBearer(t *testing.T) {
	svc := NewService(testConfig())
	r := protectedRouter(svc, RoleAdmin)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("invalid bearer: status = %d, want 401", w.Code)
	}
}

func TestMiddlewareEnforcesRolePerGroup(t *testing.T) {
	svc := NewService(testConfig())

	cases := []struct {
		name         string
		requiredRole string
		userRoles    []string
		wantStatus   int
	}{
		{"admin on admin group", RoleAdmin, []string{RoleAdmin}, http.StatusOK},
		{"participant on admin group", RoleAdmin, []string{RoleParticipant}, http.StatusForbidden},
		{"participant on participant group", RoleParticipant, []string{RoleParticipant}, http.StatusOK},
		{"admin on participant group", RoleParticipant, []string{RoleAdmin}, http.StatusForbidden},
		{"no roles", RoleAdmin, []string{}, http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := protectedRouter(svc, tc.requiredRole)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, sessionRequest(t, svc, "/protected", tc.userRoles))
			if w.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tc.wantStatus)
			}
			if tc.wantStatus == http.StatusOK && w.Body.String() != "user-sub-1" {
				t.Errorf("UserSub not exposed: body = %q", w.Body.String())
			}
		})
	}
}

func TestMiddlewareExpiredSessionWithoutRefresh(t *testing.T) {
	svc := NewService(testConfig())
	r := protectedRouter(svc, RoleAdmin)

	// Expired access token and no refresh-token cookie → 401, session cleared.
	token := mintToken(t, jwt.MapClaims{
		"sub":          "user-sub-1",
		"exp":          time.Now().Add(-time.Hour).Unix(),
		"realm_access": map[string]any{"roles": []string{RoleAdmin}},
	})
	encUser, _ := svc.sessions.codec.Encode(cookieUser, User{Sub: "user-sub-1"})
	encToken, _ := svc.sessions.codec.Encode(cookieAccessToken, token)
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(&http.Cookie{Name: cookieUser, Value: encUser})
	req.AddCookie(&http.Cookie{Name: cookieAccessToken, Value: encToken})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expired session: status = %d, want 401", w.Code)
	}
}
