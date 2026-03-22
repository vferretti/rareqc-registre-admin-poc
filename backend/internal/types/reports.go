package types

// ExternalSystemCount represents a system name with its participant count.
type ExternalSystemCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// QuarterCount represents a quarter label with its cumulative participant count.
type QuarterCount struct {
	Quarter string `json:"quarter"`
	Count   int    `json:"count"`
}

// AgeRangeCount represents an age range with its participant count.
type AgeRangeCount struct {
	Range string `json:"range"`
	Count int    `json:"count"`
}

// CityCount represents a city with its participant count.
type CityCount struct {
	City  string `json:"city"`
	Count int    `json:"count"`
}

// ReportsSummary holds all summary statistics for the reports page.
type ReportsSummary struct {
	TotalParticipants   int                   `json:"total_participants"`
	FemaleCount         int                   `json:"female_count"`
	MaleCount           int                   `json:"male_count"`
	AverageAge          float64               `json:"average_age"`
	DeceasedCount       int                   `json:"deceased_count"`
	ConsentRegistry     int                   `json:"consent_registry"`
	ConsentRecontact    int                   `json:"consent_recontact"`
	ConsentExtLinkage   int                   `json:"consent_ext_linkage"`
	ExternalSystems     []ExternalSystemCount `json:"external_systems"`
	GrowthByQuarter     []QuarterCount        `json:"growth_by_quarter"`
	AgeDistribution     []AgeRangeCount       `json:"age_distribution"`
	CityDistribution    []CityCount           `json:"city_distribution"`
}
