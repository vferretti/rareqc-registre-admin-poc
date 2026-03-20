package server

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// CodeTableListResponse represents a single code table with its entries and referenced codes.
type CodeTableListResponse struct {
	Table          string                   `json:"table"`
	Entries        []repository.CodeEntry   `json:"entries"`
	ReferencedCodes []string                `json:"referenced_codes"`
}

// ListCodeTablesHandler returns all code tables with their entries.
//
// @Summary     List all code tables
// @Description Returns every code/reference table with its entries and which codes are referenced
// @Tags        admin
// @Produce     json
// @Success     200 {array} CodeTableListResponse
// @Router      /code-tables [get]
func ListCodeTablesHandler(repo *repository.CodeTableRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		tables := repo.ListTables()
		result := make([]CodeTableListResponse, 0, len(tables))

		for _, table := range tables {
			entries, err := repo.List(table)
			if err != nil {
				c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: fmt.Sprintf("Failed to list %s", table)})
				return
			}

			// Determine which codes are referenced
			referenced := make([]string, 0)
			for _, e := range entries {
				used, err := repo.IsReferenced(table, e.Code)
				if err != nil {
					c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: fmt.Sprintf("Failed to check references for %s", table)})
					return
				}
				if used {
					referenced = append(referenced, e.Code)
				}
			}

			result = append(result, CodeTableListResponse{
				Table:           table,
				Entries:         entries,
				ReferencedCodes: referenced,
			})
		}

		c.JSON(http.StatusOK, result)
	}
}

// CreateCodeEntryHandler creates a new entry in a code table.
//
// @Summary     Create a code entry
// @Description Adds a new code to the specified reference table
// @Tags        admin
// @Accept      json
// @Produce     json
// @Param       table path string true "Code table name"
// @Param       body  body repository.CodeEntry true "Code entry"
// @Success     201 {object} repository.CodeEntry
// @Failure     400 {object} types.ErrorResponse
// @Failure     409 {object} types.ErrorResponse
// @Router      /code-tables/{table}/entries [post]
func CreateCodeEntryHandler(repo *repository.CodeTableRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		table := c.Param("table")

		var entry repository.CodeEntry
		if err := c.ShouldBindJSON(&entry); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}
		if entry.Code == "" || entry.NameEn == "" || entry.NameFr == "" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "code, name_en, and name_fr are required"})
			return
		}

		if err := repo.Create(table, &entry); err != nil {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: err.Error()})
			return
		}

		c.JSON(http.StatusCreated, entry)
	}
}

// UpdateCodeEntryHandler updates an existing code entry's labels (and optionally its code).
//
// @Summary     Update a code entry
// @Description Updates labels of a code entry. Code rename is only allowed if not referenced.
// @Tags        admin
// @Accept      json
// @Produce     json
// @Param       table path string true "Code table name"
// @Param       code  path string true "Current code value"
// @Param       body  body repository.CodeEntry true "Updated code entry"
// @Success     200 {object} repository.CodeEntry
// @Failure     400 {object} types.ErrorResponse
// @Failure     409 {object} types.ErrorResponse
// @Router      /code-tables/{table}/entries/{code} [put]
func UpdateCodeEntryHandler(repo *repository.CodeTableRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		table := c.Param("table")
		code := c.Param("code")

		var entry repository.CodeEntry
		if err := c.ShouldBindJSON(&entry); err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid request body"})
			return
		}
		if entry.NameEn == "" || entry.NameFr == "" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "name_en and name_fr are required"})
			return
		}

		if err := repo.Update(table, code, &entry); err != nil {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: err.Error()})
			return
		}

		c.JSON(http.StatusOK, entry)
	}
}

// DeleteCodeEntryHandler deletes a code entry if it's not referenced.
//
// @Summary     Delete a code entry
// @Description Removes a code entry from the specified reference table. Fails if the code is in use.
// @Tags        admin
// @Produce     json
// @Param       table path string true "Code table name"
// @Param       code  path string true "Code value to delete"
// @Success     204
// @Failure     409 {object} types.ErrorResponse
// @Router      /code-tables/{table}/entries/{code} [delete]
func DeleteCodeEntryHandler(repo *repository.CodeTableRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		table := c.Param("table")
		code := c.Param("code")

		if err := repo.Delete(table, code); err != nil {
			c.JSON(http.StatusConflict, types.ErrorResponse{Error: err.Error()})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
