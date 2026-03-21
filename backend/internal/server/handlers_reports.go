package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// ReportsSummaryHandler returns aggregated summary statistics.
//
// @Summary     Get report summary
// @Description Returns summary statistics (counts, averages, growth by quarter)
// @Tags        reports
// @Produce     json
// @Success     200 {object} types.ReportsSummary
// @Router      /reports/summary [get]
func ReportsSummaryHandler(repo *repository.ReportsRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		summary, err := repo.GetSummary()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to compute summary"})
			return
		}
		c.JSON(http.StatusOK, summary)
	}
}
