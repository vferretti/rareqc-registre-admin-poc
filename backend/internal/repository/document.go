package repository

import (
	"fmt"
	"os"

	"gorm.io/gorm"
	"registre-admin/internal/types"
)

// DocumentRepository handles database operations for documents.
type DocumentRepository struct {
	db          *gorm.DB
	storageType string // "database" or "s3"
}

// NewDocumentRepository creates a new DocumentRepository.
// The storage type is determined by the STORAGE_TYPE env var (default: "database").
func NewDocumentRepository(db *gorm.DB) *DocumentRepository {
	st := os.Getenv("STORAGE_TYPE")
	if st == "" {
		st = "database"
	}
	return &DocumentRepository{db: db, storageType: st}
}

// Create inserts a new document with its file content.
// For "database" storage, the file is stored in the document_file table.
// For "s3" storage, the caller must set StorageURL on the document before calling Create.
func (r *DocumentRepository) Create(doc *types.Document, fileData []byte) error {
	doc.StorageType = r.storageType
	doc.FileSize = int64(len(fileData))

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(doc).Error; err != nil {
			return err
		}

		if r.storageType == "database" {
			file := types.DocumentFile{
				DocumentID: doc.ID,
				Data:       fileData,
			}
			return tx.Create(&file).Error
		}

		// For S3: StorageURL should already be set on doc by the handler
		// after uploading to the object store
		return nil
	})
}

// FindByID returns a document's metadata by ID (without file content).
func (r *DocumentRepository) FindByID(id int) (types.Document, error) {
	var doc types.Document
	err := r.db.First(&doc, id).Error
	return doc, err
}

// GetFile returns the file content for a document.
// For "database" storage, reads from document_file.
// For "s3" storage, returns nil data and the caller should redirect to StorageURL.
func (r *DocumentRepository) GetFile(id int) ([]byte, *types.Document, error) {
	var doc types.Document
	if err := r.db.First(&doc, id).Error; err != nil {
		return nil, nil, err
	}

	if doc.StorageType == "s3" {
		return nil, &doc, nil
	}

	var file types.DocumentFile
	if err := r.db.Where("document_id = ?", id).First(&file).Error; err != nil {
		return nil, &doc, fmt.Errorf("file not found in database: %w", err)
	}

	return file.Data, &doc, nil
}
