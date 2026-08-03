package server

import (
	"github.com/gin-gonic/gin"
	"registre-admin/internal/auth"
)

// maxAuthorLength caps the author name stored in activity logs.
const maxAuthorLength = 200

// getAuthor returns the authenticated user's display name (set by the auth
// middleware) for activity-log authorship.
func getAuthor(c *gin.Context) string {
	author := auth.UserName(c)
	if len(author) > maxAuthorLength {
		author = author[:maxAuthorLength]
	}
	return author
}
