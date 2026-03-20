package repository

import (
	"fmt"

	"gorm.io/gorm"
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
	{Table: "action_type_code", FKTable: "activity_log", FKColumn: "action_type_code"},
	{Table: "consent_status_code", FKTable: "consent", FKColumn: "status_code"},
	{Table: "clause_type_code", FKTable: "consent_clause", FKColumn: "clause_type_code"},
	{Table: "document_type_code", FKTable: "document", FKColumn: "type_code"},
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
