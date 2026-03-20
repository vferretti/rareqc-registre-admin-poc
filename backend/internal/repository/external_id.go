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
	SystemTitleFr    string `json:"system_title_fr"`
	SystemTitleEn    string `json:"system_title_en"`
	ExternalID       string `json:"external_id"`
}

// ResolveBySystem returns participant IDs for a list of external IDs in a given system.
// Also returns the list of external IDs that were not found.
func (r *ExternalIDRepository) ResolveBySystem(systemName string, ids []string) ([]int, []string) {
	var extIDs []types.ExternalID
	r.db.Joins("JOIN external_system ON external_system.id = external_id.external_system_id").
		Where("external_system.name = ? AND external_id.external_id IN ?", systemName, ids).
		Find(&extIDs)

	foundSet := make(map[string]bool)
	var participantIDs []int
	for _, e := range extIDs {
		participantIDs = append(participantIDs, e.ParticipantID)
		foundSet[e.ExternalID] = true
	}

	var notFound []string
	for _, id := range ids {
		if !foundSet[id] {
			notFound = append(notFound, id)
		}
	}
	return participantIDs, notFound
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
			SystemTitleFr:    e.ExternalSystem.TitleFr,
			SystemTitleEn:    e.ExternalSystem.TitleEn,
			ExternalID:       e.ExternalID,
		}
	}
	return responses, nil
}
