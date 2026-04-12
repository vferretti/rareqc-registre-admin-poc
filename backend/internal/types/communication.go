package types

import "time"

// CommunicationMethod reference table (phone, email).
type CommunicationMethod struct {
	Code   string `json:"code" gorm:"primaryKey;type:text" validate:"required"`
	NameEn string `json:"name_en" gorm:"not null" validate:"required"`
	NameFr string `json:"name_fr" gorm:"not null" validate:"required"`
}

func (CommunicationMethod) TableName() string { return "communication_method" }

// CommunicationSubject reference table (consent_followup, contact_update, etc.).
type CommunicationSubject struct {
	Code   string `json:"code" gorm:"primaryKey;type:text" validate:"required"`
	NameEn string `json:"name_en" gorm:"not null" validate:"required"`
	NameFr string `json:"name_fr" gorm:"not null" validate:"required"`
}

func (CommunicationSubject) TableName() string { return "communication_subject" }

// PhoneOutcome reference table (answered, no_answer, voicemail, wrong_number).
type PhoneOutcome struct {
	Code   string `json:"code" gorm:"primaryKey;type:text" validate:"required"`
	NameEn string `json:"name_en" gorm:"not null" validate:"required"`
	NameFr string `json:"name_fr" gorm:"not null" validate:"required"`
}

func (PhoneOutcome) TableName() string { return "phone_outcome" }

// EmailOutcome reference table (sent, bounced).
type EmailOutcome struct {
	Code   string `json:"code" gorm:"primaryKey;type:text" validate:"required"`
	NameEn string `json:"name_en" gorm:"not null" validate:"required"`
	NameFr string `json:"name_fr" gorm:"not null" validate:"required"`
}

func (EmailOutcome) TableName() string { return "email_outcome" }

// Communication records a communication attempt with a participant.
type Communication struct {
	ID                int                  `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	ParticipantID     int                  `json:"participant_id" gorm:"not null;index" validate:"required"`
	Participant       Participant          `json:"-" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	ContactID         int                  `json:"contact_id" gorm:"not null" validate:"required"`
	Contact           Contact              `json:"-" gorm:"foreignKey:ContactID"`
	ContactValue      *string              `json:"contact_value,omitempty" gorm:"type:text"`
	MethodCode        string               `json:"method_code" gorm:"not null;type:text" validate:"required"`
	Method            CommunicationMethod  `json:"-" gorm:"foreignKey:MethodCode;references:Code"`
	SubjectCode       string               `json:"subject_code" gorm:"not null;type:text" validate:"required"`
	Subject           CommunicationSubject `json:"-" gorm:"foreignKey:SubjectCode;references:Code"`
	OutcomeCode       *string              `json:"outcome_code,omitempty" gorm:"type:text"`
	CommunicationDate time.Time            `json:"communication_date" gorm:"not null;type:date" validate:"required"`
	Author            string               `json:"author" gorm:"not null;type:text" validate:"required"`
	Comment           *string              `json:"comment,omitempty" gorm:"type:text"`
	CreatedAt         time.Time            `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt         time.Time            `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (Communication) TableName() string { return "communication" }
