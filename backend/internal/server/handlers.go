package server

import (
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

func SetupRouter(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Author"},
		AllowCredentials: false,
	}))

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	api := r.Group("/api")
	{
		api.GET("/health", HealthHandler())

		api.GET("/participants", ListParticipantsHandler(db))
		api.GET("/participants/:id", GetParticipantHandler(db))
		api.POST("/participants", CreateParticipantHandler(db))
		api.PUT("/participants/:id", UpdateParticipantHandler(db))

		api.GET("/activity-logs", ListActivityLogsHandler(db))
		api.GET("/participants/:id/activity-logs", ListParticipantActivityLogsHandler(db))
	}

	return r
}

func parsePaginationParams(c *gin.Context, defaultSortField string) types.PaginationParams {
	pageIndex, _ := strconv.Atoi(c.DefaultQuery("page_index", "0"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "25"))
	sortField := c.DefaultQuery("sort_field", defaultSortField)
	sortOrder := c.DefaultQuery("sort_order", "asc")
	search := c.Query("search")

	if pageSize < 1 {
		pageSize = 25
	}
	if pageSize > 200 {
		pageSize = 200
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "asc"
	}

	return types.PaginationParams{
		PageIndex: pageIndex,
		PageSize:  pageSize,
		SortField: sortField,
		SortOrder: sortOrder,
		Search:    search,
	}
}
