package repository

import (
	"fmt"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// CodeEntry represents a single row in any code/reference table.
type CodeEntry struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

// codeTableMeta describes a reference table and where its codes are used.
type codeTableMeta struct {
	Table     string // reference table name (e.g. "sex_at_birth_code")
	FKTable   string // domain table that references it (e.g. "participant")
	FKColumn  string // column in the domain table (e.g. "sex_at_birth_code")
}

// registry lists every code table with its FK dependency.
var registry = []codeTableMeta{
	{Table: "sex_at_birth_code", FKTable: "participant", FKColumn: "sex_at_birth_code"},
	{Table: "vital_status_code", FKTable: "participant", FKColumn: "vital_status_code"},
	{Table: "relationship_code", FKTable: "contact", FKColumn: "relationship_code"},
	{Table: "consent_status_code", FKTable: "consent", FKColumn: "status_code"},
	{Table: "document_type_code", FKTable: "document", FKColumn: "type_code"},
	{Table: "communication_method", FKTable: "communication", FKColumn: "method_code"},
	{Table: "communication_subject", FKTable: "communication", FKColumn: "subject_code"},
	{Table: "phone_outcome", FKTable: "communication", FKColumn: "outcome_code"},
	{Table: "email_outcome", FKTable: "communication", FKColumn: "outcome_code"},
}

// EnumsData holds all reference data for the GET /enums endpoint.
type EnumsData struct {
	SexAtBirth            []types.SexAtBirth            `json:"sex_at_birth"`
	VitalStatus           []types.VitalStatus           `json:"vital_status"`
	Relationship          []types.Relationship          `json:"relationship"`
	ActionType            []types.ActionType            `json:"action_type"`
	ConsentStatus         []types.ConsentStatus         `json:"consent_status"`
	ClauseType            []types.ClauseType            `json:"clause_type"`
	CommunicationMethods  []types.CommunicationMethod   `json:"communication_methods"`
	CommunicationSubjects []types.CommunicationSubject  `json:"communication_subjects"`
	PhoneOutcomes         []types.PhoneOutcome           `json:"phone_outcomes"`
	EmailOutcomes         []types.EmailOutcome           `json:"email_outcomes"`
}

// CodeTableDAO defines the interface for code table data access.
type CodeTableDAO interface {
	ListTables() []string
	List(table string) ([]CodeEntry, error)
	Create(table string, entry *CodeEntry) error
	Update(table, code string, entry *CodeEntry) error
	Delete(table, code string) error
	IsReferenced(table, code string) (bool, error)
	LoadAllEnums() (EnumsData, error)
}

// CodeTableRepository handles CRUD operations on all code/reference tables.
type CodeTableRepository struct {
	db *gorm.DB
}

// NewCodeTableRepository creates a new CodeTableRepository.
func NewCodeTableRepository(db *gorm.DB) *CodeTableRepository {
	return &CodeTableRepository{db: db}
}

// ListTables returns the names of all code tables.
func (r *CodeTableRepository) ListTables() []string {
	names := make([]string, len(registry))
	for i, m := range registry {
		names[i] = m.Table
	}
	return names
}

// findMeta returns the metadata for a given table name, or an error if not found.
func findMeta(table string) (codeTableMeta, error) {
	for _, m := range registry {
		if m.Table == table {
			return m, nil
		}
	}
	return codeTableMeta{}, fmt.Errorf("unknown code table: %s", table)
}

// List returns all entries in the given code table ordered by code.
func (r *CodeTableRepository) List(table string) ([]CodeEntry, error) {
	if _, err := findMeta(table); err != nil {
		return nil, err
	}
	var entries []CodeEntry
	err := r.db.Table(table).Order("code").Find(&entries).Error
	return entries, err
}

// Create inserts a new code entry.
func (r *CodeTableRepository) Create(table string, entry *CodeEntry) error {
	if _, err := findMeta(table); err != nil {
		return err
	}
	return r.db.Table(table).Create(entry).Error
}

// Update modifies the labels (name_en, name_fr) of an existing code entry.
// If newCode differs from the current code, the code is renamed (only allowed when not referenced).
func (r *CodeTableRepository) Update(table, code string, entry *CodeEntry) error {
	meta, err := findMeta(table)
	if err != nil {
		return err
	}

	// If code is being renamed, verify it's not referenced
	if entry.Code != code {
		used, err := r.IsReferenced(table, code)
		if err != nil {
			return err
		}
		if used {
			return fmt.Errorf("code is referenced and cannot be renamed")
		}
		// Delete old + create new in a transaction
		return r.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Table(meta.Table).Where("code = ?", code).Delete(&CodeEntry{}).Error; err != nil {
				return err
			}
			return tx.Table(meta.Table).Create(entry).Error
		})
	}

	return r.db.Table(table).Where("code = ?", code).Updates(map[string]interface{}{
		"name_en": entry.NameEn,
		"name_fr": entry.NameFr,
	}).Error
}

// Delete removes a code entry. Returns an error if the code is referenced.
func (r *CodeTableRepository) Delete(table, code string) error {
	meta, err := findMeta(table)
	if err != nil {
		return err
	}

	used, err := r.IsReferenced(table, code)
	if err != nil {
		return err
	}
	if used {
		return fmt.Errorf("code is referenced and cannot be deleted")
	}

	return r.db.Table(meta.Table).Where("code = ?", code).Delete(&CodeEntry{}).Error
}

// IsReferenced returns true if the given code is used in the FK domain table.
func (r *CodeTableRepository) IsReferenced(table, code string) (bool, error) {
	meta, err := findMeta(table)
	if err != nil {
		return false, err
	}
	var count int64
	err = r.db.Table(meta.FKTable).Where(fmt.Sprintf("%s = ?", meta.FKColumn), code).Count(&count).Error
	return count > 0, err
}

// LoadAllEnums returns all reference data ordered by code.
func (r *CodeTableRepository) LoadAllEnums() (EnumsData, error) {
	var data EnumsData
	if err := r.db.Order("code").Find(&data.SexAtBirth).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.VitalStatus).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.Relationship).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.ActionType).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.ConsentStatus).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.ClauseType).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.CommunicationMethods).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.CommunicationSubjects).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.PhoneOutcomes).Error; err != nil {
		return data, err
	}
	if err := r.db.Order("code").Find(&data.EmailOutcomes).Error; err != nil {
		return data, err
	}
	return data, nil
}
