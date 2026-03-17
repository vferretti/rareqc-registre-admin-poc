package server

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
)

// SearchHandler returns suggestions matching a query across participants and contacts.
func SearchHandler(repo *repository.SearchRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := strings.TrimSpace(c.Query("q"))
		if len(q) < 2 {
			c.JSON(http.StatusOK, []repository.SearchSuggestion{})
			return
		}
		c.JSON(http.StatusOK, repo.Search(q))
	}
}
