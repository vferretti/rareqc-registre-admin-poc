package server

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
)

// SearchHandler returns suggestions matching a query across participants and contacts.
//
// @Summary     Global search
// @Description Returns search suggestions matching a query across participants and contacts. Requires at least 2 characters.
// @Tags        search
// @Produce     json
// @Param       q query string true "Search query (min 2 characters)"
// @Success     200 {array}  repository.SearchSuggestion
// @Router      /search [get]
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
