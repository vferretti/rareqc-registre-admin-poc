package types

import "time"

type Contact struct {
	ID                int          `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	ParticipantID     int          `json:"participant_id" gorm:"not null;index" validate:"required"`
	Participant       Participant  `json:"-" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	FirstName         string       `json:"first_name" gorm:"not null" validate:"required"`
	LastName          string       `json:"last_name" gorm:"not null" validate:"required"`
	RelationshipCode  string       `json:"relationship_code" gorm:"not null;type:text" validate:"required"`
	Relationship      Relationship `json:"-" gorm:"foreignKey:RelationshipCode;references:Code"`
	IsPrimary         bool         `json:"is_primary" gorm:"not null;default:false" validate:"required"`
	Email             string       `json:"email" validate:"required"`
	Phone             string       `json:"phone" validate:"required"`
	ApartmentNumber   string       `json:"apartment_number" validate:"required"`
	StreetAddress     string       `json:"street_address" validate:"required"`
	City              string       `json:"city" validate:"required"`
	Province          string       `json:"province" validate:"required"`
	CodePostal        string       `json:"code_postal" validate:"required"`
	PreferredLanguage string       `json:"preferred_language" gorm:"type:text;default:'fr'" validate:"required"`
	CreatedAt         time.Time    `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt         time.Time    `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (Contact) TableName() string {
	return "contact"
}
