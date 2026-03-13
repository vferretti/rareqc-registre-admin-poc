package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/types"
)

func respondError(c *gin.Context, status int, err string, message string) {
	c.JSON(status, types.ErrorResponse{
		Error:   err,
		Message: message,
	})
}

func respondInternalError(c *gin.Context, err error) {
	respondError(c, http.StatusInternalServerError, "internal_error", err.Error())
}

func respondBadRequest(c *gin.Context, message string) {
	respondError(c, http.StatusBadRequest, "bad_request", message)
}

func respondNotFound(c *gin.Context, message string) {
	respondError(c, http.StatusNotFound, "not_found", message)
}
