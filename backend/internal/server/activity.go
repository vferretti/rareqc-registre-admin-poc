package server

import (
	"registre-admin/internal/types"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func recordActivity(tx *gorm.DB, actionTypeCode string, participantID *int, author string, details *string) error {
	log := types.ActivityLog{
		ActionTypeCode: actionTypeCode,
		ParticipantID:  participantID,
		Author:         author,
		Details:        details,
	}
	return tx.Create(&log).Error
}

func getAuthor(c *gin.Context) string {
	author := c.GetHeader("X-Author")
	if author == "" {
		return "John Smith"
	}
	return author
}
