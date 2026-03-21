package repository

import (
	"fmt"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ReportsRepository handles aggregation queries for reporting.
type ReportsRepository struct {
	db *gorm.DB
}

// NewReportsRepository creates a new ReportsRepository.
func NewReportsRepository(db *gorm.DB) *ReportsRepository {
	return &ReportsRepository{db: db}
}

// GetSummary returns all summary statistics across all data.
func (r *ReportsRepository) GetSummary() (types.ReportsSummary, error) {
	var s types.ReportsSummary

	// Total participants
	r.db.Model(&types.Participant{}).Count(new(int64))
	var total int64
	r.db.Model(&types.Participant{}).Count(&total)
	s.TotalParticipants = int(total)

	// Sex counts
	var femaleCount, maleCount int64
	r.db.Model(&types.Participant{}).Where("sex_at_birth_code = ?", "female").Count(&femaleCount)
	r.db.Model(&types.Participant{}).Where("sex_at_birth_code = ?", "male").Count(&maleCount)
	s.FemaleCount = int(femaleCount)
	s.MaleCount = int(maleCount)

	// Average age
	var avgAge *float64
	r.db.Model(&types.Participant{}).
		Select("AVG(EXTRACT(YEAR FROM AGE(date_of_birth)))").
		Scan(&avgAge)
	if avgAge != nil {
		s.AverageAge = *avgAge
	}

	// Deceased
	var deceased int64
	r.db.Model(&types.Participant{}).Where("vital_status_code = ?", "deceased").Count(&deceased)
	s.DeceasedCount = int(deceased)

	// Valid consents by clause type
	for _, ct := range []struct {
		code  string
		field *int
	}{
		{"registry", &s.ConsentRegistry},
		{"recontact", &s.ConsentRecontact},
		{"external_linkage", &s.ConsentExtLinkage},
	} {
		var count int64
		r.db.Table("consent").
			Joins("JOIN consent_clause ON consent.clause_id = consent_clause.id").
			Where("consent_clause.clause_type_code = ? AND consent.status_code = 'valid'", ct.code).
			Count(&count)
		*ct.field = int(count)
	}

	// External systems counts
	var extRows []struct {
		Name  string
		Count int
	}
	r.db.Table("external_id").
		Select("external_system.name, COUNT(*) as count").
		Joins("JOIN external_system ON external_id.external_system_id = external_system.id").
		Group("external_system.name").
		Order("external_system.name").
		Find(&extRows)
	s.ExternalSystems = make([]types.ExternalSystemCount, len(extRows))
	for i, row := range extRows {
		s.ExternalSystems[i] = types.ExternalSystemCount{Name: row.Name, Count: row.Count}
	}

	// Growth by quarter (cumulative)
	var quarterRows []struct {
		Quarter string
		Count   int
	}
	r.db.Raw(`
		SELECT
			TO_CHAR(created_at, 'YY') || 'Q' || EXTRACT(QUARTER FROM created_at) as quarter,
			COUNT(*) as count
		FROM participant
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at),
			TO_CHAR(created_at, 'YY') || 'Q' || EXTRACT(QUARTER FROM created_at)
		ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
	`).Find(&quarterRows)

	// Convert to cumulative
	s.GrowthByQuarter = make([]types.QuarterCount, len(quarterRows))
	cumulative := 0
	for i, row := range quarterRows {
		cumulative += row.Count
		s.GrowthByQuarter[i] = types.QuarterCount{
			Quarter: fmt.Sprintf("%s", row.Quarter),
			Count:   cumulative,
		}
	}

	return s, nil
}
