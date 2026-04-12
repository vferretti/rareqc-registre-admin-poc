package types

// Guid stores computed identifiers for participant deduplication across data sources.
type Guid struct {
	ID             int          `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	ParticipantID  int          `json:"participant_id" gorm:"uniqueIndex;not null" validate:"required"`
	Participant    *Participant `json:"-" gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	GuidBasic      string       `json:"guid_basic" gorm:"not null;type:text" validate:"required"`
	GuidRamq       *string      `json:"guid_ramq,omitempty" gorm:"type:text"`
	GuidBirthplace *string      `json:"guid_birthplace,omitempty" gorm:"type:text"`
}

func (Guid) TableName() string { return "guid" }
