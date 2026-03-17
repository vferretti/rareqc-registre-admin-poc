package server

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// ListActivityLogsHandler returns a paginated list of all activity logs with participant names.
func ListActivityLogsHandler(repo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		params := defaultDescParams(c)

		p := repository.ListParams{
			PaginationParams: params,
			ActionType:       c.Query("action_type"),
			Search:           c.Query("search"),
			IncludeName:      true,
		}
		if pid := c.Query("participant_id"); pid != "" {
			id, _ := strconv.Atoi(pid)
			p.ParticipantID = &id
		}

		responses, total, totalPages, err := repo.List(p)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch activity logs"})
			return
		}

		c.JSON(http.StatusOK, types.PaginatedResponse[repository.ActivityLogResponse]{
			Data:       responses,
			Total:      total,
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

// ListParticipantActivityLogsHandler returns a paginated list of activity logs for a specific participant.
func ListParticipantActivityLogsHandler(participantRepo *repository.ParticipantRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		participantID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid participant ID"})
			return
		}

		exists, err := participantRepo.Exists(participantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check participant"})
			return
		}
		if !exists {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Participant not found"})
			return
		}

		params := defaultDescParams(c)
		p := repository.ListParams{
			PaginationParams: params,
			ParticipantID:    &participantID,
			IncludeName:      false,
		}

		responses, total, totalPages, err := activityRepo.List(p)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch activity logs"})
			return
		}

		c.JSON(http.StatusOK, types.PaginatedResponse[repository.ActivityLogResponse]{
			Data:       responses,
			Total:      total,
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

// defaultDescParams returns pagination params with default sort order set to "desc" (most recent first).
func defaultDescParams(c *gin.Context) types.PaginationParams {
	params := parsePaginationParams(c, "created_at")
	if params.SortOrder == "asc" && c.Query("sort_order") == "" {
		params.SortOrder = "desc"
	}
	return params
}
