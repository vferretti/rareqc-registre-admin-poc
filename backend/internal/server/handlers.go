package server

import (
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// SetupRouter configures the Gin engine with CORS, Swagger, and all API routes.
func SetupRouter(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // TODO: restrict to specific origins in production
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Author"},
		AllowCredentials: false,
	}))

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Repositories
	participantRepo := repository.NewParticipantRepository(db)
	contactRepo := repository.NewContactRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	searchRepo := repository.NewSearchRepository(db)
	consentRepo := repository.NewConsentRepository(db)
	docRepo := repository.NewDocumentRepository(db)

	api := r.Group("/api")
	{
		api.GET("/health", HealthHandler())
		api.GET("/enums", EnumsHandler(db))

		api.GET("/participants", ListParticipantsHandler(participantRepo))
		api.GET("/participants/:id", GetParticipantHandler(participantRepo))
		api.POST("/participants", CreateParticipantHandler(participantRepo, contactRepo, activityRepo))
		api.PUT("/participants/:id", UpdateParticipantHandler(participantRepo, contactRepo, activityRepo))

		api.POST("/participants/:id/contacts", AddContactHandler(participantRepo, contactRepo, activityRepo))
		api.PUT("/contacts/:contactId", UpdateContactHandler(contactRepo, activityRepo))
		api.DELETE("/contacts/:contactId", DeleteContactHandler(contactRepo, activityRepo))

		api.GET("/participants/:id/consents", ListParticipantConsentsHandler(consentRepo))
		api.POST("/participants/:id/consents", CreateParticipantConsentHandler(consentRepo, activityRepo))
		api.PUT("/consents/:consentId", UpdateConsentHandler(consentRepo, activityRepo))
		api.GET("/consent-clauses", ListConsentClausesHandler(consentRepo))
		api.GET("/consent-templates", ListConsentTemplatesHandler(consentRepo))

		api.POST("/documents", UploadDocumentHandler(docRepo))
		api.GET("/documents/:id/file", DownloadDocumentHandler(docRepo))

		api.GET("/search", SearchHandler(searchRepo))

		api.GET("/activity-logs", ListActivityLogsHandler(activityRepo))
		api.GET("/participants/:id/activity-logs", ListParticipantActivityLogsHandler(participantRepo, activityRepo))
	}

	return r
}

// parsePaginationParams extracts and validates pagination, sorting, and search parameters from the query string.
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
