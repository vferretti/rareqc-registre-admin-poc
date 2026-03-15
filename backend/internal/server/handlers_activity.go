package server

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

type ActivityLogResponse struct {
	types.ActivityLog
	ParticipantName *string `json:"participant_name,omitempty"`
}

func ListActivityLogsHandler(db *gorm.DB) gin.HandlerFunc {
	allowedSortFields := map[string]string{
		"id":               "activity_logs.id",
		"created_at":       "activity_logs.created_at",
		"action_type_code": "activity_logs.action_type_code",
		"author":           "activity_logs.author",
	}

	return func(c *gin.Context) {
		params := parsePaginationParams(c, "created_at")
		if params.SortOrder == "asc" && c.Query("sort_order") == "" {
			params.SortOrder = "desc"
		}

		query := db.Model(&types.ActivityLog{})

		// Optional participant filter
		if pid := c.Query("participant_id"); pid != "" {
			query = query.Where("participant_id = ?", pid)
		}

		// Count total
		var total int64
		if err := query.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count activity logs"})
			return
		}

		// Sort
		sortCol, ok := allowedSortFields[params.SortField]
		if !ok {
			sortCol = "activity_logs.created_at"
		}
		order := sortCol
		if params.SortOrder == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}

		// Fetch page with participant join for name
		var logs []types.ActivityLog
		err := query.
			Preload("Participant").
			Order(order).
			Offset(params.PageIndex * params.PageSize).
			Limit(params.PageSize).
			Find(&logs).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch activity logs"})
			return
		}

		// Build response with participant names
		responses := make([]ActivityLogResponse, len(logs))
		for i, log := range logs {
			responses[i] = ActivityLogResponse{ActivityLog: log}
			if log.Participant != nil {
				name := log.Participant.FirstName + " " + log.Participant.LastName
				responses[i].ParticipantName = &name
			}
		}

		totalPages := int(math.Ceil(float64(total) / float64(params.PageSize)))

		c.JSON(http.StatusOK, types.PaginatedResponse[ActivityLogResponse]{
			Data:       responses,
			Total:      int(total),
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

func ListParticipantActivityLogsHandler(db *gorm.DB) gin.HandlerFunc {
	allowedSortFields := map[string]string{
		"id":               "activity_logs.id",
		"created_at":       "activity_logs.created_at",
		"action_type_code": "activity_logs.action_type_code",
		"author":           "activity_logs.author",
	}

	return func(c *gin.Context) {
		participantID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid participant ID"})
			return
		}

		// Check participant exists
		var count int64
		if err := db.Model(&types.Participant{}).Where("id = ?", participantID).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check participant"})
			return
		}
		if count == 0 {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Participant not found"})
			return
		}

		params := parsePaginationParams(c, "created_at")
		if params.SortOrder == "asc" && c.Query("sort_order") == "" {
			params.SortOrder = "desc"
		}

		query := db.Model(&types.ActivityLog{}).Where("participant_id = ?", participantID)

		// Count total
		var total int64
		if err := query.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count activity logs"})
			return
		}

		// Sort
		sortCol, ok := allowedSortFields[params.SortField]
		if !ok {
			sortCol = "activity_logs.created_at"
		}
		order := sortCol
		if params.SortOrder == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}

		// Fetch page
		var logs []types.ActivityLog
		err = query.
			Order(order).
			Offset(params.PageIndex * params.PageSize).
			Limit(params.PageSize).
			Find(&logs).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch activity logs"})
			return
		}

		// Build response (no participant name needed since it's scoped)
		responses := make([]ActivityLogResponse, len(logs))
		for i, log := range logs {
			responses[i] = ActivityLogResponse{ActivityLog: log}
		}

		totalPages := int(math.Ceil(float64(total) / float64(params.PageSize)))

		c.JSON(http.StatusOK, types.PaginatedResponse[ActivityLogResponse]{
			Data:       responses,
			Total:      int(total),
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}
