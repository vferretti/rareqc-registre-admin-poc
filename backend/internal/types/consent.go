package types

import "time"

// ConsentClause represents a specific clause within a consent document.
type ConsentClause struct {
	ID             int       `json:"id" gorm:"primaryKey;autoIncrement"`
	ClauseFr       string    `json:"clause_fr" gorm:"not null;type:text"`
	ClauseEn       string    `json:"clause_en" gorm:"not null;type:text"`
	DocumentID     int       `json:"document_id" gorm:"not null;index"`
	Document       Document  `json:"-" gorm:"foreignKey:DocumentID"`
	ClauseTypeCode string    `json:"clause_type_code" gorm:"not null;type:text"`
	ClauseType     ClauseType `json:"-" gorm:"foreignKey:ClauseTypeCode;references:Code"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Consents []Consent `json:"consents,omitempty" gorm:"foreignKey:ClauseID"`
}

func (ConsentClause) TableName() string { return "consent_clause" }

// Consent represents a participant's consent to a specific clause, optionally signed by a contact.
type Consent struct {
	ID            int        `json:"id" gorm:"primaryKey;autoIncrement"`
	ClauseID      int        `json:"clause_id" gorm:"not null;index"`
	Clause        ConsentClause `json:"-" gorm:"foreignKey:ClauseID"`
	ParticipantID int        `json:"participant_id" gorm:"not null;index"`
	Participant   Participant `json:"-" gorm:"foreignKey:ParticipantID"`
	Date          time.Time  `json:"date" gorm:"not null;type:date"`
	StatusCode    string     `json:"status_code" gorm:"not null;type:text"`
	Status        ConsentStatus `json:"-" gorm:"foreignKey:StatusCode;references:Code"`
	SignedByID    *int       `json:"signed_by_id,omitempty" gorm:"index"`
	SignedBy      *Contact   `json:"signed_by,omitempty" gorm:"foreignKey:SignedByID"`
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Consent) TableName() string { return "consent" }
