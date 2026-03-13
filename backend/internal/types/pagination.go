package types

type PaginationParams struct {
	PageIndex int    `json:"page_index"`
	PageSize  int    `json:"page_size"`
	SortField string `json:"sort_field"`
	SortOrder string `json:"sort_order"`
	Search    string `json:"search"`
}

type PaginatedResponse[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	PageIndex  int `json:"page_index"`
	PageSize   int `json:"page_size"`
	TotalPages int `json:"total_pages"`
}
