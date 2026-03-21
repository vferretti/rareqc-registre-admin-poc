package types

import "time"

// CartItem links a user to a participant in their selection cart.
type CartItem struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        string    `gorm:"not null;uniqueIndex:idx_user_participant;type:text" json:"user_id"`
	ParticipantID int       `gorm:"not null;uniqueIndex:idx_user_participant" json:"participant_id"`
	CreatedAt     time.Time `json:"created_at"`
}

func (CartItem) TableName() string { return "cart_item" }
