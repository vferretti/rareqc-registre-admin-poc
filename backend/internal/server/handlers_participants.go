package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/repository"
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

// validateSinglePrimary returns an error if more than one contact in the request is primary.
func validateSinglePrimary(contacts []types.CreateContactRequest) error {
	count := 0
	for _, c := range contacts {
		if c.IsPrimary {
			count++
		}
	}
	if count > 1 {
		return fmt.Errorf("only one contact can be primary")
	}
	return nil
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
	Email, Phone, ApartmentNumber, StreetAddress, City, Province, CodePostal, PreferredLanguage string
}

// snapshotSelfContact captures the current coordinate fields of the "self" contact.
func snapshotSelfContact(contacts []types.Contact) selfContactSnapshot {
	if sc := findSelfContact(contacts); sc != nil {
		return selfContactSnapshot{
			Email: sc.Email, Phone: sc.Phone,
			ApartmentNumber: sc.ApartmentNumber, StreetAddress: sc.StreetAddress,
			City: sc.City, Province: sc.Province, CodePostal: sc.CodePostal,
			PreferredLanguage: sc.PreferredLanguage,
		}
	}
	return selfContactSnapshot{}
}

// buildContact creates a Contact from a request. Uses participant coordinates when SameCoordinates is true.
func buildContact(participantID int, cr types.CreateContactRequest, email, phone, apt, street, city, province, postal string) types.Contact {
	contact := types.Contact{
		ParticipantID:     participantID,
		FirstName:         cr.FirstName,
		LastName:          cr.LastName,
		RelationshipCode:  cr.RelationshipCode,
		IsPrimary:         cr.IsPrimary,
		PreferredLanguage: cr.PreferredLanguage,
	}
	if cr.SameCoordinates {
		contact.Email = email
		contact.Phone = phone
		contact.ApartmentNumber = apt
		contact.StreetAddress = street
		contact.City = city
		contact.Province = province
		contact.CodePostal = postal
	} else {
		contact.Email = cr.Email
		contact.Phone = cr.Phone
		contact.ApartmentNumber = cr.ApartmentNumber
		contact.StreetAddress = cr.StreetAddress
		contact.City = cr.City
		contact.Province = cr.Province
		contact.CodePostal = cr.CodePostal
	}
	return contact
}

// participantFieldsChanged compares the participant's current fields against the incoming request.
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
	return old.Email != req.Email || old.Phone != req.Phone ||
		old.ApartmentNumber != req.ApartmentNumber ||
		old.StreetAddress != req.StreetAddress || old.City != req.City ||
		old.Province != req.Province || old.CodePostal != req.CodePostal ||
		old.PreferredLanguage != req.PreferredLanguage
}

// --- Handlers ---

