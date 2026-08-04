package auth

import (
	"reflect"
	"strings"
	"testing"
)

func clearAuthEnv(t *testing.T) {
	t.Helper()
	for _, k := range []string{
		"KEYCLOAK_HOST", "KEYCLOAK_INTERNAL_HOST", "KEYCLOAK_REALM",
		"KEYCLOAK_CLIENT", "KEYCLOAK_CLIENT_SECRET",
		"KEYCLOAK_PARTICIPANT_CLIENT", "KEYCLOAK_PARTICIPANT_CLIENT_SECRET",
		"PARTICIPANT_PORTAL_HOSTS", "SESSION_SECRET", "PORTAL_HOST", "COOKIE_SECURE",
	} {
		t.Setenv(k, "")
	}
}

func TestLoadConfigDevDefaults(t *testing.T) {
	clearAuthEnv(t)

	cfg, err := LoadConfig(false)
	if err != nil {
		t.Fatalf("LoadConfig(false) with dev defaults should pass: %v", err)
	}
	if cfg.ClientID != "registre-admin-bff" {
		t.Errorf("ClientID = %q", cfg.ClientID)
	}
	if cfg.ParticipantClientID != "portail-participant-bff" {
		t.Errorf("ParticipantClientID = %q", cfg.ParticipantClientID)
	}
	want := []string{"http://localhost:5174", "http://localhost:3002"}
	if !reflect.DeepEqual(cfg.ParticipantPortalHosts, want) {
		t.Errorf("ParticipantPortalHosts = %v, want %v", cfg.ParticipantPortalHosts, want)
	}
}

func TestLoadConfigProductionRejectsDevSecrets(t *testing.T) {
	clearAuthEnv(t)

	_, err := LoadConfig(true)
	if err == nil {
		t.Fatal("LoadConfig(true) with dev secrets should fail")
	}
	for _, want := range []string{"SESSION_SECRET", "KEYCLOAK_CLIENT_SECRET", "KEYCLOAK_PARTICIPANT_CLIENT_SECRET"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error should mention %s, got: %v", want, err)
		}
	}
}

func TestLoadConfigProductionAcceptsRealSecrets(t *testing.T) {
	clearAuthEnv(t)
	t.Setenv("SESSION_SECRET", "real-session-secret")
	t.Setenv("KEYCLOAK_CLIENT_SECRET", "real-client-secret")
	t.Setenv("KEYCLOAK_PARTICIPANT_CLIENT_SECRET", "real-participant-secret")

	if _, err := LoadConfig(true); err != nil {
		t.Fatalf("LoadConfig(true) with real secrets should pass: %v", err)
	}
}

func TestSplitHosts(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"http://a:1,http://b:2", []string{"http://a:1", "http://b:2"}},
		{" http://a:1 , http://b:2/ ", []string{"http://a:1", "http://b:2"}},
		{"http://a:1,,", []string{"http://a:1"}},
		{"", nil},
	}
	for _, tc := range cases {
		if got := splitHosts(tc.in); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("splitHosts(%q) = %v, want %v", tc.in, got, tc.want)
		}
	}
}
