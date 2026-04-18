package types

type PaginationParams struct {
	PageIndex              int      `json:"page_index"`
	PageSize               int      `json:"page_size"`
	SortField              string   `json:"sort_field"`
	SortOrder              string   `json:"sort_order"`
	Search                 string   `json:"search"`
	ConsentRegistry        []string `json:"consent_registry"`
	ConsentRecontact       []string `json:"consent_recontact"`
	ConsentExternalLinkage []string `json:"consent_external_linkage"`
	ExternalSystems        []string `json:"external_systems"`
	ParticipantIDs         []int    `json:"participant_ids"`
}

type PaginatedResponse[T any] struct {
	Data       []T `json:"data" validate:"required"`
	Total      int `json:"total" validate:"required"`
	PageIndex  int `json:"page_index" validate:"required"`
	PageSize   int `json:"page_size" validate:"required"`
	TotalPages int `json:"total_pages" validate:"required"`
}
