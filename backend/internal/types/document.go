package types

import "time"

// Document represents a document's metadata (e.g. consent form).
// The file content is stored separately in DocumentFile (database) or an object store (S3).
type Document struct {
	ID          int          `json:"id" gorm:"primaryKey;autoIncrement" validate:"required"`
	Name        string       `json:"name" gorm:"not null" validate:"required"`
	FileName    string       `json:"file_name" gorm:"not null;type:text" validate:"required"`
	TypeCode    string       `json:"type_code" gorm:"not null;type:text" validate:"required"`
	Type        DocumentType `json:"-" gorm:"foreignKey:TypeCode;references:Code"`
	MimeType    string       `json:"mime_type" gorm:"not null;type:text" validate:"required"`
	FileSize    int64        `json:"file_size" gorm:"not null;default:0" validate:"required"`
	StorageType string       `json:"storage_type" gorm:"not null;type:text;default:'database'" validate:"required"`
	StorageURL  *string      `json:"storage_url,omitempty" gorm:"type:text"`
	CreatedAt   time.Time    `json:"created_at" gorm:"autoCreateTime" validate:"required"`
	UpdatedAt   time.Time    `json:"updated_at" gorm:"autoUpdateTime" validate:"required"`
}

func (Document) TableName() string { return "document" }

// DocumentFile stores the binary content of a document in the database.
// Used when StorageType is "database". For "s3", the file is at Document.StorageURL.
type DocumentFile struct {
	DocumentID int    `json:"document_id" gorm:"primaryKey;autoIncrement:false"`
	Data       []byte `json:"-" gorm:"type:bytea;not null"`
}

func (DocumentFile) TableName() string { return "document_file" }
