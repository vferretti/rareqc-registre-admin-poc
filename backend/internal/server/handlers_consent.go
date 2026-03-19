package server

import (
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
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
	type templateResponse struct {
		types.Document
		HasConsents bool `json:"has_consents"`
	}
	return func(c *gin.Context) {
		templates, err := consentRepo.ListConsentTemplates()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch templates"})
			return
		}
		results := make([]templateResponse, len(templates))
		for i, tpl := range templates {
			has, _ := consentRepo.HasConsentsForTemplate(tpl.ID)
			results[i] = templateResponse{Document: tpl, HasConsents: has}
		}
		c.JSON(http.StatusOK, results)
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

// CreateConsentTemplateClause represents a clause in the create-template request.
type CreateConsentTemplateClause struct {
	ClauseFr       string `json:"clause_fr"`
	ClauseEn       string `json:"clause_en"`
	ClauseTypeCode string `json:"clause_type_code"`
}

// CreateConsentTemplateHandler creates a consent template document with its clauses.
//
// @Summary     Create a consent template
// @Description Creates a consent template document (PDF) with associated clauses
// @Tags        consents
// @Accept      multipart/form-data
// @Produce     json
// @Param       name    formData string true  "Template display name"
// @Param       clauses formData string true  "JSON array of clauses"
// @Param       file    formData file   true  "PDF file"
// @Success     201 {object} types.Document
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /consent-templates [post]
func CreateConsentTemplateHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.PostForm("name")
		clausesJSON := c.PostForm("clauses")

		if name == "" || clausesJSON == "" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "name and clauses are required"})
			return
		}

		var clauseReqs []CreateConsentTemplateClause
		if err := json.Unmarshal([]byte(clausesJSON), &clauseReqs); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid clauses JSON"})
			return
		}

		if len(clauseReqs) == 0 {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "At least one clause is required"})
			return
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "file is required"})
			return
		}

		file, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
			return
		}
		defer file.Close()

		fileBytes, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
			return
		}

		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" || mimeType == "application/octet-stream" {
			mimeType = mime.TypeByExtension(filepath.Ext(fileHeader.Filename))
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}
		}

		doc := types.Document{
			Name:     name,
			FileName: fileHeader.Filename,
			MimeType: mimeType,
		}

		clauses := make([]types.ConsentClause, len(clauseReqs))
		for i, cr := range clauseReqs {
			clauses[i] = types.ConsentClause{
				ClauseFr:       cr.ClauseFr,
				ClauseEn:       cr.ClauseEn,
				ClauseTypeCode: cr.ClauseTypeCode,
			}
		}

		if err := consentRepo.CreateTemplate(&doc, fileBytes, clauses); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create template"})
			return
		}

		c.JSON(http.StatusCreated, doc)
	}
}

// DeleteConsentTemplateHandler deletes a consent template if no consents exist for it.
//
// @Summary     Delete a consent template
// @Description Deletes a consent template and its clauses. Fails with 409 if any consents exist.
// @Tags        consents
// @Param       id path int true "Template document ID"
// @Success     204
// @Failure     400 {object} types.ErrorResponse
// @Failure     409 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /consent-templates/{id} [delete]
func DeleteConsentTemplateHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var id int
		if _, err := fmt.Sscanf(c.Param("id"), "%d", &id); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid template ID"})
			return
		}

		hasConsents, err := consentRepo.HasConsentsForTemplate(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check consents"})
			return
		}
		if hasConsents {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: "Cannot delete: participants have signed this template"})
			return
		}

		if err := consentRepo.DeleteTemplate(id); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to delete template"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// UpdateConsentTemplateHandler updates a consent template if no consents exist for it.
//
// @Summary     Update a consent template
// @Description Updates a consent template's name, clauses, and optionally the PDF. Fails with 409 if any consents exist.
// @Tags        consents
// @Accept      multipart/form-data
// @Produce     json
// @Param       id      path     int    true  "Template document ID"
// @Param       name    formData string true  "Template display name"
// @Param       clauses formData string true  "JSON array of clauses"
// @Param       file    formData file   false "PDF file (optional)"
// @Success     200 {object} types.Document
// @Failure     400 {object} types.ErrorResponse
// @Failure     409 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /consent-templates/{id} [put]
func UpdateConsentTemplateHandler(consentRepo *repository.ConsentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var id int
		if _, err := fmt.Sscanf(c.Param("id"), "%d", &id); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid template ID"})
			return
		}

		hasConsents, err := consentRepo.HasConsentsForTemplate(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check consents"})
			return
		}
		if hasConsents {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: "Cannot edit: participants have signed this template"})
			return
		}

		name := c.PostForm("name")
		clausesJSON := c.PostForm("clauses")
		if name == "" || clausesJSON == "" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "name and clauses are required"})
			return
		}

		var clauseReqs []CreateConsentTemplateClause
		if err := json.Unmarshal([]byte(clausesJSON), &clauseReqs); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid clauses JSON"})
			return
		}

		if len(clauseReqs) == 0 {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "At least one clause is required"})
			return
		}

		// Optional file replacement
		var fileBytes []byte
		if fileHeader, err := c.FormFile("file"); err == nil {
			file, err := fileHeader.Open()
			if err != nil {
				c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
				return
			}
			defer file.Close()
			fileBytes, err = io.ReadAll(file)
			if err != nil {
				c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
				return
			}
		}

		clauses := make([]types.ConsentClause, len(clauseReqs))
		for i, cr := range clauseReqs {
			clauses[i] = types.ConsentClause{
				ClauseFr:       cr.ClauseFr,
				ClauseEn:       cr.ClauseEn,
				ClauseTypeCode: cr.ClauseTypeCode,
			}
		}

		if err := consentRepo.UpdateTemplate(id, name, fileBytes, clauses); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update template"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"id": id, "name": name})
	}
}
