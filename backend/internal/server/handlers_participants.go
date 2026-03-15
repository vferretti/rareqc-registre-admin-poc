package server

import (
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// --- Shared helpers ---

// parseDate parses a "YYYY-MM-DD" string into a *time.Time. Returns nil for empty strings.
func parseDate(dateStr string) (*time.Time, error) {
	if dateStr == "" {
		return nil, nil
	}
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// toStringPtr returns a pointer to s, or nil if s is empty.
func toStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// findSelfContact returns a pointer to the "self" contact in the slice, or nil if none exists.
func findSelfContact(contacts []types.Contact) *types.Contact {
	for i := range contacts {
		if contacts[i].RelationshipCode == "self" {
			return &contacts[i]
		}
	}
	return nil
}

// enforceSinglePrimary ensures exactly one contact is primary per participant.
// If a new contact is primary, the self contact loses the flag. Otherwise, self becomes primary.
func enforceSinglePrimary(tx *gorm.DB, participantID int, newContacts []types.CreateContactRequest) error {
	hasPrimary := false
	for _, c := range newContacts {
		if c.IsPrimary {
			hasPrimary = true
			break
		}
	}
	return tx.Model(&types.Contact{}).
		Where("participant_id = ? AND relationship_code = ?", participantID, "self").
		Update("is_primary", !hasPrimary).Error
}

// nonSelfContactIDs returns a set of IDs for all contacts that are not "self".
func nonSelfContactIDs(contacts []types.Contact) map[int]bool {
	ids := make(map[int]bool)
	for _, c := range contacts {
		if c.RelationshipCode != "self" {
			ids[c.ID] = true
		}
	}
	return ids
}

// selfContactSnapshot holds the coordinate fields of the "self" contact for before/after comparison.
type selfContactSnapshot struct {
	Email, Phone, StreetAddress, City, Province, CodePostal string
}

// snapshotSelfContact captures the current coordinate fields of the "self" contact.
func snapshotSelfContact(contacts []types.Contact) selfContactSnapshot {
	if sc := findSelfContact(contacts); sc != nil {
		return selfContactSnapshot{
			Email: sc.Email, Phone: sc.Phone,
			StreetAddress: sc.StreetAddress, City: sc.City,
			Province: sc.Province, CodePostal: sc.CodePostal,
		}
	}
	return selfContactSnapshot{}
}

// buildContact creates a Contact from an update request. Uses participant coordinates when SameCoordinates is true.
func buildContact(participantID int, cr types.CreateContactRequest, fallback types.UpdateParticipantRequest) types.Contact {
	contact := types.Contact{
		ParticipantID:     participantID,
		FirstName:         cr.FirstName,
		LastName:          cr.LastName,
		RelationshipCode:  cr.RelationshipCode,
		IsPrimary:         cr.IsPrimary,
		PreferredLanguage: cr.PreferredLanguage,
	}
	if cr.SameCoordinates {
		contact.Email = fallback.Email
		contact.Phone = fallback.Phone
		contact.StreetAddress = fallback.StreetAddress
		contact.City = fallback.City
		contact.Province = fallback.Province
		contact.CodePostal = fallback.CodePostal
	} else {
		contact.Email = cr.Email
		contact.Phone = cr.Phone
		contact.StreetAddress = cr.StreetAddress
		contact.City = cr.City
		contact.Province = cr.Province
		contact.CodePostal = cr.CodePostal
	}
	return contact
}

// buildContactFromCreate creates a Contact from a create request. Uses participant coordinates when SameCoordinates is true.
func buildContactFromCreate(participantID int, cr types.CreateContactRequest, fallback types.CreateParticipantRequest) types.Contact {
	contact := types.Contact{
		ParticipantID:     participantID,
		FirstName:         cr.FirstName,
		LastName:          cr.LastName,
		RelationshipCode:  cr.RelationshipCode,
		IsPrimary:         cr.IsPrimary,
		PreferredLanguage: cr.PreferredLanguage,
	}
	if cr.SameCoordinates {
		contact.Email = fallback.Email
		contact.Phone = fallback.Phone
		contact.StreetAddress = fallback.StreetAddress
		contact.City = fallback.City
		contact.Province = fallback.Province
		contact.CodePostal = fallback.CodePostal
	} else {
		contact.Email = cr.Email
		contact.Phone = cr.Phone
		contact.StreetAddress = cr.StreetAddress
		contact.City = cr.City
		contact.Province = cr.Province
		contact.CodePostal = cr.CodePostal
	}
	return contact
}

// participantFieldsChanged compares the participant's current fields against the incoming request to detect changes.
func participantFieldsChanged(p types.Participant, req types.UpdateParticipantRequest, dob time.Time, ramq *string, dateOfDeath *time.Time) bool {
	if p.FirstName != req.FirstName || p.LastName != req.LastName || p.SexAtBirthCode != req.SexAtBirthCode || p.VitalStatusCode != req.VitalStatusCode {
		return true
	}
	if !p.DateOfBirth.Equal(dob) {
		return true
	}
	if (p.RAMQ == nil) != (ramq == nil) || (p.RAMQ != nil && ramq != nil && *p.RAMQ != *ramq) {
		return true
	}
	if (p.DateOfDeath == nil) != (dateOfDeath == nil) || (p.DateOfDeath != nil && dateOfDeath != nil && !p.DateOfDeath.Equal(*dateOfDeath)) {
		return true
	}
	return false
}

// selfContactChanged compares the old self-contact snapshot against the incoming coordinates.
func selfContactChanged(old selfContactSnapshot, req types.UpdateParticipantRequest) bool {
	return old.Email != req.Email ||
		old.Phone != req.Phone ||
		old.StreetAddress != req.StreetAddress ||
		old.City != req.City ||
		old.Province != req.Province ||
		old.CodePostal != req.CodePostal
}

// --- Handlers ---

// ListParticipantsHandler returns a paginated, sortable, searchable list of participants.
func ListParticipantsHandler(db *gorm.DB) gin.HandlerFunc {
	allowedSortFields := map[string]string{
		"id": "id", "first_name": "first_name", "last_name": "last_name",
		"date_of_birth": "date_of_birth", "sex_at_birth_code": "sex_at_birth_code",
		"vital_status_code": "vital_status_code", "ramq": "ramq",
		"created_at": "created_at", "updated_at": "updated_at",
	}

	return func(c *gin.Context) {
		params := parsePaginationParams(c, "last_name")
		query := db.Model(&types.Participant{})

		if params.Search != "" {
			term := "%" + strings.ToLower(params.Search) + "%"
			query = query.Where(
				"LOWER(unaccent(first_name)) LIKE unaccent(?) OR LOWER(unaccent(last_name)) LIKE unaccent(?) OR ramq LIKE ?",
				term, term, term,
			)
		}

		var total int64
		if err := query.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count participants"})
			return
		}

		sortCol, ok := allowedSortFields[params.SortField]
		if !ok {
			sortCol = "last_name"
		}
		order := sortCol
		if params.SortOrder == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}

		var participants []types.Participant
		err := query.Order(order).Offset(params.PageIndex * params.PageSize).Limit(params.PageSize).Find(&participants).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participants"})
			return
		}

		c.JSON(http.StatusOK, types.PaginatedResponse[types.Participant]{
			Data:       participants,
			Total:      int(total),
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: int(math.Ceil(float64(total) / float64(params.PageSize))),
		})
	}
}

