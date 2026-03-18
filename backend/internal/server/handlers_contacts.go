package server

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// AddContactHandler creates a new contact for a participant.
//
// @Summary     Add a contact to a participant
// @Description Creates a new contact for the given participant. Cannot create a "self" contact.
// @Tags        contacts
// @Accept      json
// @Produce     json
// @Param       id   path int                         true "Participant ID"
// @Param       body body types.CreateContactRequest   true "Contact data"
// @Success     201 {object} types.Participant
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /participants/{id}/contacts [post]
func AddContactHandler(participantRepo *repository.ParticipantRepository, contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
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

		var req types.CreateContactRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		if req.RelationshipCode == "self" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Cannot create self contact"})
			return
		}

		author := getAuthor(c)

		err = contactRepo.Transaction(func(tx *gorm.DB) error {
			// If new contact is primary, clear all others
			if req.IsPrimary {
				if err := contactRepo.ClearAllPrimary(tx, participant.ID); err != nil {
					return err
				}
			}

			contact := types.Contact{
				ParticipantID:     participant.ID,
				FirstName:         req.FirstName,
				LastName:          req.LastName,
				RelationshipCode:  req.RelationshipCode,
				IsPrimary:         req.IsPrimary,
				PreferredLanguage: req.PreferredLanguage,
				Email:             req.Email,
				Phone:             req.Phone,
				ApartmentNumber:   req.ApartmentNumber,
				StreetAddress:     req.StreetAddress,
				City:              req.City,
				Province:          req.Province,
				CodePostal:        req.CodePostal,
			}
			if req.SameCoordinates {
				if sc := findSelfContact(participant.Contacts); sc != nil {
					contact.Email = sc.Email
					contact.Phone = sc.Phone
					contact.ApartmentNumber = sc.ApartmentNumber
					contact.StreetAddress = sc.StreetAddress
					contact.City = sc.City
					contact.Province = sc.Province
					contact.CodePostal = sc.CodePostal
				}
			}
			if err := contactRepo.Create(tx, &contact); err != nil {
				return err
			}

			// If no non-self contact is primary and new one isn't either, self stays primary
			// If new one is primary, self was already cleared above
			if !req.IsPrimary {
				// Ensure self is primary if nobody else is
				count, _ := contactRepo.CountNonSelfPrimary(tx, participant.ID)
				if count == 0 {
					contactRepo.SetSelfPrimary(tx, participant.ID, true)
				}
			}

			details := fmt.Sprintf("%s %s (%s)", req.FirstName, req.LastName, req.RelationshipCode)
			return activityRepo.Record(tx, "contact_created", &participant.ID, author, &details)
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create contact"})
			return
		}

		participantRepo.Reload(&participant)
		c.JSON(http.StatusCreated, participant)
	}
}

// UpdateContactHandler updates an existing contact.
//
// @Summary     Update a contact
// @Description Updates an existing contact. Cannot edit a "self" contact directly.
// @Tags        contacts
// @Accept      json
// @Produce     json
// @Param       contactId path int                         true "Contact ID"
// @Param       body      body types.CreateContactRequest   true "Updated contact data"
// @Success     200 {object} types.Contact
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /contacts/{contactId} [put]
func UpdateContactHandler(contactRepo *repository.ContactRepository, activityRepo *repository.ActivityRepository) gin.HandlerFunc {
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
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Cannot edit self contact directly"})
			return
		}

		var req types.CreateContactRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		author := getAuthor(c)

		err = contactRepo.Transaction(func(tx *gorm.DB) error {
			// If becoming primary, clear all others first
			if req.IsPrimary {
				if err := contactRepo.ClearAllPrimary(tx, contact.ParticipantID); err != nil {
					return err
				}
			}

			contact.FirstName = req.FirstName
			contact.LastName = req.LastName
			contact.RelationshipCode = req.RelationshipCode
			contact.IsPrimary = req.IsPrimary
			contact.PreferredLanguage = req.PreferredLanguage
			contact.Email = req.Email
			contact.Phone = req.Phone
			contact.ApartmentNumber = req.ApartmentNumber
			contact.StreetAddress = req.StreetAddress
			contact.City = req.City
			contact.Province = req.Province
			contact.CodePostal = req.CodePostal

			if err := contactRepo.Save(tx, &contact); err != nil {
				return err
			}

			// Ensure at least one contact is primary
			if !req.IsPrimary {
				count, _ := contactRepo.CountNonSelfPrimary(tx, contact.ParticipantID)
				if count == 0 {
					contactRepo.SetSelfPrimary(tx, contact.ParticipantID, true)
				}
			}

			details := fmt.Sprintf("%s %s (%s)", req.FirstName, req.LastName, req.RelationshipCode)
			return activityRepo.Record(tx, "contact_edited", &contact.ParticipantID, author, &details)
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update contact"})
			return
		}

		c.JSON(http.StatusOK, contact)
	}
}
