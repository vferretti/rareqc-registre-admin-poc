package server

import "github.com/gin-gonic/gin"

// defaultAuthor is the fallback author name when the X-Author header is absent.
const defaultAuthor = "John Smith"

// getAuthor extracts the author name from the X-Author header, falling back to defaultAuthor.
func getAuthor(c *gin.Context) string {
	author := c.GetHeader("X-Author")
	if author == "" {
		return defaultAuthor
	}
	return author
}
