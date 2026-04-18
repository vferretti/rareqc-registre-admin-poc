package types

// ExternalSystemCount represents a system name with its participant count.
type ExternalSystemCount struct {
	Name  string `json:"name" validate:"required"`
	Count int    `json:"count" validate:"required"`
}

// QuarterCount represents a quarter label with its cumulative participant count.
type QuarterCount struct {
	Quarter string `json:"quarter" validate:"required"`
	Count   int    `json:"count" validate:"required"`
}

// AgeRangeCount represents an age range with its participant count.
type AgeRangeCount struct {
	Range string `json:"range" validate:"required"`
	Count int    `json:"count" validate:"required"`
}

// CityCount represents a city with its participant count.
type CityCount struct {
	City  string `json:"city" validate:"required"`
	Count int    `json:"count" validate:"required"`
}

// ReportsSummary holds all summary statistics for the reports page.
type ReportsSummary struct {
	TotalParticipants int                   `json:"total_participants" validate:"required"`
	FemaleCount       int                   `json:"female_count" validate:"required"`
	MaleCount         int                   `json:"male_count" validate:"required"`
	AverageAge        float64               `json:"average_age" validate:"required"`
	DeceasedCount     int                   `json:"deceased_count" validate:"required"`
	ConsentRegistry   int                   `json:"consent_registry" validate:"required"`
	ConsentRecontact  int                   `json:"consent_recontact" validate:"required"`
	ConsentExtLinkage int                   `json:"consent_ext_linkage" validate:"required"`
	ExternalSystems   []ExternalSystemCount `json:"external_systems" validate:"required"`
	GrowthByQuarter   []QuarterCount        `json:"growth_by_quarter" validate:"required"`
	AgeDistribution   []AgeRangeCount       `json:"age_distribution" validate:"required"`
	CityDistribution  []CityCount           `json:"city_distribution" validate:"required"`
}
