package database

import (
	"fmt"
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
		&types.CommunicationMethod{},
		&types.CommunicationSubject{},
		&types.PhoneOutcome{},
		&types.EmailOutcome{},
	); err != nil {
		return err
	}

	// Seed reference data (upsert — safe to re-run)
	if err := seedReferenceData(db); err != nil {
		return err
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
		&types.Communication{},
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
		"CREATE INDEX IF NOT EXISTS idx_guid_basic ON guid (guid_basic)",
		"CREATE INDEX IF NOT EXISTS idx_guid_ramq ON guid (guid_ramq)",
		"CREATE INDEX IF NOT EXISTS idx_guid_birthplace ON guid (guid_birthplace)",
	}
	for _, idx := range searchIndexes {
		if err := db.Exec(idx).Error; err != nil {
			log.Printf("Warning: failed to create index: %v", err)
		}
	}

	// Ensure ON DELETE CASCADE on all FK referencing participant
	cascadeFKs := []struct{ table, constraint, fk string }{
		{"contact", "fk_contact_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"consent", "fk_consent_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"consent", "fk_consent_signed_by", "FOREIGN KEY (signed_by_id) REFERENCES contact(id) ON DELETE SET NULL"},
		{"communication", "fk_communication_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"communication", "fk_communication_contact", "FOREIGN KEY (contact_id) REFERENCES contact(id)"},
		{"activity_log", "fk_activity_log_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"guid", "fk_guid_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"external_id", "fk_external_id_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
		{"cart_item", "fk_cart_item_participant", "FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE"},
	}
	for _, fk := range cascadeFKs {
		db.Exec(fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s", fk.table, fk.constraint))
		if err := db.Exec(fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s %s", fk.table, fk.constraint, fk.fk)).Error; err != nil {
			log.Printf("Warning: failed to add cascade FK %s: %v", fk.constraint, err)
		}
	}

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

	communicationMethodValues := []types.CommunicationMethod{
		{Code: "phone", NameEn: "Phone", NameFr: "Téléphone"},
		{Code: "email", NameEn: "Email", NameFr: "Courriel"},
	}
	if err := db.Clauses(upsert).Create(&communicationMethodValues).Error; err != nil {
		return err
	}

	communicationSubjectValues := []types.CommunicationSubject{
		{Code: "consent_followup", NameEn: "Consent follow-up", NameFr: "Suivi de consentement"},
		{Code: "contact_update", NameEn: "Contact information update", NameFr: "Mise à jour des coordonnées"},
		{Code: "study_recruitment", NameEn: "Study recruitment", NameFr: "Recrutement à une étude"},
		{Code: "data_clarification", NameEn: "Data clarification", NameFr: "Clarification de données"},
		{Code: "other", NameEn: "Other", NameFr: "Autre"},
	}
	if err := db.Clauses(upsert).Create(&communicationSubjectValues).Error; err != nil {
		return err
	}

	phoneOutcomeValues := []types.PhoneOutcome{
		{Code: "answered", NameEn: "Answered", NameFr: "Répondu"},
		{Code: "no_answer", NameEn: "No answer", NameFr: "Sans réponse"},
		{Code: "voicemail", NameEn: "Voicemail left", NameFr: "Message vocal laissé"},
		{Code: "wrong_number", NameEn: "Wrong number", NameFr: "Mauvais numéro"},
	}
	if err := db.Clauses(upsert).Create(&phoneOutcomeValues).Error; err != nil {
		return err
	}

	emailOutcomeValues := []types.EmailOutcome{
		{Code: "sent", NameEn: "Sent", NameFr: "Envoyé"},
		{Code: "response", NameEn: "Response received", NameFr: "Réponse reçue"},
		{Code: "bounced", NameEn: "Bounced", NameFr: "Retourné (échec)"},
	}
	if err := db.Clauses(upsert).Create(&emailOutcomeValues).Error; err != nil {
		return err
	}

	log.Println("Reference data seeded")
	return nil
}
