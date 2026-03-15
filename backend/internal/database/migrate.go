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
		&types.ActionType{},
	); err != nil {
		return err
	}

	// Seed reference data (upsert — safe to re-run)
	if err := seedReferenceData(db); err != nil {
		return err
	}

	// One-time migration from n:n to 1:n
	if db.Migrator().HasTable("participant_has_contacts") {
		db.Exec("DELETE FROM participant_has_contacts")
		if err := db.Migrator().DropTable("participant_has_contacts"); err != nil {
			return err
		}
		log.Println("Dropped legacy participant_has_contacts table")
	}
	// Clear old contacts that lack participant_id column (pre-1:n schema)
	if db.Migrator().HasTable("contacts") && !db.Migrator().HasColumn(&types.Contact{}, "participant_id") {
		db.Exec("DELETE FROM contacts")
		db.Exec("DELETE FROM participants")
		log.Println("Cleared legacy n:n data from contacts/participants")
	}

	// Migrate domain tables
	return db.AutoMigrate(
		&types.Participant{},
		&types.Contact{},
		&types.ActivityLog{},
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

	actionTypeValues := []types.ActionType{
		{Code: "participant_created", NameEn: "Participant created", NameFr: "Participant créé"},
		{Code: "contact_created", NameEn: "Contact created", NameFr: "Contact créé"},
		{Code: "contact_edited", NameEn: "Contact edited", NameFr: "Contact modifié"},
		{Code: "participant_edited", NameEn: "Participant edited", NameFr: "Participant modifié"},
	}
	if err := db.Clauses(upsert).Create(&actionTypeValues).Error; err != nil {
		return err
	}

	log.Println("Reference data seeded")
	return nil
}
