package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// MapParticipantPoint represents a participant's location on the map.
type MapParticipantPoint struct {
	ID        int     `json:"id"`
	City      string  `json:"city"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// MapParticipantsHandler returns geocoded participant locations for map display.
//
// @Summary     Get participant map points
// @Description Returns latitude/longitude for all participants with geocoded self contacts
// @Tags        map
// @Produce     json
// @Success     200 {array} MapParticipantPoint
// @Router      /map/participants [get]
func MapParticipantsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var points []MapParticipantPoint
		if err := db.Raw(`
			SELECT p.id, c.city, c.latitude, c.longitude
			FROM participant p
			JOIN contact c ON c.participant_id = p.id
			WHERE c.relationship_code = 'self'
			  AND c.latitude IS NOT NULL
			  AND c.longitude IS NOT NULL
		`).Scan(&points).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch map data"})
			return
		}
		c.JSON(http.StatusOK, points)
	}
}
