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
		&types.ConsentStatus{},
		&types.ClauseType{},
		&types.DocumentType{},
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
	if db.Migrator().HasTable("contact") && !db.Migrator().HasColumn(&types.Contact{}, "participant_id") {
		db.Exec("DELETE FROM contact")
		db.Exec("DELETE FROM participant")
		log.Println("Cleared legacy n:n data from contacts/participants")
	}

	// Drop legacy document_format_code table (replaced by mime_type on document)
	if db.Migrator().HasTable("document_format_code") {
		if db.Migrator().HasTable("document") {
			db.Exec("ALTER TABLE document DROP CONSTRAINT IF EXISTS fk_document_format")
			db.Exec("ALTER TABLE document DROP COLUMN IF EXISTS format_code")
		}
		db.Migrator().DropTable("document_format_code")
		log.Println("Dropped legacy document_format_code table")
	}

	// Drop legacy file column from document (moved to document_file table)
	if db.Migrator().HasTable("document") {
		db.Exec("ALTER TABLE document DROP COLUMN IF EXISTS file")
	}

	// Migrate domain tables
	if err := db.AutoMigrate(
		&types.Participant{},
		&types.Contact{},
		&types.ActivityLog{},
		&types.Document{},
		&types.DocumentFile{},
		&types.ConsentClause{},
		&types.Consent{},
		&types.Guid{},
	); err != nil {
		return err
	}

	// Seed consent document and clauses (requires domain tables to exist)
	return seedConsentData(db)
}

// seedConsentData creates the default consent document and its clauses.
func seedConsentData(db *gorm.DB) error {
	consentDoc := types.Document{
		Name:       "Consentement – Registre RareQc",
		TypeCode:   "consent",
		MimeType: "application/pdf",
	}
	db.Where("name = ?", consentDoc.Name).FirstOrCreate(&consentDoc)

	clause1 := types.ConsentClause{
		ClauseFr:       "Je consens à faire partie du registre RareQc.",
		ClauseEn:       "I consent to be part of the RareQc registry.",
		DocumentID:     consentDoc.ID,
		ClauseTypeCode: "registry",
	}
	db.Where("document_id = ? AND clause_type_code = ?", consentDoc.ID, "registry").FirstOrCreate(&clause1)

	clause2 := types.ConsentClause{
		ClauseFr:       "Je consens à être recontacté(e) pour des recherches futures ou des informations liées au registre RareQc.",
		ClauseEn:       "I consent to be recontacted for future research or information related to the RareQc registry.",
		DocumentID:     consentDoc.ID,
		ClauseTypeCode: "recontact",
	}
	db.Where("document_id = ? AND clause_type_code = ?", consentDoc.ID, "recontact").FirstOrCreate(&clause2)

	clause3 := types.ConsentClause{
		ClauseFr:       "Je consens à ce que mes données soient liées à des bases de données externes à des fins de recherche.",
		ClauseEn:       "I consent to having my data linked to external databases for research purposes.",
		DocumentID:     consentDoc.ID,
		ClauseTypeCode: "external_linkage",
	}
	db.Where("document_id = ? AND clause_type_code = ?", consentDoc.ID, "external_linkage").FirstOrCreate(&clause3)

	log.Println("Consent document and clauses seeded")
	return nil
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
		{Code: "contact_deleted", NameEn: "Contact deleted", NameFr: "Contact supprimé"},
		{Code: "consent_added", NameEn: "Consent added", NameFr: "Consentement ajouté"},
	}
	if err := db.Clauses(upsert).Create(&actionTypeValues).Error; err != nil {
		return err
	}

	consentStatusValues := []types.ConsentStatus{
		{Code: "valid", NameEn: "Valid", NameFr: "Valide"},
		{Code: "expired", NameEn: "Expired", NameFr: "Expiré"},
		{Code: "withdrawn", NameEn: "Withdrawn", NameFr: "Retiré"},
		{Code: "replaced_by_new_version", NameEn: "Replaced by new version", NameFr: "Remplacé par nouvelle version"},
	}
	if err := db.Clauses(upsert).Create(&consentStatusValues).Error; err != nil {
		return err
	}

	clauseTypeValues := []types.ClauseType{
		{Code: "registry", NameEn: "Registry", NameFr: "Registre"},
		{Code: "recontact", NameEn: "Recontact", NameFr: "Recontact"},
		{Code: "external_linkage", NameEn: "External linkage", NameFr: "Liaison externe"},
	}
	if err := db.Clauses(upsert).Create(&clauseTypeValues).Error; err != nil {
		return err
	}

	documentTypeValues := []types.DocumentType{
		{Code: "consent", NameEn: "Consent", NameFr: "Consentement"},
	}
	if err := db.Clauses(upsert).Create(&documentTypeValues).Error; err != nil {
		return err
	}

	log.Println("Reference data seeded")
	return nil
}
