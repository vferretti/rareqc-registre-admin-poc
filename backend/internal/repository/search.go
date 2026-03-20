package repository

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// SearchRepository handles search queries across participants and contact.
type SearchRepository struct {
	db *gorm.DB
}

// NewSearchRepository creates a new SearchRepository.
func NewSearchRepository(db *gorm.DB) *SearchRepository {
	return &SearchRepository{db: db}
}

// SearchSuggestion represents a single search result with the participant and what matched.
type SearchSuggestion struct {
	ParticipantID   int    `json:"participant_id"`
	ParticipantName string `json:"participant_name"`
	MatchField      string `json:"match_field"`
	MatchValue      string `json:"match_value"`
}

// Search returns up to 10 suggestions matching a query across participants and contact.
func (r *SearchRepository) Search(q string) []SearchSuggestion {
	like := fmt.Sprintf("%%%s%%", strings.ToLower(q))
	var suggestions []SearchSuggestion

	// Search by participant name, RAMQ, or self-contact phone/email
	var participants []types.Participant
	r.db.Preload("Contacts", "relationship_code = 'self'").
		Joins("LEFT JOIN contact ON contact.participant_id = participant.id AND contact.relationship_code = 'self'").
		Where(
			"CAST(participant.id AS TEXT) LIKE ? OR unaccent(lower(participant.first_name)) LIKE unaccent(?) OR unaccent(lower(participant.last_name)) LIKE unaccent(?) OR unaccent(lower(participant.first_name || ' ' || participant.last_name)) LIKE unaccent(?) OR REPLACE(LOWER(COALESCE(participant.ramq, '')), ' ', '') LIKE REPLACE(?, ' ', '') OR lower(contact.email) LIKE ? OR contact.phone LIKE ?",
			like, like, like, like, like, like, like,
		).Limit(10).Find(&participants)

	// Deduplicate across all search sources
	seen := make(map[int]bool)

	for _, p := range participants {
		seen[p.ID] = true
		name := fmt.Sprintf("%s %s", p.FirstName, p.LastName)
		field, value := detectParticipantMatch(p, name, q)
		suggestions = append(suggestions, SearchSuggestion{
			ParticipantID:   p.ID,
			ParticipantName: name,
			MatchField:      field,
			MatchValue:      value,
		})
	}

	// Search by external ID
	var extIDs []types.ExternalID
	r.db.Preload("Participant").Preload("ExternalSystem").
		Where("lower(external_id) LIKE ?", like).
		Limit(10).Find(&extIDs)

	for _, e := range extIDs {
		if seen[e.ParticipantID] {
			continue
		}
		seen[e.ParticipantID] = true
		pName := fmt.Sprintf("%s %s", e.Participant.FirstName, e.Participant.LastName)
		suggestions = append(suggestions, SearchSuggestion{
			ParticipantID:   e.ParticipantID,
			ParticipantName: pName,
			MatchField:      "external_id",
			MatchValue:      fmt.Sprintf("%s: %s", e.ExternalSystem.Name, e.ExternalID),
		})
	}

	// Search by contact name, email, or phone (non-self contacts)
	var contacts []types.Contact
	r.db.Preload("Participant").Where(
		"relationship_code != 'self' AND (unaccent(lower(first_name)) LIKE unaccent(?) OR unaccent(lower(last_name)) LIKE unaccent(?) OR unaccent(lower(first_name || ' ' || last_name)) LIKE unaccent(?) OR lower(email) LIKE ? OR phone LIKE ?)",
		like, like, like, like, like,
	).Limit(10).Find(&contacts)

	for _, ct := range contacts {
		if seen[ct.ParticipantID] {
			continue
		}
		seen[ct.ParticipantID] = true

		pName := fmt.Sprintf("%s %s", ct.Participant.FirstName, ct.Participant.LastName)
		field, value := detectContactMatch(ct, q)
		suggestions = append(suggestions, SearchSuggestion{
			ParticipantID:   ct.ParticipantID,
			ParticipantName: pName,
			MatchField:      field,
			MatchValue:      value,
		})
	}

	if len(suggestions) > 10 {
		suggestions = suggestions[:10]
	}
	return suggestions
}

// detectParticipantMatch determines which field matched (id > name > ramq > email > phone).
func detectParticipantMatch(p types.Participant, name, q string) (string, string) {
	lq := strings.ToLower(q)
	idStr := fmt.Sprintf("%d", p.ID)
	if strings.Contains(idStr, q) {
		return "id", idStr
	}
	if strings.Contains(strings.ToLower(name), lq) ||
		strings.Contains(strings.ToLower(p.FirstName), lq) ||
		strings.Contains(strings.ToLower(p.LastName), lq) {
		return "name", name
	}
	if p.RAMQ != nil && strings.Contains(
		strings.ToLower(strings.ReplaceAll(*p.RAMQ, " ", "")),
		strings.ToLower(strings.ReplaceAll(q, " ", "")),
	) {
		return "ramq", *p.RAMQ
	}
	if len(p.Contacts) > 0 {
		self := p.Contacts[0]
		if strings.Contains(strings.ToLower(self.Email), lq) {
			return "email", self.Email
		}
		if self.Phone != "" && strings.Contains(self.Phone, q) {
			return "phone", self.Phone
		}
	}
	return "name", name
}

// detectContactMatch determines which field of a contact matched (name > email > phone).
func detectContactMatch(ct types.Contact, q string) (string, string) {
	lq := strings.ToLower(q)
	cName := fmt.Sprintf("%s %s", ct.FirstName, ct.LastName)

	if strings.Contains(strings.ToLower(cName), lq) ||
		strings.Contains(strings.ToLower(ct.FirstName), lq) ||
		strings.Contains(strings.ToLower(ct.LastName), lq) {
		return "contact", cName
	}
	if strings.Contains(strings.ToLower(ct.Email), lq) {
		return "email", ct.Email
	}
	if ct.Phone != "" && strings.Contains(ct.Phone, q) {
		return "phone", ct.Phone
	}
	return "contact", cName
}
