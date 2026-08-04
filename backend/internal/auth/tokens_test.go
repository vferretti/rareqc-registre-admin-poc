package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// mintToken builds a signed HS256 JWT for tests. The session code path never
// verifies signatures (tokens come from our own signed cookies), so any key
// works.
func mintToken(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte("test-key"))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return signed
}

func TestIsTokenValid(t *testing.T) {
	future := time.Now().Add(time.Hour).Unix()
	past := time.Now().Add(-time.Hour).Unix()

	cases := []struct {
		name  string
		token string
		want  bool
	}{
		{"empty", "", false},
		{"garbage", "not-a-jwt", false},
		{"expired", mintToken(t, jwt.MapClaims{"exp": past}), false},
		{"valid", mintToken(t, jwt.MapClaims{"exp": future}), true},
		{"no expiry", mintToken(t, jwt.MapClaims{"sub": "x"}), true},
	}
	for _, tc := range cases {
		if got := isTokenValid(tc.token); got != tc.want {
			t.Errorf("%s: isTokenValid = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestDecodeClaimsRoles(t *testing.T) {
	token := mintToken(t, jwt.MapClaims{
		"sub":          "abc-123",
		"name":         "Test User",
		"realm_access": map[string]any{"roles": []string{"participant", "offline_access"}},
	})

	claims, ok := decodeClaims(token)
	if !ok {
		t.Fatal("decodeClaims failed on a well-formed token")
	}
	if claims.Subject != "abc-123" {
		t.Errorf("Subject = %q", claims.Subject)
	}
	if !claims.hasRole("participant") {
		t.Error("hasRole(participant) should be true")
	}
	if claims.hasRole(RoleAdmin) {
		t.Error("hasRole(registre_admin) should be false")
	}
}
