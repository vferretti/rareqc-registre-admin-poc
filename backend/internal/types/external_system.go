package types

import "time"

// ExternalSystem represents an external system that tracks participants.
type ExternalSystem struct {
	ID        int       `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	Name      string    `json:"name" gorm:"not null;type:text" validate:"required"`
	TitleFr   string    `json:"title_fr" gorm:"not null;type:text" validate:"required"`
	TitleEn   string    `json:"title_en" gorm:"not null;type:text" validate:"required"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (ExternalSystem) TableName() string { return "external_system" }

// ExternalID maps a participant to their identifier in an external system.
type ExternalID struct {
	ID               int            `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	ExternalSystemID int            `json:"external_system_id" gorm:"not null;uniqueIndex:idx_external_system_participant" validate:"required"`
	ExternalSystem   ExternalSystem `json:"-" gorm:"foreignKey:ExternalSystemID"`
	ParticipantID    int            `json:"participant_id" gorm:"not null;uniqueIndex:idx_external_system_participant" validate:"required"`
	Participant      Participant    `json:"-" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	ExternalID       string         `json:"external_id" gorm:"not null;type:text;index" validate:"required"`
	CreatedAt        time.Time      `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt        time.Time      `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (ExternalID) TableName() string { return "external_id" }
