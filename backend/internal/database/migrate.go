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

	// Drop legacy document_id from consent_clause (document is now linked via consent)
	if db.Migrator().HasTable("consent_clause") {
		db.Exec("ALTER TABLE consent_clause DROP CONSTRAINT IF EXISTS fk_document_consent_clauses")
		db.Exec("ALTER TABLE consent_clause DROP COLUMN IF EXISTS document_id")
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

// seedConsentData creates the consent template documents and their clauses.
func seedConsentData(db *gorm.DB) error {
	// Template 1: RareQc — 2 clauses (registry + recontact)
	rareqcDoc := types.Document{
		Name:     "Formulaire de consentement – RareQc",
		FileName: "Consentement_RareQc.pdf",
		TypeCode: "consent_template",
		MimeType: "application/pdf",
	}
	db.Where("file_name = ?", rareqcDoc.FileName).FirstOrCreate(&rareqcDoc)

	rareqcClauses := []types.ConsentClause{
		{TemplateDocumentID: rareqcDoc.ID, ClauseTypeCode: "registry",
			ClauseFr: "Je consens à faire partie du registre RareQc.",
			ClauseEn: "I consent to be part of the RareQc registry."},
		{TemplateDocumentID: rareqcDoc.ID, ClauseTypeCode: "recontact",
			ClauseFr: "Je consens à être recontacté(e) pour des recherches futures ou des informations liées au registre RareQc.",
			ClauseEn: "I consent to be recontacted for future research or information related to the RareQc registry."},
	}
	for _, clause := range rareqcClauses {
		db.Where("clause_type_code = ? AND template_document_id = ?", clause.ClauseTypeCode, rareqcDoc.ID).FirstOrCreate(&clause)
	}

	// Template 2: RQDM — 3 clauses (registry + recontact + external linkage)
	rqdmDoc := types.Document{
		Name:     "Formulaire de consentement – RQDM",
		FileName: "Consentement_RQDM.pdf",
		TypeCode: "consent_template",
		MimeType: "application/pdf",
	}
	db.Where("name = ?", rqdmDoc.Name).FirstOrCreate(&rqdmDoc)

	rqdmClauses := []types.ConsentClause{
		{TemplateDocumentID: rqdmDoc.ID, ClauseTypeCode: "registry",
			ClauseFr: "Je consens à faire partie du registre RareQc et à ce que mes échantillons biologiques, mes données cliniques et génomiques soient conservés et utilisés à des fins de diagnostic moléculaire et de recherche en génomique.",
			ClauseEn: "I consent to be part of the RareQc registry and to having my biological samples, clinical and genomic data stored and used for molecular diagnostic and genomic research purposes."},
		{TemplateDocumentID: rqdmDoc.ID, ClauseTypeCode: "recontact",
			ClauseFr: "Je consens à être recontacté(e) si de nouvelles découvertes pertinentes à ma condition de santé sont identifiées, ou pour être invité(e) à participer à de nouvelles études de recherche.",
			ClauseEn: "I consent to being recontacted if new findings relevant to my health condition are identified, or to be invited to participate in new research studies."},
		{TemplateDocumentID: rqdmDoc.ID, ClauseTypeCode: "external_linkage",
			ClauseFr: "Je consens à ce que mes données soient liées à des bases de données provinciales, nationales ou internationales (ex. ClinVar, OMIM, bases hospitalières) à des fins de recherche et d'amélioration du diagnostic.",
			ClauseEn: "I consent to having my data linked to provincial, national, or international databases (e.g., ClinVar, OMIM, hospital databases) for research and diagnostic improvement purposes."},
	}
	for _, clause := range rqdmClauses {
		db.Where("clause_type_code = ? AND template_document_id = ?", clause.ClauseTypeCode, rqdmDoc.ID).FirstOrCreate(&clause)
	}

	log.Println("Consent templates and clauses seeded")
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
		{Code: "consent_edited", NameEn: "Consent edited", NameFr: "Consentement modifié"},
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
		{Code: "consent_template", NameEn: "Consent form template", NameFr: "Formulaire de consentement (gabarit)"},
		{Code: "consent_signed", NameEn: "Signed consent form", NameFr: "Formulaire de consentement (signé)"},
	}
	if err := db.Clauses(upsert).Create(&documentTypeValues).Error; err != nil {
		return err
	}

	log.Println("Reference data seeded")
	return nil
}
