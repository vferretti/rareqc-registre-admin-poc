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

func ListParticipantsHandler(db *gorm.DB) gin.HandlerFunc {
	// Allowed sort fields to prevent SQL injection
	allowedSortFields := map[string]string{
		"id":                "id",
		"first_name":        "first_name",
		"last_name":         "last_name",
		"date_of_birth":     "date_of_birth",
		"sex_at_birth_code": "sex_at_birth_code",
		"vital_status_code": "vital_status_code",
		"ramq":              "ramq",
		"created_at":        "created_at",
		"updated_at":        "updated_at",
	}

	return func(c *gin.Context) {
		params := parsePaginationParams(c, "last_name")

		query := db.Model(&types.Participant{})

		// Search filter (accent-insensitive via unaccent extension)
		if params.Search != "" {
			term := "%" + strings.ToLower(params.Search) + "%"
			query = query.Where(
				"LOWER(unaccent(first_name)) LIKE unaccent(?) OR LOWER(unaccent(last_name)) LIKE unaccent(?) OR ramq LIKE ?",
				term, term, term,
			)
		}

		// Count total
		var total int64
		if err := query.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count participants"})
			return
		}

		// Sort
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

		// Fetch page
		var participants []types.Participant
		err := query.
			Order(order).
			Offset(params.PageIndex * params.PageSize).
			Limit(params.PageSize).
			Find(&participants).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch participants"})
			return
		}

		totalPages := int(math.Ceil(float64(total) / float64(params.PageSize)))

		c.JSON(http.StatusOK, types.PaginatedResponse[types.Participant]{
			Data:       participants,
			Total:      int(total),
			PageIndex:  params.PageIndex,
			PageSize:   params.PageSize,
			TotalPages: totalPages,
		})
	}
}

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

		var dateOfDeath *time.Time
		if req.DateOfDeath != "" {
			d, err := time.Parse("2006-01-02", req.DateOfDeath)
			if err != nil {
				c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_death format"})
				return
			}
			dateOfDeath = &d
		}

		var ramq *string
		if req.RAMQ != "" {
			ramq = &req.RAMQ
		}

		author := getAuthor(c)

		err = db.Transaction(func(tx *gorm.DB) error {
			// Update participant fields
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

			// Update "self" contact with coordinates (if exists)
			for i := range participant.Contacts {
				if participant.Contacts[i].RelationshipCode == "self" {
					participant.Contacts[i].FirstName = req.FirstName
					participant.Contacts[i].LastName = req.LastName
					participant.Contacts[i].Email = req.Email
					participant.Contacts[i].Phone = req.Phone
					participant.Contacts[i].StreetAddress = req.StreetAddress
					participant.Contacts[i].City = req.City
					participant.Contacts[i].Province = req.Province
					participant.Contacts[i].CodePostal = req.CodePostal
					if err := tx.Save(&participant.Contacts[i]).Error; err != nil {
						return err
					}
					break
				}
			}

			// Delete old non-self contacts and recreate
			if err := tx.Where("participant_id = ? AND relationship_code != ?", participant.ID, "self").Delete(&types.Contact{}).Error; err != nil {
				return err
			}

			for _, cr := range req.Contacts {
				contact := types.Contact{
					ParticipantID:     participant.ID,
					FirstName:         cr.FirstName,
					LastName:          cr.LastName,
					RelationshipCode:  cr.RelationshipCode,
					IsPrimary:         cr.IsPrimary,
					PreferredLanguage: cr.PreferredLanguage,
				}
				if cr.SameCoordinates {
					contact.Email = req.Email
					contact.Phone = req.Phone
					contact.StreetAddress = req.StreetAddress
					contact.City = req.City
					contact.Province = req.Province
					contact.CodePostal = req.CodePostal
				} else {
					contact.Email = cr.Email
					contact.Phone = cr.Phone
					contact.StreetAddress = cr.StreetAddress
					contact.City = cr.City
					contact.Province = cr.Province
					contact.CodePostal = cr.CodePostal
				}
				if err := tx.Create(&contact).Error; err != nil {
					return err
				}
			}

			// Record activity
			details := fmt.Sprintf("%s %s", req.FirstName, req.LastName)
			if err := recordActivity(tx, "participant_edited", &participant.ID, author, &details); err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to update participant"})
			return
		}

		// Reload with contacts
		db.Preload("Contacts").First(&participant, participant.ID)
		c.JSON(http.StatusOK, participant)
	}
}

func CreateParticipantHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req types.CreateParticipantRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}

		// Parse date of birth
		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_birth format"})
			return
		}

		// Parse optional date of death
		var dateOfDeath *time.Time
		if req.DateOfDeath != "" {
			d, err := time.Parse("2006-01-02", req.DateOfDeath)
			if err != nil {
				c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid date_of_death format"})
				return
			}
			dateOfDeath = &d
		}

		// Optional RAMQ
		var ramq *string
		if req.RAMQ != "" {
			ramq = &req.RAMQ
		}

		participant := types.Participant{
			FirstName:       req.FirstName,
			LastName:        req.LastName,
			DateOfBirth:     dob,
			RAMQ:            ramq,
			SexAtBirthCode:  req.SexAtBirthCode,
			VitalStatusCode: req.VitalStatusCode,
			DateOfDeath:     dateOfDeath,
		}

		author := getAuthor(c)

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&participant).Error; err != nil {
				return err
			}

			// Record activity: participant created
			if err := recordActivity(tx, "participant_created", &participant.ID, author, nil); err != nil {
				return err
			}

			// Create "self" contact with participant's coordinates
			selfContact := types.Contact{
				ParticipantID:     participant.ID,
				FirstName:         req.FirstName,
				LastName:          req.LastName,
				RelationshipCode:  "self",
				IsPrimary:         true,
				Email:             req.Email,
				Phone:             req.Phone,
				StreetAddress:     req.StreetAddress,
				City:              req.City,
				Province:          req.Province,
				CodePostal:        req.CodePostal,
				PreferredLanguage: "fr",
			}
			if err := tx.Create(&selfContact).Error; err != nil {
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
				}
				if cr.SameCoordinates {
					contact.Email = req.Email
					contact.Phone = req.Phone
					contact.StreetAddress = req.StreetAddress
					contact.City = req.City
					contact.Province = req.Province
					contact.CodePostal = req.CodePostal
				} else {
					contact.Email = cr.Email
					contact.Phone = cr.Phone
					contact.StreetAddress = cr.StreetAddress
					contact.City = cr.City
					contact.Province = cr.Province
					contact.CodePostal = cr.CodePostal
				}
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

		// Reload with contacts
		db.Preload("Contacts").First(&participant, participant.ID)

		c.JSON(http.StatusCreated, participant)
	}
}
