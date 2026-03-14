package types

import "time"

type Contact struct {
	ID                int          `json:"id" gorm:"primaryKey;autoIncrement"`
	ParticipantID     int          `json:"participant_id" gorm:"not null;index"`
	Participant       Participant  `json:"-" gorm:"foreignKey:ParticipantID"`
	FirstName         string       `json:"first_name" gorm:"not null"`
	LastName          string       `json:"last_name" gorm:"not null"`
	RelationshipCode  string       `json:"relationship_code" gorm:"not null;type:text"`
	Relationship      Relationship `json:"-" gorm:"foreignKey:RelationshipCode;references:Code"`
	IsPrimary         bool         `json:"is_primary" gorm:"not null;default:false"`
	Email             string       `json:"email"`
	Phone             string       `json:"phone"`
	StreetAddress     string       `json:"street_address"`
	City              string       `json:"city"`
	Province          string       `json:"province"`
	CodePostal        string       `json:"code_postal"`
	PreferredLanguage string       `json:"preferred_language" gorm:"type:text;default:'fr'"`
	CreatedAt         time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt         time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Contact) TableName() string {
	return "contacts"
}
