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

	// Enable pg_trgm extension for trigram-based search indexes
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm").Error; err != nil {
		return err
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
		&types.ExternalSystem{},
		&types.ExternalID{},
		&types.CartItem{},
	); err != nil {
		return err
	}

	// Constraint: one consent per clause type per participant (across templates)
	db.Exec(`
		CREATE OR REPLACE FUNCTION check_unique_consent_clause_type()
		RETURNS TRIGGER AS $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM consent c
				JOIN consent_clause cc ON c.clause_id = cc.id
				JOIN consent_clause new_cc ON new_cc.id = NEW.clause_id
				WHERE c.participant_id = NEW.participant_id
				AND cc.clause_type_code = new_cc.clause_type_code
				AND c.id != COALESCE(NEW.id, 0)
			) THEN
				RAISE EXCEPTION 'A consent of this clause type already exists for this participant';
			END IF;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`)
	db.Exec(`
		DROP TRIGGER IF EXISTS trg_unique_consent_clause_type ON consent`)
	db.Exec(`
		CREATE TRIGGER trg_unique_consent_clause_type
		BEFORE INSERT OR UPDATE ON consent
		FOR EACH ROW EXECUTE FUNCTION check_unique_consent_clause_type()`)

	// GIN trigram indexes for search (LIKE '%...%' with unaccent)
	searchIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_participant_first_name_trgm ON participant USING gin (lower(unaccent(first_name)) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_participant_last_name_trgm ON participant USING gin (lower(unaccent(last_name)) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_participant_ramq_trgm ON participant USING gin (lower(coalesce(ramq, '')) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_contact_first_name_trgm ON contact USING gin (lower(unaccent(first_name)) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_contact_last_name_trgm ON contact USING gin (lower(unaccent(last_name)) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_contact_email_trgm ON contact USING gin (lower(email) gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_contact_phone_trgm ON contact USING gin (phone gin_trgm_ops)",
	}
	for _, idx := range searchIndexes {
		if err := db.Exec(idx).Error; err != nil {
			log.Printf("Warning: failed to create index: %v", err)
		}
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
