package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func requestWithHost(host, forwardedProto string) *gin.Context {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	c.Request.Host = host
	if forwardedProto != "" {
		c.Request.Header.Set("X-Forwarded-Proto", forwardedProto)
	}
	return c
}

func TestClientForOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := NewService(testConfig())

	cases := []struct {
		host       string
		wantClient string
	}{
		{"localhost:5173", "registre-admin-bff"},
		{"localhost:8080", "registre-admin-bff"},
		{"registre.example.org", "registre-admin-bff"},
		{"localhost:5174", "portail-participant-bff"},
		{"localhost:3002", "portail-participant-bff"},
	}
	for _, tc := range cases {
		client := svc.clientFor(requestWithHost(tc.host, ""))
		if client.id != tc.wantClient {
			t.Errorf("host %s: client = %s, want %s", tc.host, client.id, tc.wantClient)
		}
	}
}

func TestRequestOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := NewService(testConfig())

	if got := svc.requestOrigin(requestWithHost("localhost:5174", "")); got != "http://localhost:5174" {
		t.Errorf("requestOrigin = %q", got)
	}
	// Behind a TLS-terminating proxy, X-Forwarded-Proto wins.
	if got := svc.requestOrigin(requestWithHost("registre.example.org", "https")); got != "https://registre.example.org" {
		t.Errorf("requestOrigin with X-Forwarded-Proto = %q", got)
	}
}

func TestLoginRedirectUsesOriginClient(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := NewService(testConfig())
	r := gin.New()
	svc.RegisterRoutes(r.Group("/api"))

	req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	req.Host = "localhost:5174"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Fatalf("login: status = %d, want 302", w.Code)
	}
	loc := w.Header().Get("Location")
	if !strings.Contains(loc, "client_id=portail-participant-bff") {
		t.Errorf("participant origin should use participant client, got: %s", loc)
	}
	if !strings.Contains(loc, "redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fapi%2Fauth%2Fcallback") {
		t.Errorf("redirect_uri should point back to the participant origin, got: %s", loc)
	}
	if !strings.Contains(loc, "code_challenge_method=S256") {
		t.Errorf("login must use PKCE S256 (realm requirement), got: %s", loc)
	}
}
