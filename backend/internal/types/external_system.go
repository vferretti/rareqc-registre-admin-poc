package types

import "time"

// ExternalSystem represents an external system that tracks participants.
type ExternalSystem struct {
	ID        int       `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name" gorm:"not null;type:text"`
	Title     string    `json:"title" gorm:"not null;type:text"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ExternalSystem) TableName() string { return "external_system" }

// ExternalID maps a participant to their identifier in an external system.
type ExternalID struct {
	ID               int            `json:"id" gorm:"primaryKey;autoIncrement"`
	ExternalSystemID int            `json:"external_system_id" gorm:"not null;uniqueIndex:idx_external_system_participant"`
	ExternalSystem   ExternalSystem `json:"-" gorm:"foreignKey:ExternalSystemID"`
	ParticipantID    int            `json:"participant_id" gorm:"not null;uniqueIndex:idx_external_system_participant"`
	Participant      Participant    `json:"-" gorm:"foreignKey:ParticipantID"`
	ExternalID       string         `json:"external_id" gorm:"not null;type:text;index"`
	CreatedAt        time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ExternalID) TableName() string { return "external_id" }
