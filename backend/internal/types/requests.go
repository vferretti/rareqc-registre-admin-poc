package types

// CreateContactRequest represents the payload for creating or updating a contact.
type CreateContactRequest struct {
	ID               int    `json:"id,omitempty"`
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	RelationshipCode string `json:"relationship_code"`
	IsPrimary        bool   `json:"is_primary"`
	SameCoordinates  bool   `json:"same_coordinates"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	ApartmentNumber  string `json:"apartment_number"`
	StreetAddress    string `json:"street_address"`
	City             string `json:"city"`
	Province         string `json:"province"`
	CodePostal       string `json:"code_postal"`
	PreferredLanguage string `json:"preferred_language"`
}

// UpdateParticipantRequest represents the payload for updating a participant's identity and contacts.
type UpdateParticipantRequest struct {
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	DateOfBirth     string `json:"date_of_birth"`
	SexAtBirthCode  string `json:"sex_at_birth_code"`
	CityOfBirth     string `json:"city_of_birth"`
	RAMQ            string `json:"ramq"`
	VitalStatusCode string `json:"vital_status_code"`
	DateOfDeath     string `json:"date_of_death"`
	// Coordinates (update "self" contact)
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	ApartmentNumber string `json:"apartment_number"`
	StreetAddress   string `json:"street_address"`
	City            string `json:"city"`
	Province        string `json:"province"`
	CodePostal        string `json:"code_postal"`
	PreferredLanguage string `json:"preferred_language"`
}

// CreateParticipantRequest represents the payload for registering a new participant.
type CreateParticipantRequest struct {
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	DateOfBirth     string `json:"date_of_birth"`
	SexAtBirthCode  string `json:"sex_at_birth_code"`
	CityOfBirth     string `json:"city_of_birth"`
	RAMQ            string `json:"ramq"`
	VitalStatusCode string `json:"vital_status_code"`
	DateOfDeath     string `json:"date_of_death"`
	// Coordinates (become "self" contact)
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	ApartmentNumber   string `json:"apartment_number"`
	StreetAddress     string `json:"street_address"`
	City              string `json:"city"`
	Province          string `json:"province"`
	CodePostal        string `json:"code_postal"`
	PreferredLanguage string `json:"preferred_language"`
	// Additional contacts
	Contacts []CreateContactRequest `json:"contacts"`
}
