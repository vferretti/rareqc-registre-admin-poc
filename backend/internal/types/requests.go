package types

type CreateContactRequest struct {
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	RelationshipCode string `json:"relationship_code"`
	IsPrimary        bool   `json:"is_primary"`
	SameCoordinates  bool   `json:"same_coordinates"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	StreetAddress    string `json:"street_address"`
	City             string `json:"city"`
	Province         string `json:"province"`
	CodePostal       string `json:"code_postal"`
	PreferredLanguage string `json:"preferred_language"`
}

type CreateParticipantRequest struct {
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	DateOfBirth     string `json:"date_of_birth"`
	SexAtBirthCode  string `json:"sex_at_birth_code"`
	RAMQ            string `json:"ramq"`
	VitalStatusCode string `json:"vital_status_code"`
	DateOfDeath     string `json:"date_of_death"`
	// Coordinates (become "self" contact)
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	StreetAddress string `json:"street_address"`
	City          string `json:"city"`
	Province      string `json:"province"`
	CodePostal    string `json:"code_postal"`
	// Additional contacts
	Contacts []CreateContactRequest `json:"contacts"`
}
