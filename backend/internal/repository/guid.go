package repository

import (
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// GuidRepository handles database operations for participant GUIDs.
type GuidRepository struct {
	db *gorm.DB
}

// NewGuidRepository creates a new GuidRepository.
func NewGuidRepository(db *gorm.DB) *GuidRepository {
	return &GuidRepository{db: db}
}

// ResolveByGuid returns participant IDs for a list of GUIDs, matching exactly
// against guid_basic, guid_ramq or guid_birthplace. Also returns the list of
// GUIDs that were not found.
func (r *GuidRepository) ResolveByGuid(ids []string) ([]int, []string) {
	var rows []types.Guid
	r.db.Where(
		"guid_basic IN ? OR guid_ramq IN ? OR guid_birthplace IN ?",
		ids, ids, ids,
	).Find(&rows)

	foundSet := make(map[string]bool)
	var participantIDs []int
	for _, g := range rows {
		participantIDs = append(participantIDs, g.ParticipantID)
		foundSet[g.GuidBasic] = true
		if g.GuidRamq != nil {
			foundSet[*g.GuidRamq] = true
		}
		if g.GuidBirthplace != nil {
			foundSet[*g.GuidBirthplace] = true
		}
	}

	var notFound []string
	for _, id := range ids {
		if !foundSet[id] {
			notFound = append(notFound, id)
		}
	}
	return participantIDs, notFound
}
