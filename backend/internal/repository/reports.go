package repository

import (
	"time"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// ReportsDAO defines the interface for reports data access.
type ReportsDAO interface {
	GetSummary(reportDate time.Time) (types.ReportsSummary, error)
}

// ReportsRepository handles aggregation queries for reporting.
type ReportsRepository struct {
	db *gorm.DB
}

// NewReportsRepository creates a new ReportsRepository.
func NewReportsRepository(db *gorm.DB) *ReportsRepository {
	return &ReportsRepository{db: db}
}

// GetSummary returns all summary statistics as of the given report date.
// Only participants created before reportDate are included.
// Ages are calculated as of reportDate.
func (r *ReportsRepository) GetSummary(reportDate time.Time) (types.ReportsSummary, error) {
	var s types.ReportsSummary

	// Participant counts in a single query (total, female, male, avg age, deceased)
	var participantStats struct {
		Total    int
		Female   int
		Male     int
		AvgAge   *float64
		Deceased int
	}
	if err := r.db.Raw(`
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE sex_at_birth_code = 'female') as female,
			COUNT(*) FILTER (WHERE sex_at_birth_code = 'male') as male,
			AVG(EXTRACT(YEAR FROM AGE(?, date_of_birth))) as avg_age,
			COUNT(*) FILTER (WHERE vital_status_code = 'deceased') as deceased
		FROM participant
		WHERE created_at < ?
	`, reportDate, reportDate).Scan(&participantStats).Error; err != nil {
		return s, err
	}
	s.TotalParticipants = participantStats.Total
	s.FemaleCount = participantStats.Female
	s.MaleCount = participantStats.Male
	s.DeceasedCount = participantStats.Deceased
	if participantStats.AvgAge != nil {
		s.AverageAge = *participantStats.AvgAge
	}

	// Valid consents by clause type in a single query
	var consentRows []struct {
		ClauseTypeCode string
		Count          int
	}
	if err := r.db.Raw(`
		SELECT consent_clause.clause_type_code, COUNT(*) as count
		FROM consent
		JOIN consent_clause ON consent.clause_id = consent_clause.id
		JOIN participant ON consent.participant_id = participant.id
		WHERE participant.created_at < ?
		  AND consent.status_code = 'valid'
		GROUP BY consent_clause.clause_type_code
	`, reportDate).Find(&consentRows).Error; err != nil {
		return s, err
	}
	for _, row := range consentRows {
		switch row.ClauseTypeCode {
		case "registry":
			s.ConsentRegistry = row.Count
		case "recontact":
			s.ConsentRecontact = row.Count
		case "external_linkage":
			s.ConsentExtLinkage = row.Count
		}
	}

	// External systems counts
	var extRows []struct {
		Name  string
		Count int
	}
	if err := r.db.Raw(`
		SELECT es.name, COUNT(*) as count
		FROM external_id ei
		JOIN external_system es ON ei.external_system_id = es.id
		JOIN participant p ON ei.participant_id = p.id
		WHERE p.created_at < ?
		GROUP BY es.name
		ORDER BY es.name
	`, reportDate).Find(&extRows).Error; err != nil {
		return s, err
	}
	s.ExternalSystems = make([]types.ExternalSystemCount, len(extRows))
	for i, row := range extRows {
		s.ExternalSystems[i] = types.ExternalSystemCount{Name: row.Name, Count: row.Count}
	}

	// Growth by quarter (cumulative)
	var quarterRows []struct {
		Quarter string
		Count   int
	}
	if err := r.db.Raw(`
		SELECT
			TO_CHAR(created_at, 'YY') || '-Q' || EXTRACT(QUARTER FROM created_at) as quarter,
			COUNT(*) as count
		FROM participant
		WHERE created_at < ?
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at),
			TO_CHAR(created_at, 'YY') || '-Q' || EXTRACT(QUARTER FROM created_at)
		ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
	`, reportDate).Find(&quarterRows).Error; err != nil {
		return s, err
	}
	s.GrowthByQuarter = make([]types.QuarterCount, len(quarterRows))
	cumulative := 0
	for i, row := range quarterRows {
		cumulative += row.Count
		s.GrowthByQuarter[i] = types.QuarterCount{Quarter: row.Quarter, Count: cumulative}
	}

	// Age distribution by clinical ranges (ages as of reportDate)
	var ageRows []struct {
		Range string
		Count int
	}
	if err := r.db.Raw(`
		WITH aged AS (
			SELECT EXTRACT(YEAR FROM AGE(?, date_of_birth)) AS age
			FROM participant
			WHERE created_at < ?
		)
		SELECT age_range AS range, COUNT(*) AS count FROM (
			SELECT CASE
				WHEN age <= 2 THEN '1_0-2'
				WHEN age <= 5 THEN '2_3-5'
				WHEN age <= 10 THEN '3_6-10'
				WHEN age <= 18 THEN '4_11-18'
				WHEN age <= 30 THEN '5_19-30'
				WHEN age <= 60 THEN '6_31-60'
				ELSE '7_60+'
			END AS age_range
			FROM aged
		) sub GROUP BY age_range ORDER BY age_range
	`, reportDate, reportDate).Find(&ageRows).Error; err != nil {
		return s, err
	}
	s.AgeDistribution = make([]types.AgeRangeCount, len(ageRows))
	for i, row := range ageRows {
		label := row.Range
		if len(label) > 2 && label[1] == '_' {
			label = label[2:]
		}
		s.AgeDistribution[i] = types.AgeRangeCount{Range: label, Count: row.Count}
	}

	// City distribution (from self contact, top 10)
	var cityRows []struct {
		City  string
		Count int
	}
	if err := r.db.Raw(`
		SELECT c.city, COUNT(*) AS count
		FROM contact c
		JOIN participant p ON c.participant_id = p.id
		WHERE c.relationship_code = 'self'
		  AND c.city IS NOT NULL AND c.city != ''
		  AND p.created_at < ?
		GROUP BY c.city
		ORDER BY count DESC
		LIMIT 10
	`, reportDate).Find(&cityRows).Error; err != nil {
		return s, err
	}
	s.CityDistribution = make([]types.CityCount, len(cityRows))
	for i, row := range cityRows {
		s.CityDistribution[i] = types.CityCount{City: row.City, Count: row.Count}
	}

	return s, nil
}
