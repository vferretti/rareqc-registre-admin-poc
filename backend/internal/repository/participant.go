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

// ParticipantListItem extends Participant with consent status summaries.
type ParticipantListItem struct {
	types.Participant
	ConsentRegistry        *string `json:"consent_registry" gorm:"column:consent_registry"`
	ConsentRecontact       *string `json:"consent_recontact" gorm:"column:consent_recontact"`
	ConsentExternalLinkage *string `json:"consent_external_linkage" gorm:"column:consent_external_linkage"`
}

// List returns a paginated, sortable, searchable list of participants with consent statuses.
func (r *ParticipantRepository) List(params types.PaginationParams) ([]ParticipantListItem, int, int, error) {
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
			`id IN (
				SELECT p.id FROM participant p
				WHERE CAST(p.id AS TEXT) LIKE ? OR LOWER(unaccent(p.first_name)) LIKE unaccent(?) OR LOWER(unaccent(p.last_name)) LIKE unaccent(?) OR LOWER(unaccent(p.first_name || ' ' || p.last_name)) LIKE unaccent(?) OR REPLACE(LOWER(COALESCE(p.ramq, '')), ' ', '') LIKE REPLACE(?, ' ', '')
				UNION
				SELECT c.participant_id FROM contact c
				WHERE LOWER(unaccent(c.first_name)) LIKE unaccent(?) OR LOWER(unaccent(c.last_name)) LIKE unaccent(?) OR LOWER(unaccent(c.first_name || ' ' || c.last_name)) LIKE unaccent(?) OR LOWER(c.email) LIKE ? OR c.phone LIKE ?
				UNION
				SELECT e.participant_id FROM external_id e
				WHERE LOWER(e.external_id) LIKE ?
			)`,
			term, term, term, term, term,
			term, term, term, term, term,
			term,
		)
	}

	// Filter by consent clause type + status (AND between clause types, OR within statuses)
	clauseFilters := []struct {
		clauseType string
		statuses   []string
	}{
		{"registry", params.ConsentRegistry},
		{"recontact", params.ConsentRecontact},
		{"external_linkage", params.ConsentExternalLinkage},
	}
	for _, cf := range clauseFilters {
		if len(cf.statuses) > 0 {
			query = query.Where(
				`id IN (SELECT c.participant_id FROM consent c JOIN consent_clause cc ON c.clause_id = cc.id WHERE cc.clause_type_code = ? AND c.status_code IN ?)`,
				cf.clauseType, cf.statuses,
			)
		}
	}

	// Filter by external system names (OR: participant has an ID in any of the selected systems)
	if len(params.ExternalSystems) > 0 {
		query = query.Where(
			`id IN (SELECT e.participant_id FROM external_id e JOIN external_system es ON e.external_system_id = es.id WHERE es.name IN ?)`,
			params.ExternalSystems,
		)
	}

	// Filter by explicit participant IDs (from bulk ID filter)
	if len(params.ParticipantIDs) > 0 {
		query = query.Where("id IN ?", params.ParticipantIDs)
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

	var participants []ParticipantListItem
	err := query.
		Select(`participant.*,
			cs.consent_registry,
			cs.consent_recontact,
			cs.consent_external_linkage`).
		Joins(`LEFT JOIN (
			SELECT c.participant_id,
				MAX(CASE WHEN cc.clause_type_code = 'registry' THEN c.status_code END) AS consent_registry,
				MAX(CASE WHEN cc.clause_type_code = 'recontact' THEN c.status_code END) AS consent_recontact,
				MAX(CASE WHEN cc.clause_type_code = 'external_linkage' THEN c.status_code END) AS consent_external_linkage
			FROM consent c JOIN consent_clause cc ON c.clause_id = cc.id
			GROUP BY c.participant_id
		) cs ON cs.participant_id = participant.id`).
		Order(order).
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