// ListParticipantsHandler returns a paginated, sortable, searchable list of participants.
func ListParticipantsHandler(repo *repository.ParticipantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		params := parsePaginationParams(c, "last_name")

		participants, total, totalPages, err := repo.List(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participants"})
			return
		}

		c.JSON(http.StatusOK, types.PaginatedResponse[types.Participant]{
			Data:       participants,
			Total:      total,
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

// GetParticipantHandler returns a single participant with its contacts.
func GetParticipantHandler(repo *repository.ParticipantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		participant, err := repo.FindByID(c.Param("id"))
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

// DeleteContactHandler removes a contact by ID and records the activity.
func DeleteContactHandler(contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		contact, err := contactRepo.FindByID(c.Param("contactId"))
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Contact not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch contact"})
			return
		}

		if contact.RelationshipCode == "self" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Cannot delete self contact"})
			return
		}

		author := getAuthor(c)

		err = contactRepo.Transaction(func(tx *gorm.DB) error {
			wasPrimary := contact.IsPrimary
			if err := contactRepo.Delete(tx, &contact); err != nil {
				return err
			}
			if wasPrimary {
				count, _ := contactRepo.CountNonSelfPrimary(tx, contact.ParticipantID)
				if count == 0 {
					contactRepo.SetSelfPrimary(tx, contact.ParticipantID, true)
				}
			}
			details := fmt.Sprintf("%s %s", contact.FirstName, contact.LastName)
			return activityRepo.Record(tx, "contact_deleted", &contact.ParticipantID, author, &details)
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to delete contact"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Contact deleted"})
	}
}

// UpdateParticipantHandler updates a participant, its self-contact coordinates, and replaces non-self contacts.
func UpdateParticipantHandler(participantRepo *repository.ParticipantRepository, contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		participant, err := participantRepo.FindByID(c.Param("id"))
		if err != nil {
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
		if err := validateSinglePrimary(req.Contacts); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: err.Error()})
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

		err = participantRepo.Transaction(func(tx *gorm.DB) error {
			// Update participant
			participant.FirstName = req.FirstName
			participant.LastName = req.LastName
			participant.DateOfBirth = dob
			participant.RAMQ = ramq
			participant.SexAtBirthCode = req.SexAtBirthCode
			participant.VitalStatusCode = req.VitalStatusCode
			participant.DateOfDeath = dateOfDeath
			if err := participantRepo.Save(tx, &participant); err != nil {
				return err
			}

			// Update self contact
			if sc := findSelfContact(participant.Contacts); sc != nil {
				sc.FirstName = req.FirstName
				sc.LastName = req.LastName
				sc.Email = req.Email
				sc.Phone = req.Phone
				sc.ApartmentNumber = req.ApartmentNumber
				sc.StreetAddress = req.StreetAddress
				sc.City = req.City
				sc.Province = req.Province
				sc.CodePostal = req.CodePostal
				sc.PreferredLanguage = req.PreferredLanguage
				if err := contactRepo.Save(tx, sc); err != nil {
					return err
				}
			}

			// Detect deleted contacts
			newContactIDs := make(map[int]bool)
			for _, cr := range req.Contacts {
				if cr.ID > 0 {
					newContactIDs[cr.ID] = true
				}
			}
			for _, ct := range participant.Contacts {
				if ct.RelationshipCode == "self" {
					continue
				}
				if !newContactIDs[ct.ID] {
					delDesc := fmt.Sprintf("Contact: %s %s (%s)", ct.FirstName, ct.LastName, ct.RelationshipCode)
					if err := activityRepo.Record(tx, "contact_deleted", &participant.ID, author, &delDesc); err != nil {
						return err
					}
				}
			}

			// Replace non-self contacts
			if err := contactRepo.DeleteNonSelf(tx, participant.ID); err != nil {
				return err
			}
			for _, cr := range req.Contacts {
				contact := buildContact(participant.ID, cr, req.Email, req.Phone, req.ApartmentNumber, req.StreetAddress, req.City, req.Province, req.CodePostal)
				if err := contactRepo.Create(tx, &contact); err != nil {
					return err
				}
				contactDesc := fmt.Sprintf("Contact: %s %s (%s)", cr.FirstName, cr.LastName, cr.RelationshipCode)
				action := "contact_created"
				if cr.ID > 0 && oldContactIDs[cr.ID] {
					action = "contact_edited"
				}
				if err := activityRepo.Record(tx, action, &participant.ID, author, &contactDesc); err != nil {
					return err
				}
			}

			// Ensure single primary
			hasPrimary := false
			for _, cr := range req.Contacts {
				if cr.IsPrimary {
					hasPrimary = true
					break
				}
			}
			if err := contactRepo.SetSelfPrimary(tx, participant.ID, !hasPrimary); err != nil {
				return err
			}

			// Log participant_edited only if participant or self-contact actually changed
			if oldParticipantChanged || oldSelfChanged {
				details := fmt.Sprintf("%s %s", req.FirstName, req.LastName)
				if err := activityRepo.Record(tx, "participant_edited", &participant.ID, author, &details); err != nil {
					return err
				}
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update participant"})
			return
		}

		participantRepo.Reload(&participant)
		c.JSON(http.StatusOK, participant)
	}
}

// CreateParticipantHandler creates a new participant with a "self" contact and optional additional contacts.
func CreateParticipantHandler(participantRepo *repository.ParticipantRepository, contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req types.CreateParticipantRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}
		if err := validateSinglePrimary(req.Contacts); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: err.Error()})
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

		err = participantRepo.Transaction(func(tx *gorm.DB) error {
			if err := participantRepo.Create(tx, &participant); err != nil {
				return err
			}
			if err := activityRepo.Record(tx, "participant_created", &participant.ID, author, nil); err != nil {
				return err
			}

			// Create self contact
			selfContact := types.Contact{
				ParticipantID:     participant.ID,
				FirstName:         req.FirstName,
				LastName:          req.LastName,
				RelationshipCode:  "self",
				IsPrimary:         true,
				Email:             req.Email,
				Phone:             req.Phone,
				ApartmentNumber:   req.ApartmentNumber,
				StreetAddress:     req.StreetAddress,
				City:              req.City,
				Province:          req.Province,
				CodePostal:        req.CodePostal,
				PreferredLanguage: req.PreferredLanguage,
			}
			if err := contactRepo.Create(tx, &selfContact); err != nil {
				return err
			}

			// Create additional contacts
			for _, cr := range req.Contacts {
				contact := buildContact(participant.ID, cr, req.Email, req.Phone, req.ApartmentNumber, req.StreetAddress, req.City, req.Province, req.CodePostal)
				if err := contactRepo.Create(tx, &contact); err != nil {
					return err
				}
			}

			// If a non-self contact is primary, self loses the flag
			hasPrimary := false
			for _, cr := range req.Contacts {
				if cr.IsPrimary {
					hasPrimary = true
					break
				}
			}
			if hasPrimary {
				return contactRepo.SetSelfPrimary(tx, participant.ID, false)
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create participant"})
			return
		}

		participantRepo.Reload(&participant)
		c.JSON(http.StatusCreated, participant)
	}
}