// GetParticipantHandler returns a single participant with its contacts.
func GetParticipantHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var participant types.Participant
		err := db.Preload("Contacts").First(&participant, id).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Participant not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participant"})
			return
		}

		c.JSON(http.StatusOK, participant)
	}
}

// UpdateParticipantHandler updates a participant, its self-contact coordinates, and replaces non-self contacts.
// Activity logs are recorded based on what actually changed (participant_edited, contact_edited, contact_created).
func UpdateParticipantHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var participant types.Participant
		if err := db.Preload("Contacts").First(&participant, id).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Participant not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participant"})
			return
		}

		var req types.UpdateParticipantRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_birth format"})
			return
		}

		dateOfDeath, err := parseDate(req.DateOfDeath)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_death format"})
			return
		}

		ramq := toStringPtr(req.RAMQ)
		author := getAuthor(c)

		// Snapshot old state for activity comparison
		oldParticipantChanged := participantFieldsChanged(participant, req, dob, ramq, dateOfDeath)
		oldSelfSnapshot := snapshotSelfContact(participant.Contacts)
		oldSelfChanged := selfContactChanged(oldSelfSnapshot, req)
		oldContactIDs := nonSelfContactIDs(participant.Contacts)

		err = db.Transaction(func(tx *gorm.DB) error {
			// Update participant
			participant.FirstName = req.FirstName
			participant.LastName = req.LastName
			participant.DateOfBirth = dob
			participant.RAMQ = ramq
			participant.SexAtBirthCode = req.SexAtBirthCode
			participant.VitalStatusCode = req.VitalStatusCode
			participant.DateOfDeath = dateOfDeath
			if err := tx.Save(&participant).Error; err != nil {
				return err
			}

			// Update self contact (if exists)
			if sc := findSelfContact(participant.Contacts); sc != nil {
				sc.FirstName = req.FirstName
				sc.LastName = req.LastName
				sc.Email = req.Email
				sc.Phone = req.Phone
				sc.StreetAddress = req.StreetAddress
				sc.City = req.City
				sc.Province = req.Province
				sc.CodePostal = req.CodePostal
				if err := tx.Save(sc).Error; err != nil {
					return err
				}
			}

			// Detect deleted contacts (old non-self IDs not present in request)
			newContactIDs := make(map[int]bool)
			for _, cr := range req.Contacts {
				if cr.ID > 0 {
					newContactIDs[cr.ID] = true
				}
			}
			for _, c := range participant.Contacts {
				if c.RelationshipCode == "self" {
					continue
				}
				if !newContactIDs[c.ID] {
					delDesc := fmt.Sprintf("Contact: %s %s (%s)", c.FirstName, c.LastName, c.RelationshipCode)
					if err := recordActivity(tx, "contact_deleted", &participant.ID, author, &delDesc); err != nil {
						return err
					}
				}
			}

			// Replace non-self contacts
			if err := tx.Where("participant_id = ? AND relationship_code != ?", participant.ID, "self").Delete(&types.Contact{}).Error; err != nil {
				return err
			}
			for _, cr := range req.Contacts {
				contact := buildContact(participant.ID, cr, req)
				if err := tx.Create(&contact).Error; err != nil {
					return err
				}

				contactDesc := fmt.Sprintf("Contact: %s %s (%s)", cr.FirstName, cr.LastName, cr.RelationshipCode)
				action := "contact_created"
				if cr.ID > 0 && oldContactIDs[cr.ID] {
					action = "contact_edited"
				}
				if err := recordActivity(tx, action, &participant.ID, author, &contactDesc); err != nil {
					return err
				}
			}

			// Ensure at least one contact is primary (fallback to self)
			if err := enforceSinglePrimary(tx, participant.ID, req.Contacts); err != nil {
				return err
			}

			// Log participant_edited only if participant or self-contact actually changed
			if oldParticipantChanged || oldSelfChanged {
				details := fmt.Sprintf("%s %s", req.FirstName, req.LastName)
				if err := recordActivity(tx, "participant_edited", &participant.ID, author, &details); err != nil {
					return err
				}
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update participant"})
			return
		}

		db.Preload("Contacts").First(&participant, participant.ID)
		c.JSON(http.StatusOK, participant)
	}
}

