package repository

import (
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// CommunicationRepository handles database operations for communications.
type CommunicationRepository struct {
	db *gorm.DB
}

// NewCommunicationRepository creates a new CommunicationRepository.
func NewCommunicationRepository(db *gorm.DB) *CommunicationRepository {
	return &CommunicationRepository{db: db}
}

// CommunicationResponse represents a communication with flattened fields for API responses.
type CommunicationResponse struct {
	ID                int     `json:"id"`
	ParticipantID     int     `json:"participant_id"`
	ContactID         *int    `json:"contact_id,omitempty"`
	ContactFirstName  string  `json:"contact_first_name,omitempty"`
	ContactLastName   string  `json:"contact_last_name,omitempty"`
	ContactValue      *string `json:"contact_value,omitempty"`
	MethodCode        string  `json:"method_code"`
	MethodNameFr      string  `json:"method_name_fr"`
	MethodNameEn      string  `json:"method_name_en"`
	SubjectCode       string  `json:"subject_code"`
	SubjectNameFr     string  `json:"subject_name_fr"`
	SubjectNameEn     string  `json:"subject_name_en"`
	OutcomeCode       *string `json:"outcome_code,omitempty"`
	OutcomeNameFr     string  `json:"outcome_name_fr,omitempty"`
	OutcomeNameEn     string  `json:"outcome_name_en,omitempty"`
	CommunicationDate string  `json:"communication_date"`
	Author            string  `json:"author"`
	Comment           *string `json:"comment,omitempty"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         string  `json:"updated_at"`
}

// outcomeLabel holds bilingual names for an outcome code.
type outcomeLabel struct {
	NameFr string
	NameEn string
}

// buildOutcomeLookup loads both phone and email outcome tables into a single map.
func (r *CommunicationRepository) buildOutcomeLookup() map[string]outcomeLabel {
	lookup := make(map[string]outcomeLabel)
	var phone []types.PhoneOutcome
	r.db.Find(&phone)
	for _, o := range phone {
		lookup[o.Code] = outcomeLabel{NameFr: o.NameFr, NameEn: o.NameEn}
	}
	var email []types.EmailOutcome
	r.db.Find(&email)
	for _, o := range email {
		lookup[o.Code] = outcomeLabel{NameFr: o.NameFr, NameEn: o.NameEn}
	}
	return lookup
}

// ListByParticipant returns all communications for a participant, sorted by date desc.
func (r *CommunicationRepository) ListByParticipant(participantID int) ([]CommunicationResponse, error) {
	var comms []types.Communication
	err := r.db.
		Preload("Contact").
		Preload("Method").
		Preload("Subject").
		Where("participant_id = ?", participantID).
		Order("communication_date DESC, created_at DESC").
		Find(&comms).Error
	if err != nil {
		return nil, err
	}

	outcomeLookup := r.buildOutcomeLookup()

	responses := make([]CommunicationResponse, len(comms))
	for i, c := range comms {
		resp := CommunicationResponse{
			ID:                c.ID,
			ParticipantID:     c.ParticipantID,
			ContactID:         c.ContactID,
			ContactValue:      c.ContactValue,
			MethodCode:        c.MethodCode,
			MethodNameFr:      c.Method.NameFr,
			MethodNameEn:      c.Method.NameEn,
			SubjectCode:       c.SubjectCode,
			SubjectNameFr:     c.Subject.NameFr,
			SubjectNameEn:     c.Subject.NameEn,
			OutcomeCode:       c.OutcomeCode,
			CommunicationDate: c.CommunicationDate.Format("2006-01-02"),
			Author:            c.Author,
			Comment:           c.Comment,
			CreatedAt:         c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:         c.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if c.Contact != nil {
			resp.ContactFirstName = c.Contact.FirstName
			resp.ContactLastName = c.Contact.LastName
		}
		if c.OutcomeCode != nil {
			if label, ok := outcomeLookup[*c.OutcomeCode]; ok {
				resp.OutcomeNameFr = label.NameFr
				resp.OutcomeNameEn = label.NameEn
			}
		}
		responses[i] = resp
	}
	return responses, nil
}

// FindByID returns a communication by ID.
func (r *CommunicationRepository) FindByID(id int) (types.Communication, error) {
	var c types.Communication
	err := r.db.First(&c, id).Error
	return c, err
}

// Create inserts a new communication record.
func (r *CommunicationRepository) Create(c *types.Communication) error {
	return r.db.Create(c).Error
}

// Update saves changes to an existing communication.
func (r *CommunicationRepository) Update(c *types.Communication) error {
	return r.db.Save(c).Error
}

// Delete removes a communication by ID.
func (r *CommunicationRepository) Delete(id int) error {
	return r.db.Delete(&types.Communication{}, id).Error
}

// DB returns the underlying database connection (for use in transactions).
func (r *CommunicationRepository) DB() *gorm.DB {
	return r.db
}
