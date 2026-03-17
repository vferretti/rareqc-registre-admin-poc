package server

import "github.com/gin-gonic/gin"

// getAuthor extracts the author name from the X-Author header, falling back to a default value.
func getAuthor(c *gin.Context) string {
	author := c.GetHeader("X-Author")
	if author == "" {
		return "John Smith"
	}
	return author
}
