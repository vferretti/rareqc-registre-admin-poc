package repository

import (
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ConsentRepository handles database operations for consents.
type ConsentRepository struct {
	db *gorm.DB
}

// NewConsentRepository creates a new ConsentRepository.
func NewConsentRepository(db *gorm.DB) *ConsentRepository {
	return &ConsentRepository{db: db}
}

// ConsentResponse represents a consent with its clause and signer details for API responses.
type ConsentResponse struct {
	ID             int    `json:"id"`
	ClauseTypeCode string `json:"clause_type_code"`
	ClauseFr       string `json:"clause_fr"`
	ClauseEn       string `json:"clause_en"`
	StatusCode     string `json:"status_code"`
	Date           string `json:"date"`
	SignedByID     *int   `json:"signed_by_id,omitempty"`
	SignedByName   string `json:"signed_by_name,omitempty"`
	Relationship   string `json:"signed_by_relationship,omitempty"`
	DocumentID     *int   `json:"document_id,omitempty"`
	DocumentName   string `json:"document_name,omitempty"`
	DocumentMime   string `json:"document_mime,omitempty"`
	TemplateName   string `json:"template_name,omitempty"`
}

// FindByID returns a consent by ID.
func (r *ConsentRepository) FindByID(id int) (types.Consent, error) {
	var c types.Consent
	err := r.db.First(&c, id).Error
	return c, err
}

// Update saves changes to an existing consent.
func (r *ConsentRepository) Update(consent *types.Consent) error {
	return r.db.Save(consent).Error
}

// DB returns the underlying database connection (for use in transactions across repositories).
func (r *ConsentRepository) DB() *gorm.DB {
	return r.db
}

// ExistsByClause returns true if a consent already exists for this participant and clause.
func (r *ConsentRepository) ExistsByClause(participantID, clauseID int) (bool, error) {
	var count int64
	err := r.db.Model(&types.Consent{}).
		Where("participant_id = ? AND clause_id = ?", participantID, clauseID).
		Count(&count).Error
	return count > 0, err
}

// Create inserts a new consent record.
func (r *ConsentRepository) Create(consent *types.Consent) error {
	return r.db.Create(consent).Error
}

// ListClauses returns all consent clauses, optionally filtered by template document ID.
func (r *ConsentRepository) ListClauses(templateDocID *int) ([]types.ConsentClause, error) {
	var clauses []types.ConsentClause
	query := r.db.Order("id ASC")
	if templateDocID != nil {
		query = query.Where("template_document_id = ?", *templateDocID)
	}
	err := query.Find(&clauses).Error
	return clauses, err
}

// ListConsentTemplates returns all documents of type "consent" (template documents).
func (r *ConsentRepository) ListConsentTemplates() ([]types.Document, error) {
	var docs []types.Document
	err := r.db.Where("type_code = ?", "consent_template").Order("name ASC").Find(&docs).Error
	return docs, err
}

// ListByParticipant returns all consents for a participant with clause and signer details.
func (r *ConsentRepository) ListByParticipant(participantID int) ([]ConsentResponse, error) {
	var consents []types.Consent
	err := r.db.
		Preload("Clause.TemplateDocument").
		Preload("SignedBy").
		Preload("Document").
		Where("participant_id = ?", participantID).
		Order("id ASC").
		Find(&consents).Error
	if err != nil {
		return nil, err
	}

	responses := make([]ConsentResponse, len(consents))
	for i, c := range consents {
		resp := ConsentResponse{
			ID:             c.ID,
			ClauseTypeCode: c.Clause.ClauseTypeCode,
			ClauseFr:       c.Clause.ClauseFr,
			ClauseEn:       c.Clause.ClauseEn,
			StatusCode:     c.StatusCode,
			Date:           c.Date.Format("2006-01-02"),
			SignedByID:     c.SignedByID,
			DocumentID:     c.DocumentID,
		}
		if c.SignedBy != nil {
			resp.SignedByName = c.SignedBy.FirstName + " " + c.SignedBy.LastName
			resp.Relationship = c.SignedBy.RelationshipCode
		}
		if c.Document != nil {
			resp.DocumentName = c.Document.Name
			resp.DocumentMime = c.Document.MimeType
		}
		if c.Clause.TemplateDocument.ID != 0 {
			resp.TemplateName = c.Clause.TemplateDocument.Name
		}
		responses[i] = resp
	}
	return responses, nil
}
