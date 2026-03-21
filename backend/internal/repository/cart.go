package repository

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"registre-admin/internal/types"
)

// CartRepository handles database operations for the participant cart.
type CartRepository struct {
	db *gorm.DB
}

// NewCartRepository creates a new CartRepository.
func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{db: db}
}

// CartItemResponse represents a cart item with participant data for API responses.
type CartItemResponse struct {
	ID             int     `json:"id"`
	ParticipantID  int     `json:"participant_id"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	RAMQ           *string `json:"ramq"`
	DateOfBirth    string  `json:"date_of_birth"`
	SexAtBirthCode string  `json:"sex_at_birth_code"`
	CreatedAt      string  `json:"created_at"`
}

// ListItems returns all cart items for a user with participant data joined.
func (r *CartRepository) ListItems(userID string) ([]CartItemResponse, error) {
	var items []types.CartItem
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&items).Error
	if err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return []CartItemResponse{}, nil
	}

	// Fetch participant data
	participantIDs := make([]int, len(items))
	for i, item := range items {
		participantIDs[i] = item.ParticipantID
	}

	var participants []types.Participant
	r.db.Where("id IN ?", participantIDs).Find(&participants)

	pMap := make(map[int]types.Participant)
	for _, p := range participants {
		pMap[p.ID] = p
	}

	responses := make([]CartItemResponse, 0, len(items))
	for _, item := range items {
		p, ok := pMap[item.ParticipantID]
		if !ok {
			continue
		}
		responses = append(responses, CartItemResponse{
			ID:             int(item.ID),
			ParticipantID:  item.ParticipantID,
			FirstName:      p.FirstName,
			LastName:       p.LastName,
			RAMQ:           p.RAMQ,
			DateOfBirth:    p.DateOfBirth.Format("2006-01-02"),
			SexAtBirthCode: p.SexAtBirthCode,
			CreatedAt:      item.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
	return responses, nil
}

// AddItems adds participants to a user's cart. Duplicates are silently ignored.
func (r *CartRepository) AddItems(userID string, participantIDs []int) error {
	items := make([]types.CartItem, len(participantIDs))
	for i, pid := range participantIDs {
		items[i] = types.CartItem{UserID: userID, ParticipantID: pid}
	}
	return r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&items).Error
}

// RemoveItems removes specific participants from a user's cart.
func (r *CartRepository) RemoveItems(userID string, participantIDs []int) error {
	return r.db.Where("user_id = ? AND participant_id IN ?", userID, participantIDs).Delete(&types.CartItem{}).Error
}

// ClearCart removes all items from a user's cart.
func (r *CartRepository) ClearCart(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&types.CartItem{}).Error
}

// CountItems returns the number of items in a user's cart.
func (r *CartRepository) CountItems(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&types.CartItem{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
