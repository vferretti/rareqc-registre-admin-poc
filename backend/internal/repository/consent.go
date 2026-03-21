package repository

import (
	"time"

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

// ExistsByClauseType returns true if a consent already exists for this participant and clause type.
func (r *ConsentRepository) ExistsByClauseType(participantID int, clauseTypeCode string) (bool, error) {
	var count int64
	err := r.db.Model(&types.Consent{}).
		Joins("JOIN consent_clause ON consent.clause_id = consent_clause.id").
		Where("consent.participant_id = ? AND consent_clause.clause_type_code = ?", participantID, clauseTypeCode).
		Count(&count).Error
	return count > 0, err
}

// ClauseTypeForClause returns the clause_type_code for a given clause ID.
func (r *ConsentRepository) ClauseTypeForClause(clauseID int) (string, error) {
	var clause types.ConsentClause
	err := r.db.Select("clause_type_code").First(&clause, clauseID).Error
	return clause.ClauseTypeCode, err
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

// CreateTemplate creates a consent template document with its clauses in a single transaction.
func (r *ConsentRepository) CreateTemplate(doc *types.Document, fileData []byte, clauses []types.ConsentClause) error {
	doc.StorageType = "database"
	doc.FileSize = int64(len(fileData))
	doc.TypeCode = "consent_template"

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(doc).Error; err != nil {
			return err
		}

		file := types.DocumentFile{
			DocumentID: doc.ID,
			Data:       fileData,
		}
		if err := tx.Create(&file).Error; err != nil {
			return err
		}

		for i := range clauses {
			clauses[i].TemplateDocumentID = doc.ID
			if err := tx.Create(&clauses[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// HasConsentsForTemplate returns true if any participant has consented to any clause of the given template.
func (r *ConsentRepository) HasConsentsForTemplate(templateDocID int) (bool, error) {
	var count int64
	err := r.db.Model(&types.Consent{}).
		Joins("JOIN consent_clause ON consent.clause_id = consent_clause.id").
		Where("consent_clause.template_document_id = ?", templateDocID).
		Count(&count).Error
	return count > 0, err
}

// DeleteTemplate deletes a consent template, its clauses, and the document file.
func (r *ConsentRepository) DeleteTemplate(templateDocID int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("template_document_id = ?", templateDocID).Delete(&types.ConsentClause{}).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", templateDocID).Delete(&types.DocumentFile{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&types.Document{}, templateDocID).Error; err != nil {
			return err
		}
		return nil
	})
}

// UpdateTemplate updates a consent template's name, clauses, and optionally replaces the PDF file.
func (r *ConsentRepository) UpdateTemplate(templateDocID int, name string, fileData []byte, clauses []types.ConsentClause) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Update document name
		if err := tx.Model(&types.Document{}).Where("id = ?", templateDocID).Update("name", name).Error; err != nil {
			return err
		}

		// Replace file if provided
		if fileData != nil {
			if err := tx.Where("document_id = ?", templateDocID).Delete(&types.DocumentFile{}).Error; err != nil {
				return err
			}
			file := types.DocumentFile{DocumentID: templateDocID, Data: fileData}
			if err := tx.Create(&file).Error; err != nil {
				return err
			}
			if err := tx.Model(&types.Document{}).Where("id = ?", templateDocID).Update("file_size", int64(len(fileData))).Error; err != nil {
				return err
			}
		}

		// Delete old clauses and recreate
		if err := tx.Where("template_document_id = ?", templateDocID).Delete(&types.ConsentClause{}).Error; err != nil {
			return err
		}
		for i := range clauses {
			clauses[i].TemplateDocumentID = templateDocID
			if err := tx.Create(&clauses[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// CascadeRegistryStatus sets all non-registry consents for a participant to the given status.
// Returns the list of clause_type_codes that were updated.
func (r *ConsentRepository) CascadeRegistryStatus(participantID int, statusCode string, date time.Time) ([]string, error) {
	var consents []types.Consent
	err := r.db.
		Joins("JOIN consent_clause ON consent.clause_id = consent_clause.id").
		Where("consent.participant_id = ? AND consent_clause.clause_type_code != ? AND consent.status_code != ?",
			participantID, "registry", statusCode).
		Find(&consents).Error
	if err != nil {
		return nil, err
	}

	var updated []string
	for _, c := range consents {
		c.StatusCode = statusCode
		c.Date = date
		if err := r.db.Save(&c).Error; err != nil {
			return nil, err
		}
		var clause types.ConsentClause
		r.db.Select("clause_type_code").First(&clause, c.ClauseID)
		updated = append(updated, clause.ClauseTypeCode)
	}
	return updated, nil
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
