package types

type ErrorResponse struct {
	Error   string `json:"error" validate:"required"`
	Message string `json:"message,omitempty"`
}
