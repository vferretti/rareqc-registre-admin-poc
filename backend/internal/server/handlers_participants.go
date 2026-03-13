package server

import (
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

func ListParticipantsHandler(db *gorm.DB) gin.HandlerFunc {
	// Allowed sort fields to prevent SQL injection
	allowedSortFields := map[string]string{
		"id":                "id",
		"first_name":        "first_name",
		"last_name":         "last_name",
		"date_of_birth":     "date_of_birth",
		"sex_at_birth_code": "sex_at_birth_code",
		"vital_status_code": "vital_status_code",
		"ramq":              "ramq",
		"created_at":        "created_at",
		"updated_at":        "updated_at",
	}

	return func(c *gin.Context) {
		params := parsePaginationParams(c, "last_name")

		query := db.Model(&types.Participant{})

		// Search filter (accent-insensitive via unaccent extension)
		if params.Search != "" {
			term := "%" + strings.ToLower(params.Search) + "%"
			query = query.Where(
				"LOWER(unaccent(first_name)) LIKE unaccent(?) OR LOWER(unaccent(last_name)) LIKE unaccent(?) OR ramq LIKE ?",
				term, term, term,
			)
		}

		// Count total
		var total int64
		if err := query.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count participants"})
			return
		}

		// Sort
		sortCol, ok := allowedSortFields[params.SortField]
		if !ok {
			sortCol = "last_name"
		}
		order := sortCol
		if params.SortOrder == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}

		// Fetch page
		var participants []types.Participant
		err := query.
			Order(order).
			Offset(params.PageIndex * params.PageSize).
			Limit(params.PageSize).
			Find(&participants).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participants"})
			return
		}

		totalPages := int(math.Ceil(float64(total) / float64(params.PageSize)))

		c.JSON(http.StatusOK, types.PaginatedResponse[types.Participant]{
			Data:       participants,
			Total:      int(total),
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}
