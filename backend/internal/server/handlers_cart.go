package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

const fakeUserID = "fake-user-1"

// cartExportDataResponse contains all data needed for the multi-sheet Excel report.
type cartExportDataResponse struct {
	Participants []types.Participant                `json:"participants"`
	Consents     []repository.ConsentExportRow      `json:"consents"`
	ExternalIDs  []repository.ExternalIDExportRow   `json:"external_ids"`
}

// CartExportDataHandler returns all data for the cart participants (for Excel report generation).
//
// @Summary     Get cart export data
// @Description Returns participants, consents, external IDs, and GUIDs for all cart items
// @Tags        cart
// @Produce     json
// @Success     200 {object} cartExportDataResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart/export-data [post]
func CartExportDataHandler(
	cartRepo repository.CartDAO,
	participantRepo repository.ParticipantDAO,
	consentRepo repository.ConsentDAO,
	extIDRepo repository.ExternalIDDAO,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := cartRepo.ListItems(fakeUserID)
		if err != nil {
			handleInternalError(c, "Failed to fetch cart")
			return
		}
		if len(items) == 0 {
			c.JSON(http.StatusOK, cartExportDataResponse{
				Participants: []types.Participant{},
				Consents:     []repository.ConsentExportRow{},
				ExternalIDs:  []repository.ExternalIDExportRow{},
			})
			return
		}

		ids := make([]int, len(items))
		for i, item := range items {
			ids[i] = item.ParticipantID
		}

		participants, err := participantRepo.FindByIDs(ids)
		if err != nil {
			handleInternalError(c, "Failed to fetch participants")
			return
		}

		consents, err := consentRepo.ListByParticipantIDs(ids)
		if err != nil {
			handleInternalError(c, "Failed to fetch consents")
			return
		}

		extIDs, err := extIDRepo.ListByParticipantIDs(ids)
		if err != nil {
			handleInternalError(c, "Failed to fetch external IDs")
			return
		}

		c.JSON(http.StatusOK, cartExportDataResponse{
			Participants: participants,
			Consents:     consents,
			ExternalIDs:  extIDs,
		})
	}
}

type addCartRequest struct {
	ParticipantIDs []int `json:"participant_ids" binding:"required"`
}

type removeCartRequest struct {
	ParticipantIDs []int `json:"participant_ids" binding:"required"`
}

type cartListResponse struct {
	Items []repository.CartItemResponse `json:"items"`
	Count int                           `json:"count"`
}

type cartCountResponse struct {
	Count int64 `json:"count"`
}

type cartMutationResponse struct {
	Success bool  `json:"success"`
	Count   int64 `json:"count"`
}

// ListCartItemsHandler returns all items in the user's cart with participant data.
//
// @Summary     List cart items
// @Description Returns all items in the user's cart with participant data
// @Tags        cart
// @Produce     json
// @Success     200 {object} cartListResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart/items [get]
func ListCartItemsHandler(repo repository.CartDAO) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := repo.ListItems(fakeUserID)
		if err != nil {
			handleInternalError(c, "Failed to fetch cart")
			return
		}
		c.JSON(http.StatusOK, cartListResponse{Items: items, Count: len(items)})
	}
}

// CartCountHandler returns the number of items in the user's cart.
//
// @Summary     Get cart count
// @Description Returns the number of items in the user's cart
// @Tags        cart
// @Produce     json
// @Success     200 {object} cartCountResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart/count [get]
func CartCountHandler(repo repository.CartDAO) gin.HandlerFunc {
	return func(c *gin.Context) {
		count, err := repo.CountItems(fakeUserID)
		if err != nil {
			handleInternalError(c, "Failed to count cart items")
			return
		}
		c.JSON(http.StatusOK, cartCountResponse{Count: count})
	}
}

// AddCartItemsHandler adds participants to the user's cart.
//
// @Summary     Add items to cart
// @Description Adds one or more participants to the user's cart
// @Tags        cart
// @Accept      json
// @Produce     json
// @Param       body body addCartRequest true "Participant IDs to add"
// @Success     200 {object} cartMutationResponse
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart/items [post]
func AddCartItemsHandler(repo repository.CartDAO) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req addCartRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			handleBadRequest(c, "participant_ids is required")
			return
		}
		if err := repo.AddItems(fakeUserID, req.ParticipantIDs); err != nil {
			handleInternalError(c, "Failed to add items")
			return
		}
		count, _ := repo.CountItems(fakeUserID)
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: count})
	}
}

// RemoveCartItemsHandler removes specific participants from the user's cart.
//
// @Summary     Remove items from cart
// @Description Removes one or more participants from the user's cart
// @Tags        cart
// @Accept      json
// @Produce     json
// @Param       body body removeCartRequest true "Participant IDs to remove"
// @Success     200 {object} cartMutationResponse
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart/items [delete]
func RemoveCartItemsHandler(repo repository.CartDAO) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req removeCartRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			handleBadRequest(c, "participant_ids is required")
			return
		}
		if err := repo.RemoveItems(fakeUserID, req.ParticipantIDs); err != nil {
			handleInternalError(c, "Failed to remove items")
			return
		}
		count, _ := repo.CountItems(fakeUserID)
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: count})
	}
}

// ClearCartHandler empties the user's cart.
//
// @Summary     Clear cart
// @Description Removes all items from the user's cart
// @Tags        cart
// @Produce     json
// @Success     200 {object} cartMutationResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /cart [delete]
func ClearCartHandler(repo repository.CartDAO) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := repo.ClearCart(fakeUserID); err != nil {
			handleInternalError(c, "Failed to clear cart")
			return
		}
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: 0})
	}
}
