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
// The MIME type is detected from the uploaded file. Storage backend is determined by STORAGE_TYPE env var.
//
// @Summary     Upload a document
// @Description Uploads a document file with metadata (multipart form). Detects MIME type automatically.
// @Tags        documents
// @Accept      multipart/form-data
// @Produce     json
// @Param       name      formData string true  "Document display name"
// @Param       type_code formData string true  "Document type code"
// @Param       file      formData file   true  "File to upload"
// @Success     201 {object} types.Document
// @Failure     400 {object} types.ErrorResponse
// @Failure     500 {object} types.ErrorResponse
// @Router      /documents [post]
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

		fileName := fileHeader.Filename
		if name == "" {
			name = fileName
		}

		doc := types.Document{
			Name:     name,
			FileName: fileName,
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
// For database storage, serves the file directly. For S3, redirects to the storage URL.
//
// @Summary     Download a document file
// @Description Serves the document file as an attachment. Redirects to S3 URL if stored externally.
// @Tags        documents
// @Produce     octet-stream
// @Param       id path int true "Document ID"
// @Success     200 {file}   binary
// @Success     307 {string} string "Redirect to S3 URL"
// @Failure     400 {object} types.ErrorResponse
// @Failure     404 {object} types.ErrorResponse
// @Router      /documents/{id}/file [get]
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

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", doc.FileName))
		c.Data(http.StatusOK, doc.MimeType, fileBytes)
	}
}
