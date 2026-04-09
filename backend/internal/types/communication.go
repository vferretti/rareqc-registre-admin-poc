package types

import "time"

// CommunicationMethod reference table (phone, email).
type CommunicationMethod struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (CommunicationMethod) TableName() string { return "communication_method" }

// CommunicationSubject reference table (consent_followup, contact_update, etc.).
type CommunicationSubject struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (CommunicationSubject) TableName() string { return "communication_subject" }

// PhoneOutcome reference table (answered, no_answer, voicemail, wrong_number).
type PhoneOutcome struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (PhoneOutcome) TableName() string { return "phone_outcome" }

// EmailOutcome reference table (sent, bounced).
type EmailOutcome struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (EmailOutcome) TableName() string { return "email_outcome" }

// Communication records a communication attempt with a participant.
type Communication struct {
	ID                int                  `json:"id" gorm:"primaryKey;autoIncrement"`
	ParticipantID     int                  `json:"participant_id" gorm:"not null;index"`
	Participant       Participant          `json:"-" gorm:"foreignKey:ParticipantID"`
	ContactID         *int                 `json:"contact_id,omitempty"`
	Contact           *Contact             `json:"contact,omitempty" gorm:"foreignKey:ContactID;constraint:OnDelete:SET NULL"`
	ContactValue      *string              `json:"contact_value,omitempty" gorm:"type:text"`
	MethodCode        string               `json:"method_code" gorm:"not null;type:text"`
	Method            CommunicationMethod  `json:"-" gorm:"foreignKey:MethodCode;references:Code"`
	SubjectCode       string               `json:"subject_code" gorm:"not null;type:text"`
	Subject           CommunicationSubject `json:"-" gorm:"foreignKey:SubjectCode;references:Code"`
	OutcomeCode       *string              `json:"outcome_code,omitempty" gorm:"type:text"`
	CommunicationDate time.Time            `json:"communication_date" gorm:"not null;type:date"`
	Author            string               `json:"author" gorm:"not null;type:text"`
	Comment           *string              `json:"comment,omitempty" gorm:"type:text"`
	CreatedAt         time.Time            `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt         time.Time            `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Communication) TableName() string { return "communication" }
