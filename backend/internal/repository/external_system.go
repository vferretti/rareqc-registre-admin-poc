package repository

import (
	"fmt"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ExternalSystemRepository handles CRUD operations on external systems.
type ExternalSystemRepository struct {
	db *gorm.DB
}

// NewExternalSystemRepository creates a new ExternalSystemRepository.
func NewExternalSystemRepository(db *gorm.DB) *ExternalSystemRepository {
	return &ExternalSystemRepository{db: db}
}

// ExternalSystemResponse represents an external system with its reference status.
type ExternalSystemResponse struct {
	types.ExternalSystem
	IsReferenced bool `json:"is_referenced"`
}

// List returns all external systems ordered by name, with their reference status.
func (r *ExternalSystemRepository) List() ([]ExternalSystemResponse, error) {
	var systems []types.ExternalSystem
	if err := r.db.Order("name").Find(&systems).Error; err != nil {
		return nil, err
	}

	result := make([]ExternalSystemResponse, len(systems))
	for i, s := range systems {
		referenced, err := r.isReferenced(s.ID)
		if err != nil {
			return nil, err
		}
		result[i] = ExternalSystemResponse{
			ExternalSystem: s,
			IsReferenced:   referenced,
		}
	}
	return result, nil
}

// Create inserts a new external system.
func (r *ExternalSystemRepository) Create(system *types.ExternalSystem) error {
	return r.db.Create(system).Error
}

// Update modifies an existing external system.
func (r *ExternalSystemRepository) Update(id int, name, titleFr, titleEn string) error {
	return r.db.Model(&types.ExternalSystem{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":     name,
		"title_fr": titleFr,
		"title_en": titleEn,
	}).Error
}

// Delete removes an external system. Returns an error if it is referenced.
func (r *ExternalSystemRepository) Delete(id int) error {
	referenced, err := r.isReferenced(id)
	if err != nil {
		return err
	}
	if referenced {
		return fmt.Errorf("system is referenced and cannot be deleted")
	}
	return r.db.Delete(&types.ExternalSystem{}, id).Error
}

// isReferenced returns true if the external system has associated external IDs.
func (r *ExternalSystemRepository) isReferenced(id int) (bool, error) {
	var count int64
	err := r.db.Model(&types.ExternalID{}).Where("external_system_id = ?", id).Count(&count).Error
	return count > 0, err
}
