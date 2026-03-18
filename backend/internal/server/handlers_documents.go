package server

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"registre-admin/internal/repository"
	"registre-admin/internal/types"
)

// UploadDocumentHandler uploads a document file with metadata.
// POST /documents (multipart: name, type_code, file)
// The MIME type is detected from the uploaded file. Storage backend is determined by STORAGE_TYPE env var.
func UploadDocumentHandler(docRepo *repository.DocumentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.PostForm("name")
		typeCode := c.PostForm("type_code")

		if name == "" || typeCode == "" {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "name and type_code are required"})
			return
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "file is required"})
			return
		}

		file, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
			return
		}
		defer file.Close()

		fileBytes, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to read file"})
			return
		}

		// Detect MIME type from upload header or file extension
		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" || mimeType == "application/octet-stream" {
			mimeType = mime.TypeByExtension(filepath.Ext(fileHeader.Filename))
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}
		}

		doc := types.Document{
			Name:     name,
			TypeCode: typeCode,
			MimeType: mimeType,
		}

		if err := docRepo.Create(&doc, fileBytes); err != nil {
			c.JSON(http.StatusInternalServerError, types.ErrorResponse{Error: "Failed to create document"})
			return
		}

		c.JSON(http.StatusCreated, doc)
	}
}

// DownloadDocumentHandler serves a document file by ID.
// GET /documents/:id/file
// For database storage, serves the file directly. For S3, redirects to the storage URL.
func DownloadDocumentHandler(docRepo *repository.DocumentRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.ErrorResponse{Error: "Invalid document ID"})
			return
		}

		fileBytes, doc, err := docRepo.GetFile(id)
		if err != nil {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Document not found"})
			return
		}

		// S3 storage: redirect to the object store URL
		if doc.StorageType == "s3" && doc.StorageURL != nil {
			c.Redirect(http.StatusTemporaryRedirect, *doc.StorageURL)
			return
		}

		if len(fileBytes) == 0 {
			c.JSON(http.StatusNotFound, types.ErrorResponse{Error: "Document file not found"})
			return
		}

		// Derive extension from MIME type
		exts, _ := mime.ExtensionsByType(doc.MimeType)
		ext := ""
		if len(exts) > 0 {
			ext = exts[0]
		}

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s%s\"", doc.Name, ext))
		c.Data(http.StatusOK, doc.MimeType, fileBytes)
	}
}
