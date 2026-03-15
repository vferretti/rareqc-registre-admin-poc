package server

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ActivityLogResponse extends ActivityLog with the participant's full name for display purposes.
type ActivityLogResponse struct {
	types.ActivityLog
	ParticipantName *string `json:"participant_name,omitempty"`
}

// activitySortFields maps allowed query sort fields to their qualified column names.
var activitySortFields = map[string]string{
	"id":               "activity_logs.id",
	"created_at":       "activity_logs.created_at",
	"action_type_code": "activity_logs.action_type_code",
	"author":           "activity_logs.author",
}

// buildActivityOrder returns the SQL ORDER BY clause for activity log queries.
func buildActivityOrder(params types.PaginationParams) string {
	sortCol, ok := activitySortFields[params.SortField]
	if !ok {
		sortCol = "activity_logs.created_at"
	}
	if params.SortOrder == "desc" {
		return sortCol + " DESC"
	}
	return sortCol + " ASC"
}

// defaultDescParams returns pagination params with default sort order set to "desc" (most recent first).
func defaultDescParams(c *gin.Context) types.PaginationParams {
	params := parsePaginationParams(c, "created_at")
	if params.SortOrder == "asc" && c.Query("sort_order") == "" {
		params.SortOrder = "desc"
	}
	return params
}

// toActivityLogResponses converts ActivityLog models to API responses, attaching participant names when available.
func toActivityLogResponses(logs []types.ActivityLog, includeName bool) []ActivityLogResponse {
	responses := make([]ActivityLogResponse, len(logs))
	for i, log := range logs {
		responses[i] = ActivityLogResponse{ActivityLog: log}
		if includeName && log.Participant != nil {
			name := log.Participant.FirstName + " " + log.Participant.LastName
			responses[i].ParticipantName = &name
		}
	}
	return responses
}

// fetchPaginatedLogs runs a paginated query on activity logs and returns the JSON response.
func fetchPaginatedLogs(c *gin.Context, query *gorm.DB, params types.PaginationParams, includeName bool) {
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count activity logs"})
		return
	}

	order := buildActivityOrder(params)

	if includeName {
		query = query.Preload("Participant")
	}

	var logs []types.ActivityLog
	err := query.
		Order(order).
		Offset(params.PageIndex * params.PageSize).
		Limit(params.PageSize).
		Find(&logs).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch activity logs"})
		return
	}

	c.JSON(http.StatusOK, types.PaginatedResponse[ActivityLogResponse]{
		Data:       toActivityLogResponses(logs, includeName),
		Total:      int(total),
		PageIndex:  params.PageIndex,
		PageSize:   params.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(params.PageSize))),
	})
}

// ListActivityLogsHandler returns a paginated list of all activity logs with participant names.
func ListActivityLogsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		params := defaultDescParams(c)
		query := db.Model(&types.ActivityLog{})

		if pid := c.Query("participant_id"); pid != "" {
			query = query.Where("participant_id = ?", pid)
		}

		fetchPaginatedLogs(c, query, params, true)
	}
}

// ListParticipantActivityLogsHandler returns a paginated list of activity logs for a specific participant.
func ListParticipantActivityLogsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		participantID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid participant ID"})
			return
		}

		var count int64
		if err := db.Model(&types.Participant{}).Where("id = ?", participantID).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check participant"})
			return
		}
		if count == 0 {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Participant not found"})
			return
		}

		params := defaultDescParams(c)
		query := db.Model(&types.ActivityLog{}).Where("participant_id = ?", participantID)

		fetchPaginatedLogs(c, query, params, false)
	}
}
