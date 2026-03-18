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
//
// @Summary     List consents for a participant
// @Description Returns all consent records for the given participant, including clause and signer details
// @Tags        consents
// @Produce     json
// @Param       id path int true "Participant ID"
// @Success     200 {array}  types.Consent
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants/{id}/consents [get]
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
//
// @Summary     List consent clauses
// @Description Returns all consent clauses, optionally filtered by template document ID
// @Tags        consents
// @Produce     json
// @Param       template_document_id query int false "Filter by template document ID"
// @Success     200 {array}  types.ConsentClause
// @Failure     500 {object} types.ErrorResponse
// @Router      /consent-clauses [get]
func ListConsentClausesHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var templateID *int
		if tid := c.Query("template_document_id"); tid != "" {
			var id int
			if _, err := fmt.Sscanf(tid, "%d", &id); err == nil {
				templateID = &id
			}
		}
		clauses, err := consentRepo.ListClauses(templateID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch clauses"})
			return
		}
		c.JSON(http.StatusOK, clauses)
	}
}

// ListConsentTemplatesHandler returns all consent template documents.
//
// @Summary     List consent templates
// @Description Returns all consent template documents
// @Tags        consents
// @Produce     json
// @Success     200 {array}  types.Document
// @Failure     500 {object} types.ErrorResponse
// @Router      /consent-templates [get]
func ListConsentTemplatesHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		templates, err := consentRepo.ListConsentTemplates()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch templates"})
			return
		}
		c.JSON(http.StatusOK, templates)
	}
}

// CreateConsentRequest represents the payload for creating a consent.
// Fields: ClauseID (required), StatusCode (required), Date in YYYY-MM-DD format (required),
// optional SignedByID (contact who signed), and optional DocumentID (linked template document).
type CreateConsentRequest struct {
	ClauseID   int    `json:"clause_id" binding:"required"`
	StatusCode string `json:"status_code" binding:"required"`
	Date       string `json:"date" binding:"required"`
	SignedByID *int   `json:"signed_by_id"`
	DocumentID *int   `json:"document_id"`
}

// CreateParticipantConsentHandler creates a consent for a participant.
//
// @Summary     Create a consent for a participant
// @Description Creates a new consent record. Fails with 409 if a consent for the same clause already exists.
// @Tags        consents
// @Accept      json
// @Produce     json
// @Param       id   path int                  true "Participant ID"
// @Param       body body CreateConsentRequest  true "Consent data"
// @Success     201 {object} types.Consent
// @Failure     400 {object} types.ErrorResponse
// @Failure     409 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants/{id}/consents [post]
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

		// Check for duplicate: same participant + same clause
		exists, err := consentRepo.ExistsByClause(participantID, req.ClauseID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check existing consents"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: "A consent for this clause already exists for this participant"})
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
			DocumentID:    req.DocumentID,
		}

		if err := consentRepo.Create(&consent); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create consent"})
			return
		}

		// Record activity
		author := getAuthor(c)
		details := fmt.Sprintf("%s — %s", req.StatusCode, req.Date)
		if err := activityRepo.Record(consentRepo.DB(), "consent_added", &participantID, author, &details); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to record activity"})
			return
		}

		c.JSON(http.StatusCreated, consent)
	}
}

// UpdateConsentRequest represents the payload for updating an existing consent.
// Fields: StatusCode (required), Date in YYYY-MM-DD format (required),
// optional SignedByID (contact who signed), and optional DocumentID (linked template document).
type UpdateConsentRequest struct {
	StatusCode string `json:"status_code" binding:"required"`
	Date       string `json:"date" binding:"required"`
	SignedByID *int   `json:"signed_by_id"`
	DocumentID *int   `json:"document_id"`
}

// UpdateConsentHandler updates an existing consent (status, date, signer, document).
//
// @Summary     Update a consent
// @Description Updates an existing consent's status, date, signer, and/or linked document
// @Tags        consents
// @Accept      json
// @Produce     json
// @Param       consentId path int                  true "Consent ID"
// @Param       body      body UpdateConsentRequest  true "Updated consent data"
// @Success     200 {object} types.Consent
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /consents/{consentId} [put]
func UpdateConsentHandler(consentRepo *repository.ConsentRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var consentID int
		if _, err := fmt.Sscanf(c.Param("consentId"), "%d", &consentID); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid consent ID"})
			return
		}

		consent, err := consentRepo.FindByID(consentID)
		if err != nil {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Consent not found"})
			return
		}

		var req UpdateConsentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date format"})
			return
		}

		oldStatus := consent.StatusCode
		consent.StatusCode = req.StatusCode
		consent.Date = date
		consent.SignedByID = req.SignedByID
		consent.DocumentID = req.DocumentID

		if err := consentRepo.Update(&consent); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update consent"})
			return
		}

		// Record activity if status changed
		if oldStatus != req.StatusCode {
			author := getAuthor(c)
			details := fmt.Sprintf("%s → %s", oldStatus, req.StatusCode)
			if err := activityRepo.Record(consentRepo.DB(), "consent_edited", &consent.ParticipantID, author, &details); err != nil {
				c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to record activity"})
				return
			}
		}

		c.JSON(http.StatusOK, consent)
	}
}
