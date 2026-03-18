package repository

import (
	"math"
	"strings"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ParticipantRepository handles database operations for participants.
type ParticipantRepository struct {
	db *gorm.DB
}

// NewParticipantRepository creates a new ParticipantRepository.
func NewParticipantRepository(db *gorm.DB) *ParticipantRepository {
	return &ParticipantRepository{db: db}
}

// FindByID returns a participant with its contacts, or an error if not found.
func (r *ParticipantRepository) FindByID(id string) (types.Participant, error) {
	var p types.Participant
	err := r.db.Preload("Contacts").Preload("Guid").First(&p, id).Error
	return p, err
}

// List returns a paginated, sortable, searchable list of participants.
func (r *ParticipantRepository) List(params types.PaginationParams) ([]types.Participant, int, int, error) {
	allowedSortFields := map[string]string{
		"id": "id", "first_name": "first_name", "last_name": "last_name",
		"date_of_birth": "date_of_birth", "sex_at_birth_code": "sex_at_birth_code",
		"vital_status_code": "vital_status_code", "ramq": "ramq",
		"created_at": "created_at", "updated_at": "updated_at",
	}

	query := r.db.Model(&types.Participant{})

	if params.Search != "" {
		term := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where(
			"LOWER(unaccent(first_name)) LIKE unaccent(?) OR LOWER(unaccent(last_name)) LIKE unaccent(?) OR ramq LIKE ?",
			term, term, term,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	sortCol, ok := allowedSortFields[params.SortField]
	if !ok {
		sortCol = "last_name"
	}
	order := sortCol
	if params.SortOrder == "desc" {
		order += " DESC"
	} else {
		order += " ASC"
	}

	var participants []types.Participant
	err := query.Order(order).
		Offset(params.PageIndex * params.PageSize).
		Limit(params.PageSize).
		Find(&participants).Error
	if err != nil {
		return nil, 0, 0, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return participants, int(total), totalPages, nil
}

// Create inserts a new participant.
func (r *ParticipantRepository) Create(tx *gorm.DB, p *types.Participant) error {
	return tx.Create(p).Error
}

// Save updates an existing participant.
func (r *ParticipantRepository) Save(tx *gorm.DB, p *types.Participant) error {
	return tx.Save(p).Error
}

// Exists returns true if a participant with the given ID exists.
func (r *ParticipantRepository) Exists(id int) (bool, error) {
	var count int64
	err := r.db.Model(&types.Participant{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// Transaction executes fn within a database transaction.
func (r *ParticipantRepository) Transaction(fn func(tx *gorm.DB) error) error {
	return r.db.Transaction(fn)
}

// Reload fetches the participant with contacts by ID (used after create/update).
func (r *ParticipantRepository) Reload(p *types.Participant) error {
	return r.db.Preload("Contacts").Preload("Guid").First(p, p.ID).Error
}
