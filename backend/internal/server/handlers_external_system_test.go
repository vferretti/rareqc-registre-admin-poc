package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// mockExternalSystemDAO implements repository.ExternalSystemDAO with
// overridable functions — the pattern for testing handlers without a DB.
type mockExternalSystemDAO struct {
	list   func() ([]repository.ExternalSystemResponse, error)
	create func(*types.ExternalSystem) error
	update func(int, string, string, string) error
	delete func(int) error
}

func (m *mockExternalSystemDAO) List() ([]repository.ExternalSystemResponse, error) {
	return m.list()
}
func (m *mockExternalSystemDAO) Create(s *types.ExternalSystem) error { return m.create(s) }
func (m *mockExternalSystemDAO) Update(id int, name, fr, en string) error {
	return m.update(id, name, fr, en)
}
func (m *mockExternalSystemDAO) Delete(id int) error { return m.delete(id) }

func performRequest(handler gin.HandlerFunc, method, path, body string, params ...gin.Param) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	} else {
		reader = strings.NewReader("")
	}
	c.Request = httptest.NewRequest(method, path, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = params
	handler(c)
	// Flush the deferred status header (the Gin engine normally does this
	// at the end of the handler chain).
	c.Writer.WriteHeaderNow()
	return w
}

func TestListExternalSystems(t *testing.T) {
	repo := &mockExternalSystemDAO{
		list: func() ([]repository.ExternalSystemResponse, error) {
			return []repository.ExternalSystemResponse{
				{ExternalSystem: types.ExternalSystem{Name: "CQDG"}, IsReferenced: true},
			}, nil
		},
	}
	w := performRequest(ListExternalSystemsHandler(repo), http.MethodGet, "/external-systems", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var got []repository.ExternalSystemResponse
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || len(got) != 1 || got[0].Name != "CQDG" {
		t.Errorf("unexpected body: %s", w.Body.String())
	}
}

func TestListExternalSystemsError(t *testing.T) {
	repo := &mockExternalSystemDAO{
		list: func() ([]repository.ExternalSystemResponse, error) { return nil, errors.New("db down") },
	}
	w := performRequest(ListExternalSystemsHandler(repo), http.MethodGet, "/external-systems", "")
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}
}

func TestCreateExternalSystem(t *testing.T) {
	cases := []struct {
		name       string
		body       string
		repoErr    error
		wantStatus int
	}{
		{"valid", `{"name":"CQGC","title_fr":"Centre québécois","title_en":"Quebec centre"}`, nil, http.StatusCreated},
		{"missing fields", `{"name":"CQGC"}`, nil, http.StatusBadRequest},
		{"malformed json", `{`, nil, http.StatusBadRequest},
		{"duplicate", `{"name":"CQGC","title_fr":"a","title_en":"b"}`, errors.New("already exists"), http.StatusConflict},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockExternalSystemDAO{
				create: func(*types.ExternalSystem) error { return tc.repoErr },
			}
			w := performRequest(CreateExternalSystemHandler(repo), http.MethodPost, "/external-systems", tc.body)
			if w.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tc.wantStatus)
			}
		})
	}
}

func TestDeleteExternalSystem(t *testing.T) {
	cases := []struct {
		name       string
		id         string
		repoErr    error
		wantStatus int
	}{
		{"ok", "3", nil, http.StatusNoContent},
		{"invalid id", "abc", nil, http.StatusBadRequest},
		{"referenced", "3", errors.New("system is referenced"), http.StatusConflict},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockExternalSystemDAO{
				delete: func(int) error { return tc.repoErr },
			}
			w := performRequest(DeleteExternalSystemHandler(repo), http.MethodDelete, "/external-systems/"+tc.id, "",
				gin.Param{Key: "id", Value: tc.id})
			if w.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tc.wantStatus)
			}
		})
	}
}
