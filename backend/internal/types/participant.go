package types

import "time"

type Participant struct {
	ID              int         `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	FirstName       string      `json:"first_name" gorm:"not null" validate:"required"`
	LastName        string      `json:"last_name" gorm:"not null" validate:"required"`
	DateOfBirth     time.Time   `json:"date_of_birth" gorm:"not null;type:date" validate:"required"`
	CityOfBirth     *string     `json:"city_of_birth,omitempty"`
	RAMQ            *string     `json:"ramq,omitempty" gorm:"column:ramq;uniqueIndex"`
	SexAtBirthCode  string      `json:"sex_at_birth_code" gorm:"not null;type:text" validate:"required"`
	SexAtBirth      SexAtBirth  `json:"-" gorm:"foreignKey:SexAtBirthCode;references:Code"`
	VitalStatusCode string      `json:"vital_status_code" gorm:"not null;type:text;default:'alive'" validate:"required"`
	VitalStatus     VitalStatus `json:"-" gorm:"foreignKey:VitalStatusCode;references:Code"`
	DateOfDeath     *time.Time  `json:"date_of_death,omitempty" gorm:"type:date"`
	CreatedAt       time.Time   `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt       time.Time   `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`

	Contacts []Contact `json:"contacts,omitempty" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	Guid     *Guid     `json:"guid,omitempty" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
}

func (Participant) TableName() string {
	return "participant"
}
