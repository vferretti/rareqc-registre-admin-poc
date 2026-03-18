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
}

// DB returns the underlying database connection (for use in transactions across repositories).
func (r *ConsentRepository) DB() *gorm.DB {
	return r.db
}

// Create inserts a new consent record.
func (r *ConsentRepository) Create(consent *types.Consent) error {
	return r.db.Create(consent).Error
}

// ListClauses returns all consent clauses.
func (r *ConsentRepository) ListClauses() ([]types.ConsentClause, error) {
	var clauses []types.ConsentClause
	err := r.db.Order("id ASC").Find(&clauses).Error
	return clauses, err
}

// ListByParticipant returns all consents for a participant with clause and signer details.
func (r *ConsentRepository) ListByParticipant(participantID int) ([]ConsentResponse, error) {
	var consents []types.Consent
	err := r.db.
		Preload("Clause").
		Preload("SignedBy").
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
		}
		if c.SignedBy != nil {
			resp.SignedByName = c.SignedBy.FirstName + " " + c.SignedBy.LastName
			resp.Relationship = c.SignedBy.RelationshipCode
		}
		responses[i] = resp
	}
	return responses, nil
}
