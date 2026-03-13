package types

import "time"

type Participant struct {
	ID              int         `json:"id" gorm:"primaryKey;autoIncrement"`
	FirstName       string      `json:"first_name" gorm:"not null"`
	LastName        string      `json:"last_name" gorm:"not null"`
	DateOfBirth     time.Time   `json:"date_of_birth" gorm:"not null;type:date"`
	CityOfBirth     *string     `json:"city_of_birth,omitempty"`
	RAMQ            *string     `json:"ramq,omitempty" gorm:"column:ramq"`
	SexAtBirthCode  string      `json:"sex_at_birth_code" gorm:"not null;type:text"`
	SexAtBirth      SexAtBirth  `json:"-" gorm:"foreignKey:SexAtBirthCode;references:Code"`
	VitalStatusCode string      `json:"vital_status_code" gorm:"not null;type:text;default:'alive'"`
	VitalStatus     VitalStatus `json:"-" gorm:"foreignKey:VitalStatusCode;references:Code"`
	DateOfDeath     *time.Time  `json:"date_of_death,omitempty" gorm:"type:date"`
	CreatedAt       time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time   `json:"updated_at" gorm:"autoUpdateTime"`

	Contacts []ParticipantHasContact `json:"contacts,omitempty" gorm:"foreignKey:ParticipantID"`
}

func (Participant) TableName() string {
	return "participants"
}
