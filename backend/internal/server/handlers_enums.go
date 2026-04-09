package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// EnumsResponse groups all reference data returned by GET /api/enums.
type EnumsResponse struct {
	SexAtBirth              []types.SexAtBirth              `json:"sex_at_birth"`
	VitalStatus             []types.VitalStatus             `json:"vital_status"`
	Relationship            []types.Relationship            `json:"relationship"`
	ActionType              []types.ActionType              `json:"action_type"`
	ConsentStatus           []types.ConsentStatus           `json:"consent_status"`
	ClauseType              []types.ClauseType              `json:"clause_type"`
	CommunicationMethods    []types.CommunicationMethod     `json:"communication_methods"`
	CommunicationSubjects   []types.CommunicationSubject    `json:"communication_subjects"`
	PhoneOutcomes           []types.PhoneOutcome            `json:"phone_outcomes"`
	EmailOutcomes           []types.EmailOutcome            `json:"email_outcomes"`
}

// EnumsHandler returns all reference table data.
//
// @Summary     Get all enums
// @Description Returns all reference data
// @Tags        system
// @Produce     json
// @Success     200 {object} EnumsResponse
// @Router      /enums [get]
func EnumsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var resp EnumsResponse
		db.Order("code").Find(&resp.SexAtBirth)
		db.Order("code").Find(&resp.VitalStatus)
		db.Order("code").Find(&resp.Relationship)
		db.Order("code").Find(&resp.ActionType)
		db.Order("code").Find(&resp.ConsentStatus)
		db.Order("code").Find(&resp.ClauseType)
		db.Order("code").Find(&resp.CommunicationMethods)
		db.Order("code").Find(&resp.CommunicationSubjects)
		db.Order("code").Find(&resp.PhoneOutcomes)
		db.Order("code").Find(&resp.EmailOutcomes)
		c.JSON(http.StatusOK, resp)
	}
}
