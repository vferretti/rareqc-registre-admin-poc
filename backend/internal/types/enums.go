package types

// SexAtBirth reference table
type SexAtBirth struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (SexAtBirth) TableName() string { return "sex_at_birth" }

// VitalStatus reference table
type VitalStatus struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (VitalStatus) TableName() string { return "vital_status" }

// Relationship reference table
type Relationship struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (Relationship) TableName() string { return "relationship" }

// ActionType reference table
type ActionType struct {
	Code   string `json:"code" gorm:"primaryKey;type:text"`
	NameEn string `json:"name_en" gorm:"not null"`
	NameFr string `json:"name_fr" gorm:"not null"`
}

func (ActionType) TableName() string { return "action_type" }
