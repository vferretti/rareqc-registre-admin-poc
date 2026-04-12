package server

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// defaultAuthor is the fallback author name when the X-Author header is absent.
const defaultAuthor = "John Smith"

// maxAuthorLength is the maximum allowed length for the X-Author header value.
const maxAuthorLength = 200

// getAuthor extracts the author name from the X-Author header, falling back to defaultAuthor.
func getAuthor(c *gin.Context) string {
	author := strings.TrimSpace(c.GetHeader("X-Author"))
	if author == "" {
		return defaultAuthor
	}
	if len(author) > maxAuthorLength {
		author = author[:maxAuthorLength]
	}
	return author
}
