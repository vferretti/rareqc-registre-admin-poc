package server

import (
	"registre-admin/internal/types"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// recordActivity inserts an activity log entry within the given transaction.
func recordActivity(tx *gorm.DB, actionTypeCode string, participantID *int, author string, details *string) error {
	log := types.ActivityLog{
		ActionTypeCode: actionTypeCode,
		ParticipantID:  participantID,
		Author:         author,
		Details:        details,
	}
	return tx.Create(&log).Error
}

// getAuthor extracts the author name from the X-Author header, falling back to a default value.
func getAuthor(c *gin.Context) string {
	author := c.GetHeader("X-Author")
	if author == "" {
		return "John Smith"
	}
	return author
}
