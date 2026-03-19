package repository

import (
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ExternalIDRepository handles database operations for external IDs.
type ExternalIDRepository struct {
	db *gorm.DB
}

// NewExternalIDRepository creates a new ExternalIDRepository.
func NewExternalIDRepository(db *gorm.DB) *ExternalIDRepository {
	return &ExternalIDRepository{db: db}
}

// ExternalIDResponse represents an external ID with the system name for API responses.
type ExternalIDResponse struct {
	ID               int    `json:"id"`
	ExternalSystemID int    `json:"external_system_id"`
	SystemName       string `json:"system_name"`
	SystemTitle      string `json:"system_title"`
	ExternalID       string `json:"external_id"`
}

// ListByParticipant returns all external IDs for a participant with system details.
func (r *ExternalIDRepository) ListByParticipant(participantID int) ([]ExternalIDResponse, error) {
	var extIDs []types.ExternalID
	err := r.db.Preload("ExternalSystem").
		Joins("JOIN external_system ON external_system.id = external_id.external_system_id").
		Where("participant_id = ?", participantID).
		Order("external_system.name ASC").
		Find(&extIDs).Error
	if err != nil {
		return nil, err
	}

	responses := make([]ExternalIDResponse, len(extIDs))
	for i, e := range extIDs {
		responses[i] = ExternalIDResponse{
			ID:               e.ID,
			ExternalSystemID: e.ExternalSystemID,
			SystemName:       e.ExternalSystem.Name,
			SystemTitle:      e.ExternalSystem.Title,
			ExternalID:       e.ExternalID,
		}
	}
	return responses, nil
}
