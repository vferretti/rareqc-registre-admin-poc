package main

import (
	"log"

	"registre-admin/internal/database"
	"registre-admin/internal/server"

	_ "registre-admin/docs"
)

// @title           RareQC Registre Admin API
// @version         1.0
// @description     REST API pour le registre québécois de patients atteints de maladies rares — administration.

// @BasePath  /api
//
// @securityDefinitions.apikey BearerAuth
// @in                         header
// @name                       Authorization
// @description                Jeton Bearer Keycloak (voir rareqc-infra/scripts/api-token.sh). Format : "Bearer <token>". Les sessions cookies du portail fonctionnent aussi automatiquement.
func main() {
	pgDB, err := database.NewPostgresDB()
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}

	if err := database.Migrate(); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	r := server.SetupRouter(pgDB)

	log.Println("server listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
