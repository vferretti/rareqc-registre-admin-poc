package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

const fakeUserID = "fake-user-1"

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
func ListCartItemsHandler(repo *repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := repo.ListItems(fakeUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to fetch cart"})
			return
		}
		c.JSON(http.StatusOK, cartListResponse{Items: items, Count: len(items)})
	}
}

// CartCountHandler returns the number of items in the user's cart.
func CartCountHandler(repo *repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		count, err := repo.CountItems(fakeUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to count cart items"})
			return
		}
		c.JSON(http.StatusOK, cartCountResponse{Count: count})
	}
}

// AddCartItemsHandler adds participants to the user's cart.
func AddCartItemsHandler(repo *repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req addCartRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "participant_ids is required"})
			return
		}
		if err := repo.AddItems(fakeUserID, req.ParticipantIDs); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to add items"})
			return
		}
		count, _ := repo.CountItems(fakeUserID)
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: count})
	}
}

// RemoveCartItemsHandler removes specific participants from the user's cart.
func RemoveCartItemsHandler(repo *repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req removeCartRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "participant_ids is required"})
			return
		}
		if err := repo.RemoveItems(fakeUserID, req.ParticipantIDs); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to remove items"})
			return
		}
		count, _ := repo.CountItems(fakeUserID)
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: count})
	}
}

// ClearCartHandler empties the user's cart.
func ClearCartHandler(repo *repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := repo.ClearCart(fakeUserID); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to clear cart"})
			return
		}
		c.JSON(http.StatusOK, cartMutationResponse{Success: true, Count: 0})
	}
}
