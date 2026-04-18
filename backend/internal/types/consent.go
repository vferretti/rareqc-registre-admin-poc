package types

import "time"

// ConsentClause represents a clause within a consent template document.
type ConsentClause struct {
	ID                 int        `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	TemplateDocumentID int        `json:"template_document_id" gorm:"not null;index" validate:"required"`
	TemplateDocument   Document   `json:"-" gorm:"foreignKey:TemplateDocumentID"`
	ClauseFr           string     `json:"clause_fr" gorm:"not null;type:text" validate:"required"`
	ClauseEn           string     `json:"clause_en" gorm:"not null;type:text" validate:"required"`
	ClauseTypeCode     string     `json:"clause_type_code" gorm:"not null;type:text" validate:"required"`
	ClauseType         ClauseType `json:"-" gorm:"foreignKey:ClauseTypeCode;references:Code"`
	CreatedAt          time.Time  `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt          time.Time  `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`

	Consents []Consent `json:"consents,omitempty" gorm:"foreignKey:ClauseID"`
}

func (ConsentClause) TableName() string { return "consent_clause" }

// Consent represents a participant's consent to a specific clause, optionally signed by a contact.
type Consent struct {
	ID            int           `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	ClauseID      int           `json:"clause_id" gorm:"not null;uniqueIndex:idx_consent_participant_clause" validate:"required"`
	Clause        ConsentClause `json:"-" gorm:"foreignKey:ClauseID"`
	ParticipantID int           `json:"participant_id" gorm:"not null;uniqueIndex:idx_consent_participant_clause" validate:"required"`
	Participant   Participant   `json:"-" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	Date          time.Time     `json:"date" gorm:"not null;type:date" validate:"required"`
	StatusCode    string        `json:"status_code" gorm:"not null;type:text" validate:"required"`
	Status        ConsentStatus `json:"-" gorm:"foreignKey:StatusCode;references:Code"`
	SignedByID    *int          `json:"signed_by_id,omitempty" gorm:"index"`
	SignedBy      *Contact      `json:"signed_by,omitempty" gorm:"foreignKey:SignedByID;constraint:OnDelete:SET NULL"`
	DocumentID    *int          `json:"document_id,omitempty" gorm:"index"`
	Document      *Document     `json:"-" gorm:"foreignKey:DocumentID"`
	CreatedAt     time.Time     `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt     time.Time     `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (Consent) TableName() string { return "consent" }
