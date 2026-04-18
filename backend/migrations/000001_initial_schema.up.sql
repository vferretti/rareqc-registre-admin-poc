-- 000001_initial_schema.up.sql
-- Full initial schema for rareqc-registre-admin.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- IMMUTABLE wrapper for unaccent (required for GIN index expressions).
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text AS $$
    SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- ============================================================
-- Reference tables
-- ============================================================
CREATE TABLE IF NOT EXISTS sex_at_birth_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vital_status_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_type_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_status_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clause_type_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_type_code (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS communication_method (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS communication_subject (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phone_outcome (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_outcome (
    code    TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL
);

-- ============================================================
-- Seed reference data (idempotent upserts)
-- ============================================================
INSERT INTO sex_at_birth_code (code, name_en, name_fr) VALUES
    ('male',    'Male',    'Masculin'),
    ('female',  'Female',  'Féminin'),
    ('unknown', 'Unknown', 'Inconnu')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO vital_status_code (code, name_en, name_fr) VALUES
    ('alive',    'Alive',    'Vivant'),
    ('deceased', 'Deceased', 'Décédé'),
    ('unknown',  'Unknown',  'Inconnu')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO relationship_code (code, name_en, name_fr) VALUES
    ('self',     'Self',     'Soi-même'),
    ('mother',   'Mother',   'Mère'),
    ('father',   'Father',   'Père'),
    ('guardian', 'Guardian', 'Tuteur/Tutrice'),
    ('other',    'Other',    'Autre')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO action_type_code (code, name_en, name_fr) VALUES
    ('participant_created', 'Participant created', 'Participant créé'),
    ('contact_created',     'Contact created',     'Contact créé'),
    ('contact_edited',      'Contact edited',      'Contact modifié'),
    ('participant_edited',  'Participant edited',   'Participant modifié'),
    ('contact_deleted',     'Contact deleted',      'Contact supprimé'),
    ('consent_added',       'Consent added',        'Consentement ajouté'),
    ('consent_edited',      'Consent edited',       'Consentement modifié')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO consent_status_code (code, name_en, name_fr) VALUES
    ('valid',                   'Valid',                   'Valide'),
    ('expired',                 'Expired',                 'Expiré'),
    ('withdrawn',               'Withdrawn',               'Retiré'),
    ('replaced_by_new_version', 'Replaced by new version', 'Remplacé par nouvelle version')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO clause_type_code (code, name_en, name_fr) VALUES
    ('registry',         'Registry',         'Registre'),
    ('recontact',        'Recontact',        'Recontact'),
    ('external_linkage', 'External linkage', 'Liaison externe')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO document_type_code (code, name_en, name_fr) VALUES
    ('consent_template', 'Consent form template',       'Formulaire de consentement (gabarit)'),
    ('consent_signed',   'Signed consent form',          'Formulaire de consentement (signé)')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO communication_method (code, name_en, name_fr) VALUES
    ('phone', 'Phone', 'Téléphone'),
    ('email', 'Email', 'Courriel')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO communication_subject (code, name_en, name_fr) VALUES
    ('consent_followup',  'Consent follow-up',           'Suivi de consentement'),
    ('contact_update',    'Contact information update',   'Mise à jour des coordonnées'),
    ('study_recruitment', 'Study recruitment',            'Recrutement à une étude'),
    ('data_clarification','Data clarification',           'Clarification de données'),
    ('other',             'Other',                        'Autre')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO phone_outcome (code, name_en, name_fr) VALUES
    ('answered',     'Answered',       'Répondu'),
    ('no_answer',    'No answer',      'Sans réponse'),
    ('voicemail',    'Voicemail left', 'Message vocal laissé'),
    ('wrong_number', 'Wrong number',   'Mauvais numéro')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

INSERT INTO email_outcome (code, name_en, name_fr) VALUES
    ('sent',     'Sent',              'Envoyé'),
    ('response', 'Response received', 'Réponse reçue'),
    ('bounced',  'Bounced',           'Retourné (échec)')
ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_fr = EXCLUDED.name_fr;

-- ============================================================
-- Domain tables
-- ============================================================
CREATE TABLE IF NOT EXISTS participant (
    id                SERIAL PRIMARY KEY,
    first_name        TEXT        NOT NULL,
    last_name         TEXT        NOT NULL,
    date_of_birth     DATE        NOT NULL,
    city_of_birth     TEXT,
    ramq              TEXT        UNIQUE,
    sex_at_birth_code TEXT        NOT NULL REFERENCES sex_at_birth_code(code),
    vital_status_code TEXT        NOT NULL DEFAULT 'alive' REFERENCES vital_status_code(code),
    date_of_death     DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact (
    id                 SERIAL PRIMARY KEY,
    participant_id     INTEGER     NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    first_name         TEXT        NOT NULL,
    last_name          TEXT        NOT NULL,
    relationship_code  TEXT        NOT NULL REFERENCES relationship_code(code),
    is_primary         BOOLEAN     NOT NULL DEFAULT false,
    email              TEXT        NOT NULL DEFAULT '',
    phone              TEXT        NOT NULL DEFAULT '',
    apartment_number   TEXT        NOT NULL DEFAULT '',
    street_address     TEXT        NOT NULL DEFAULT '',
    city               TEXT        NOT NULL DEFAULT '',
    province           TEXT        NOT NULL DEFAULT '',
    code_postal        TEXT        NOT NULL DEFAULT '',
    preferred_language TEXT        NOT NULL DEFAULT 'fr',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document (
    id           SERIAL PRIMARY KEY,
    name         TEXT        NOT NULL,
    file_name    TEXT        NOT NULL,
    type_code    TEXT        NOT NULL REFERENCES document_type_code(code),
    mime_type    TEXT        NOT NULL,
    file_size    BIGINT      NOT NULL DEFAULT 0,
    storage_type TEXT        NOT NULL DEFAULT 'database',
    storage_url  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_file (
    document_id INTEGER PRIMARY KEY REFERENCES document(id),
    data        BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_clause (
    id                   SERIAL PRIMARY KEY,
    template_document_id INTEGER     NOT NULL REFERENCES document(id),
    clause_fr            TEXT        NOT NULL,
    clause_en            TEXT        NOT NULL,
    clause_type_code     TEXT        NOT NULL REFERENCES clause_type_code(code),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent (
    id             SERIAL PRIMARY KEY,
    clause_id      INTEGER     NOT NULL REFERENCES consent_clause(id),
    participant_id INTEGER     NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    date           DATE        NOT NULL,
    status_code    TEXT        NOT NULL REFERENCES consent_status_code(code),
    signed_by_id   INTEGER     REFERENCES contact(id) ON DELETE SET NULL,
    document_id    INTEGER     REFERENCES document(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (clause_id, participant_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id               SERIAL PRIMARY KEY,
    action_type_code TEXT        NOT NULL REFERENCES action_type_code(code),
    participant_id   INTEGER     REFERENCES participant(id) ON DELETE CASCADE,
    author           TEXT        NOT NULL,
    details          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guid (
    id              SERIAL PRIMARY KEY,
    participant_id  INTEGER NOT NULL UNIQUE REFERENCES participant(id) ON DELETE CASCADE,
    guid_basic      TEXT    NOT NULL,
    guid_ramq       TEXT,
    guid_birthplace TEXT
);

CREATE TABLE IF NOT EXISTS external_system (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    title_fr   TEXT        NOT NULL,
    title_en   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_id (
    id                 SERIAL PRIMARY KEY,
    external_system_id INTEGER     NOT NULL REFERENCES external_system(id),
    participant_id     INTEGER     NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    external_id        TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (external_system_id, participant_id)
);

CREATE TABLE IF NOT EXISTS cart_item (
    id             SERIAL PRIMARY KEY,
    user_id        TEXT        NOT NULL,
    participant_id INTEGER     NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, participant_id)
);

CREATE TABLE IF NOT EXISTS communication (
    id                 SERIAL PRIMARY KEY,
    participant_id     INTEGER     NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    contact_id         INTEGER     NOT NULL REFERENCES contact(id),
    contact_value      TEXT,
    method_code        TEXT        NOT NULL REFERENCES communication_method(code),
    subject_code       TEXT        NOT NULL REFERENCES communication_subject(code),
    outcome_code       TEXT,
    communication_date DATE        NOT NULL,
    author             TEXT        NOT NULL,
    comment            TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

-- B-tree indexes (from GORM tags)
CREATE INDEX IF NOT EXISTS idx_contact_participant_id         ON contact(participant_id);
CREATE INDEX IF NOT EXISTS idx_consent_signed_by_id           ON consent(signed_by_id);
CREATE INDEX IF NOT EXISTS idx_consent_document_id            ON consent(document_id);
CREATE INDEX IF NOT EXISTS idx_consent_clause_template_doc_id ON consent_clause(template_document_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type       ON activity_log(action_type_code);
CREATE INDEX IF NOT EXISTS idx_activity_log_participant_id    ON activity_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at        ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_external_id_value              ON external_id(external_id);
CREATE INDEX IF NOT EXISTS idx_communication_participant_id   ON communication(participant_id);

-- GIN trigram indexes for LIKE '%...%' search (accent + case insensitive)
CREATE INDEX IF NOT EXISTS idx_participant_first_name_trgm ON participant USING gin (lower(immutable_unaccent(first_name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_participant_last_name_trgm  ON participant USING gin (lower(immutable_unaccent(last_name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_participant_ramq_trgm       ON participant USING gin (lower(coalesce(ramq, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contact_first_name_trgm     ON contact USING gin (lower(immutable_unaccent(first_name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contact_last_name_trgm      ON contact USING gin (lower(immutable_unaccent(last_name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contact_email_trgm          ON contact USING gin (lower(email) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contact_phone_trgm          ON contact USING gin (phone gin_trgm_ops);

-- GUID lookup indexes
CREATE INDEX IF NOT EXISTS idx_guid_basic      ON guid(guid_basic);
CREATE INDEX IF NOT EXISTS idx_guid_ramq       ON guid(guid_ramq);
CREATE INDEX IF NOT EXISTS idx_guid_birthplace ON guid(guid_birthplace);

-- ============================================================
-- Triggers
-- ============================================================

-- One consent per clause type per participant (across templates).
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unique_consent_clause_type ON consent;
CREATE TRIGGER trg_unique_consent_clause_type
    BEFORE INSERT OR UPDATE ON consent
    FOR EACH ROW EXECUTE FUNCTION check_unique_consent_clause_type();
