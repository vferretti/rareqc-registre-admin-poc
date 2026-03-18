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

// @host      localhost:8080
// @BasePath  /api
func main() {
	pgDB, err := database.NewPostgresDB()
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}

	if err := database.AutoMigrate(pgDB); err != nil {
		log.Fatalf("failed to auto-migrate: %v", err)
	}

	r := server.SetupRouter(pgDB)

	log.Println("server listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
