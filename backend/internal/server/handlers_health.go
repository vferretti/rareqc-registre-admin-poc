package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthHandler godoc
// @Summary      Health check
// @Description  Returns API health status
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /health [get]
func HealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}
