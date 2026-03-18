package types

// Guid stores computed identifiers for participant deduplication across data sources.
type Guid struct {
	ID             int          `json:"id" gorm:"primaryKey;autoIncrement"`
	ParticipantID  int          `json:"participant_id" gorm:"uniqueIndex;not null"`
	Participant    *Participant `json:"-" gorm:"foreignKey:ParticipantID"`
	GuidBasic      string       `json:"guid_basic" gorm:"not null;type:text"`
	GuidRamq       *string      `json:"guid_ramq,omitempty" gorm:"type:text"`
	GuidBirthplace *string      `json:"guid_birthplace,omitempty" gorm:"type:text"`
}

func (Guid) TableName() string { return "guid" }