// CreateParticipantHandler creates a new participant with a "self" contact and optional additional contacts.
func CreateParticipantHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req types.CreateParticipantRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_birth format"})
			return
		}

		dateOfDeath, err := parseDate(req.DateOfDeath)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_death format"})
			return
		}

		participant := types.Participant{
			FirstName:       req.FirstName,
			LastName:        req.LastName,
			DateOfBirth:     dob,
			RAMQ:            toStringPtr(req.RAMQ),
			SexAtBirthCode:  req.SexAtBirthCode,
			VitalStatusCode: req.VitalStatusCode,
			DateOfDeath:     dateOfDeath,
		}

		author := getAuthor(c)

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&participant).Error; err != nil {
				return err
			}

			if err := recordActivity(tx, "participant_created", &participant.ID, author, nil); err != nil {
				return err
			}

			// Create self contact
			selfContact := types.Contact{
				ParticipantID:    participant.ID,
				FirstName:        req.FirstName,
				LastName:         req.LastName,
				RelationshipCode: "self",
				IsPrimary:        true,
				Email:            req.Email,
				Phone:            req.Phone,
				StreetAddress:    req.StreetAddress,
				City:             req.City,
				Province:         req.Province,
				CodePostal:       req.CodePostal,
				PreferredLanguage: "fr",
			}
			if err := tx.Create(&selfContact).Error; err != nil {
				return err
			}

			// Create additional contacts
			for _, cr := range req.Contacts {
				contact := buildContactFromCreate(participant.ID, cr, req)
				if err := tx.Create(&contact).Error; err != nil {
					return err
				}
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create participant"})
			return
		}

		db.Preload("Contacts").First(&participant, participant.ID)
		c.JSON(http.StatusCreated, participant)
	}
}
