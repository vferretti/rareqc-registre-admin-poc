package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"registre-admin/internal/guid"
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

// validateDates checks that date of birth is not in the future and date of death is after date of birth.
func validateDates(dob time.Time, dateOfDeath *time.Time) error {
	if dob.After(time.Now()) {
		return fmt.Errorf("date of birth cannot be in the future")
	}
	if dateOfDeath != nil && dateOfDeath.Before(dob) {
		return fmt.Errorf("date of death cannot be before date of birth")
	}
	return nil
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

// participantFieldsChanged compares the participant's current fields against the incoming request.
func participantFieldsChanged(p types.Participant, req types.UpdateParticipantRequest, dob time.Time, ramq *string, dateOfDeath *time.Time) bool {
	if p.FirstName != req.FirstName || p.LastName != req.LastName || p.SexAtBirthCode != req.SexAtBirthCode || p.VitalStatusCode != req.VitalStatusCode {
		return true
	}
	if !p.DateOfBirth.Equal(dob) {
		return true
	}
	cityOfBirth := toStringPtr(req.CityOfBirth)
	if (p.CityOfBirth == nil) != (cityOfBirth == nil) || (p.CityOfBirth != nil && cityOfBirth != nil && *p.CityOfBirth != *cityOfBirth) {
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
//
// @Summary     List participants
// @Description Returns a paginated, sortable, and searchable list of participants
// @Tags        participants
// @Produce     json
// @Param       page_index query int    false "Page index (0-based)"  default(0)
// @Param       page_size  query int    false "Page size (1-200)"     default(25)
// @Param       sort_field query string false "Sort field"             default(last_name)
// @Param       sort_order query string false "Sort order (asc/desc)" default(asc)
// @Param       search     query string false "Search term (name, RAMQ, etc.)"
// @Success     200 {object} types.PaginatedResponse[types.Participant]
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants [get]
func ListParticipantsHandler(repo *repository.ParticipantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		params := parsePaginationParams(c, "last_name")

		participants, total, totalPages, err := repo.List(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participants"})
			return
		}

		c.JSON(http.StatusOK, types.PaginatedResponse[repository.ParticipantListItem]{
			Data:       participants,
			Total:      total,
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

// GetParticipantHandler returns a single participant with its contacts.
//
// @Summary     Get a participant
// @Description Returns a single participant by ID, including contacts and GUID
// @Tags        participants
// @Produce     json
// @Param       id path int true "Participant ID"
// @Success     200 {object} types.Participant
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants/{id} [get]
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
//
// @Summary     Delete a contact
// @Description Deletes a contact by ID. Cannot delete a "self" contact or one referenced by a consent.
// @Tags        contacts
// @Produce     json
// @Param       contactId path int true "Contact ID"
// @Success     200 {object} object{message=string}
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /contacts/{contactId} [delete]
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

		referenced, err := contactRepo.IsReferencedByConsent(contact.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to check consent references"})
			return
		}
		if referenced {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Cannot delete contact: referenced as consent signer"})
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

// UpdateParticipantHandler updates a participant's identity and self-contact coordinates.
//
// @Summary     Update a participant
// @Description Updates a participant's identity fields and self-contact coordinates
// @Tags        participants
// @Accept      json
// @Produce     json
// @Param       id   path int                              true "Participant ID"
// @Param       body body types.UpdateParticipantRequest    true "Updated participant data"
// @Success     200 {object} types.Participant
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants/{id} [put]
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

		if err := validateDates(dob, dateOfDeath); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: err.Error()})
			return
		}

		ramq := toStringPtr(req.RAMQ)
		author := getAuthor(c)

		// Snapshot old state for activity comparison
		oldChanged := participantFieldsChanged(participant, req, dob, ramq, dateOfDeath)
		oldSelfSnapshot := snapshotSelfContact(participant.Contacts)
		oldSelfChanged := selfContactChanged(oldSelfSnapshot, req)

		err = participantRepo.Transaction(func(tx *gorm.DB) error {
			// Update participant fields
			participant.FirstName = req.FirstName
			participant.LastName = req.LastName
			participant.DateOfBirth = dob
			participant.CityOfBirth = toStringPtr(req.CityOfBirth)
			participant.RAMQ = ramq
			participant.SexAtBirthCode = req.SexAtBirthCode
			participant.VitalStatusCode = req.VitalStatusCode
			participant.DateOfDeath = dateOfDeath
			if err := participantRepo.Save(tx, &participant); err != nil {
				return err
			}

			// Recompute GUIDs
			g := guid.Compute(&participant)
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "participant_id"}},
				DoUpdates: clause.AssignmentColumns([]string{"guid_basic", "guid_ramq", "guid_birthplace"}),
			}).Create(g).Error; err != nil {
				return err
			}

			// Update self contact coordinates
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

			// Log only if something actually changed
			if oldChanged || oldSelfChanged {
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
//
// @Summary     Create a participant
// @Description Creates a new participant with a self contact and optional additional contacts
// @Tags        participants
// @Accept      json
// @Produce     json
// @Param       body body types.CreateParticipantRequest true "New participant data"
// @Success     201 {object} types.Participant
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants [post]
func CreateParticipantHandler(participantRepo *repository.ParticipantRepository, contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
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

		if err := validateDates(dob, dateOfDeath); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: err.Error()})
			return
		}

		participant := types.Participant{
			FirstName:       req.FirstName,
			LastName:        req.LastName,
			DateOfBirth:     dob,
			CityOfBirth:     toStringPtr(req.CityOfBirth),
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
				contact := types.Contact{
					ParticipantID:     participant.ID,
					FirstName:         cr.FirstName,
					LastName:          cr.LastName,
					RelationshipCode:  cr.RelationshipCode,
					IsPrimary:         cr.IsPrimary,
					PreferredLanguage: cr.PreferredLanguage,
					Email:             cr.Email,
					Phone:             cr.Phone,
					ApartmentNumber:   cr.ApartmentNumber,
					StreetAddress:     cr.StreetAddress,
					City:              cr.City,
					Province:          cr.Province,
					CodePostal:        cr.CodePostal,
				}
				if cr.SameCoordinates {
					contact.Email = req.Email
					contact.Phone = req.Phone
					contact.ApartmentNumber = req.ApartmentNumber
					contact.StreetAddress = req.StreetAddress
					contact.City = req.City
					contact.Province = req.Province
					contact.CodePostal = req.CodePostal
				}
				if err := contactRepo.Create(tx, &contact); err != nil {
					return err
				}
			}

			// Compute and upsert GUIDs
			g := guid.Compute(&participant)
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "participant_id"}},
				DoUpdates: clause.AssignmentColumns([]string{"guid_basic", "guid_ramq", "guid_birthplace"}),
			}).Create(g).Error; err != nil {
				return err
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
