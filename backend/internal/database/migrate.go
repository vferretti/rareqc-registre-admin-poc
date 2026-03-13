package database

import (
	"log"

	"registre-admin/internal/types"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// AutoMigrate creates reference tables, seeds them, then migrates all models.
func AutoMigrate(db *gorm.DB) error {
	// Enable unaccent extension for accent-insensitive search
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS unaccent").Error; err != nil {
		return err
	}

	// Migrate reference tables first (they are FK targets)
	if err := db.AutoMigrate(
		&types.SexAtBirth{},
		&types.VitalStatus{},
		&types.Relationship{},
	); err != nil {
		return err
	}

	// Seed reference data (upsert — safe to re-run)
	if err := seedReferenceData(db); err != nil {
		return err
	}

	// Migrate domain tables
	return db.AutoMigrate(
		&types.Participant{},
		&types.Contact{},
		&types.ParticipantHasContact{},
	)
}

func seedReferenceData(db *gorm.DB) error {
	sexValues := []types.SexAtBirth{
		{Code: "male", NameEn: "Male", NameFr: "Masculin"},
		{Code: "female", NameEn: "Female", NameFr: "Féminin"},
		{Code: "unknown", NameEn: "Unknown", NameFr: "Inconnu"},
	}

	vitalValues := []types.VitalStatus{
		{Code: "alive", NameEn: "Alive", NameFr: "Vivant"},
		{Code: "deceased", NameEn: "Deceased", NameFr: "Décédé"},
		{Code: "unknown", NameEn: "Unknown", NameFr: "Inconnu"},
	}

	relationshipValues := []types.Relationship{
		{Code: "self", NameEn: "Self", NameFr: "Soi-même"},
		{Code: "mother", NameEn: "Mother", NameFr: "Mère"},
		{Code: "father", NameEn: "Father", NameFr: "Père"},
		{Code: "guardian", NameEn: "Guardian", NameFr: "Tuteur/Tutrice"},
		{Code: "other", NameEn: "Other", NameFr: "Autre"},
	}

	upsert := clause.OnConflict{UpdateAll: true}

	if err := db.Clauses(upsert).Create(&sexValues).Error; err != nil {
		return err
	}
	if err := db.Clauses(upsert).Create(&vitalValues).Error; err != nil {
		return err
	}
	if err := db.Clauses(upsert).Create(&relationshipValues).Error; err != nil {
		return err
	}

	log.Println("Reference data seeded")
	return nil
}
