package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// ListParticipantConsentsHandler returns all consents for a participant.
func ListParticipantConsentsHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var participantID int
		if _, err := fmt.Sscanf(c.Param("id"), "%d", &participantID); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid participant ID"})
			return
		}

		consents, err := consentRepo.ListByParticipant(participantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch consents"})
			return
		}

		c.JSON(http.StatusOK, consents)
	}
}

// ListConsentClausesHandler returns all available consent clauses.
func ListConsentClausesHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		clauses, err := consentRepo.ListClauses()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch clauses"})
			return
		}
		c.JSON(http.StatusOK, clauses)
	}
}

// CreateConsentRequest represents the payload for creating a consent.
type CreateConsentRequest struct {
	ClauseID   int    `json:"clause_id" binding:"required"`
	StatusCode string `json:"status_code" binding:"required"`
	Date       string `json:"date" binding:"required"`
	SignedByID *int   `json:"signed_by_id"`
}

// CreateParticipantConsentHandler creates a consent for a participant.
func CreateParticipantConsentHandler(consentRepo *repository.ConsentRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var participantID int
		if _, err := fmt.Sscanf(c.Param("id"), "%d", &participantID); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid participant ID"})
			return
		}

		var req CreateConsentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date format"})
			return
		}

		consent := types.Consent{
			ClauseID:      req.ClauseID,
			ParticipantID: participantID,
			Date:          date,
			StatusCode:    req.StatusCode,
			SignedByID:    req.SignedByID,
		}

		if err := consentRepo.Create(&consent); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create consent"})
			return
		}

		// Record activity
		author := getAuthor(c)
		details := fmt.Sprintf("%s — %s", req.StatusCode, req.Date)
		activityRepo.Record(consentRepo.DB(), "consent_added", &participantID, author, &details)

		c.JSON(http.StatusCreated, consent)
	}
}
