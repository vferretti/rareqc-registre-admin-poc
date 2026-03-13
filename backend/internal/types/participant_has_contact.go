package types

import "time"

type ParticipantHasContact struct {
	ID               int          `json:"id" gorm:"primaryKey;autoIncrement"`
	ParticipantID    int          `json:"participant_id" gorm:"not null;index"`
	Participant      Participant  `json:"-" gorm:"foreignKey:ParticipantID"`
	ContactID        int          `json:"contact_id" gorm:"not null;index"`
	Contact          Contact      `json:"contact" gorm:"foreignKey:ContactID"`
	RelationshipCode string       `json:"relationship_code" gorm:"not null;type:text"`
	Relationship     Relationship `json:"-" gorm:"foreignKey:RelationshipCode;references:Code"`
	IsPrimary        bool         `json:"is_primary" gorm:"not null;default:false"`
	CreatedAt        time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ParticipantHasContact) TableName() string {
	return "participant_has_contacts"
}
