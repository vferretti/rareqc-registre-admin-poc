package repository

import (
	"fmt"
	"time"

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

// GetSummary returns all summary statistics as of the given report date.
// Only participants created on or before reportDate are included.
// Ages are calculated as of reportDate.
func (r *ReportsRepository) GetSummary(reportDate time.Time) (types.ReportsSummary, error) {
	var s types.ReportsSummary

	// Base scope: participants created on or before reportDate
	scope := r.db.Model(&types.Participant{}).Where("created_at <= ?", reportDate)

	// Total participants
	var total int64
	scope.Session(&gorm.Session{}).Count(&total)
	s.TotalParticipants = int(total)

	// Sex counts
	var femaleCount, maleCount int64
	scope.Session(&gorm.Session{}).Where("sex_at_birth_code = ?", "female").Count(&femaleCount)
	scope.Session(&gorm.Session{}).Where("sex_at_birth_code = ?", "male").Count(&maleCount)
	s.FemaleCount = int(femaleCount)
	s.MaleCount = int(maleCount)

	// Average age as of reportDate
	var avgAge *float64
	scope.Session(&gorm.Session{}).
		Select("AVG(EXTRACT(YEAR FROM AGE(?, date_of_birth)))", reportDate).
		Scan(&avgAge)
	if avgAge != nil {
		s.AverageAge = *avgAge
	}

	// Deceased
	var deceased int64
	scope.Session(&gorm.Session{}).Where("vital_status_code = ?", "deceased").Count(&deceased)
	s.DeceasedCount = int(deceased)

	// Valid consents by clause type (only for participants created <= reportDate)
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
			Joins("JOIN participant ON consent.participant_id = participant.id").
			Where("participant.created_at <= ?", reportDate).
			Where("consent_clause.clause_type_code = ? AND consent.status_code = 'valid'", ct.code).
			Count(&count)
		*ct.field = int(count)
	}

	// External systems counts (only for participants created <= reportDate)
	var extRows []struct {
		Name  string
		Count int
	}
	r.db.Table("external_id").
		Select("external_system.name, COUNT(*) as count").
		Joins("JOIN external_system ON external_id.external_system_id = external_system.id").
		Joins("JOIN participant ON external_id.participant_id = participant.id").
		Where("participant.created_at <= ?", reportDate).
		Group("external_system.name").
		Order("external_system.name").
		Find(&extRows)
	s.ExternalSystems = make([]types.ExternalSystemCount, len(extRows))
	for i, row := range extRows {
		s.ExternalSystems[i] = types.ExternalSystemCount{Name: row.Name, Count: row.Count}
	}

	// Growth by quarter (cumulative, up to reportDate)
	var quarterRows []struct {
		Quarter string
		Count   int
	}
	r.db.Raw(`
		SELECT
			TO_CHAR(created_at, 'YY') || '-Q' || EXTRACT(QUARTER FROM created_at) as quarter,
			COUNT(*) as count
		FROM participant
		WHERE created_at <= ?
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at),
			TO_CHAR(created_at, 'YY') || '-Q' || EXTRACT(QUARTER FROM created_at)
		ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
	`, reportDate).Find(&quarterRows)

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

	// Age distribution by clinical ranges (ages as of reportDate)
	var ageRows []struct {
		Range string
		Count int
	}
	r.db.Raw(`
		SELECT age_range as range, COUNT(*) as count FROM (
			SELECT CASE
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 2 THEN '1_0-2'
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 5 THEN '2_3-5'
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 10 THEN '3_6-10'
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 18 THEN '4_11-18'
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 30 THEN '5_19-30'
				WHEN EXTRACT(YEAR FROM AGE(?, date_of_birth)) <= 60 THEN '6_31-60'
				ELSE '7_60+'
			END as age_range
			FROM participant
			WHERE created_at <= ?
		) sub GROUP BY age_range ORDER BY age_range
	`, reportDate, reportDate, reportDate, reportDate, reportDate, reportDate, reportDate).Find(&ageRows)
	// Strip sort prefix (e.g. "1_0-2" → "0-2")
	s.AgeDistribution = make([]types.AgeRangeCount, len(ageRows))
	for i, row := range ageRows {
		label := row.Range
		if len(label) > 2 && label[1] == '_' {
			label = label[2:]
		}
		s.AgeDistribution[i] = types.AgeRangeCount{Range: label, Count: row.Count}
	}

	return s, nil
}
