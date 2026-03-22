package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// ReportsSummaryHandler returns aggregated summary statistics.
//
// @Summary     Get report summary
// @Description Returns summary statistics as of a given date (defaults to today)
// @Tags        reports
// @Produce     json
// @Param       report_date query string false "Report date (YYYY-MM-DD), defaults to today"
// @Success     200 {object} types.ReportsSummary
// @Router      /reports/summary [get]
func ReportsSummaryHandler(repo *repository.ReportsRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		reportDate := time.Now()

		if rd := c.Query("report_date"); rd != "" {
			parsed, err := time.Parse("2006-01-02", rd)
			if err != nil {
				c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid report_date format (expected YYYY-MM-DD)"})
				return
			}
			// Set to end of day to include all participants created on that date
			reportDate = parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}

		summary, err := repo.GetSummary(reportDate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to compute summary"})
			return
		}
		c.JSON(http.StatusOK, summary)
	}
}
