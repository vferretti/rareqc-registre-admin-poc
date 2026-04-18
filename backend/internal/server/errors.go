package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/types"
)

func handleError(c *gin.Context, status int, msg string) {
	c.JSON(status, types.ErrorResponse{Error: msg})
}

func handleNotFound(c *gin.Context, entity string) {
	handleError(c, http.StatusNotFound, entity+" not found")
}

func handleBadRequest(c *gin.Context, msg string) {
	handleError(c, http.StatusBadRequest, msg)
}

func handleInternalError(c *gin.Context, msg string) {
	handleError(c, http.StatusInternalServerError, msg)
}

func handleConflict(c *gin.Context, msg string) {
	handleError(c, http.StatusConflict, msg)
}
