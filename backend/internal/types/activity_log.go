package types

import "time"

type ActivityLog struct {
	ID             int          `json:"id" gorm:"primaryKey;autoIncrement"`
	ActionTypeCode string       `json:"action_type_code" gorm:"not null;type:text;index"`
	ActionType     ActionType   `json:"-" gorm:"foreignKey:ActionTypeCode;references:Code"`
	ParticipantID  *int         `json:"participant_id,omitempty" gorm:"index"`
	Participant    *Participant `json:"-" gorm:"foreignKey:ParticipantID"`
	Author         string       `json:"author" gorm:"not null;type:text"`
	Details        *string      `json:"details,omitempty" gorm:"type:text"`
	CreatedAt      time.Time    `json:"created_at" gorm:"autoCreateTime;index"`
}

func (ActivityLog) TableName() string { return "activity_log" }
