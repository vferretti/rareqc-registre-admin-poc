package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"registre-admin/internal/database"
	"registre-admin/internal/types"

	"gorm.io/gorm"
)

// Québécois and anglophone first names
var boysNames = []string{
	"Olivier", "Liam", "Noah", "William", "Félix", "Thomas", "Léo", "Nathan",
	"Samuel", "Jacob", "Raphaël", "Émile", "Antoine", "Alexandre", "Mathis",
	"Étienne", "Xavier", "Gabriel", "Benjamin", "Alexis", "Édouard", "Louis",
	"Zachary", "Charles", "Arnaud", "Théo", "Julien", "Maxime", "Adam", "Simon",
	"Laurent", "Philippe", "Vincent", "Elliot", "Loïc", "Tristan", "Cédric",
	"Jérémy", "Hubert", "Damien",
	// Anglophone names
	"James", "Ryan", "Connor", "Dylan", "Tyler", "Brandon", "Kyle",
	"Matthew", "Andrew", "Kevin",
}

var girlsNames = []string{
	"Emma", "Alice", "Léa", "Florence", "Olivia", "Charlotte", "Rosalie",
	"Béatrice", "Camille", "Zoé", "Juliette", "Chloé", "Mia", "Laurence",
	"Élodie", "Élizabeth", "Simone", "Mégane", "Ariane", "Aurélie",
	"Gabrielle", "Amélie", "Jade", "Léonie", "Coralie", "Noémie", "Sofia",
	"Maélie", "Flavie", "Clara", "Annabelle", "Sarah", "Raphaëlle", "Ève",
	"Delphine", "Frédérique", "Madeleine", "Évelyne", "Justine", "Sandrine",
	// Anglophone names
	"Ashley", "Brittany", "Megan", "Heather", "Jessica", "Kaitlyn", "Lindsay",
	"Samantha", "Stephanie", "Rachel",
}

var lastNames = []string{
	"Tremblay", "Gagnon", "Roy", "Côté", "Bouchard", "Gauthier", "Morin",
	"Lavoie", "Fortin", "Gagné", "Ouellet", "Pelletier", "Bélanger", "Lévesque",
	"Bergeron", "Leblanc", "Paquette", "Girard", "Simard", "Boucher",
	"Caron", "Beaulieu", "Cloutier", "Dubé", "Poirier", "Fournier", "Lapointe",
	"Leclerc", "Lefebvre", "Martel", "Thibault", "Mercier", "Dupuis", "Hébert",
	"Villeneuve", "Desjardins", "Therrien", "Savard", "Nadeau", "Dufour",
	"Lalonde", "Proulx", "Breton", "Ménard", "Beaudoin", "Picard", "Langlois",
	"Brassard", "Tardif", "Champagne",
	// Anglophone last names
	"Smith", "Johnson", "Brown", "Wilson", "Taylor", "Campbell", "Stewart",
	"Murray", "Robertson", "Henderson",
}

var cities = []string{
	"Montréal", "Québec", "Laval", "Gatineau", "Longueuil", "Sherbrooke",
	"Saguenay", "Lévis", "Trois-Rivières", "Terrebonne", "Saint-Jean-sur-Richelieu",
	"Repentigny", "Drummondville", "Granby", "Saint-Hyacinthe", "Rimouski",
	"Victoriaville", "Shawinigan", "Rouyn-Noranda", "Val-d'Or",
}

var streets = []string{
	"rue Principale", "boulevard Laurier", "avenue du Parc", "rue Saint-Jean",
	"rue de la Montagne", "boulevard René-Lévesque", "rue Sainte-Catherine",
	"chemin du Roy", "avenue Cartier", "rue des Érables", "boulevard Charest",
	"rue Saint-Joseph", "avenue Maguire", "rue du Pont", "boulevard Hamel",
}

var authors = []string{
	"John Smith", "Marie Tremblay", "Pierre Gagnon", "Sophie Lavoie",
}

func main() {
	db, err := database.NewPostgresDB()
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}

	// Clean existing data (order matters for FK)
	db.Exec("DELETE FROM activity_logs")
	db.Exec("DELETE FROM contacts")
	db.Exec("DELETE FROM participants")

	log.Println("Seeding 100 participants...")

	// Base time: 30 days ago, we'll stagger forward
	baseTime := time.Now().Add(-30 * 24 * time.Hour)

	// 85 children, 15 adults
	childCount := 85
	adultCount := 15

	for i := 0; i < childCount; i++ {
		ts := baseTime.Add(time.Duration(i) * 7 * time.Hour)
		seedChild(db, i, ts)
	}
	for i := 0; i < adultCount; i++ {
		ts := baseTime.Add(time.Duration(childCount+i) * 7 * time.Hour)
		seedAdult(db, childCount+i, ts)
	}

	log.Println("Seed complete: 100 participants created with activity logs")
}

func createActivityLog(db *gorm.DB, actionTypeCode string, participantID int, author string, details string, createdAt time.Time) {
	var detailsPtr *string
	if details != "" {
		detailsPtr = &details
	}
	db.Create(&types.ActivityLog{
		ActionTypeCode: actionTypeCode,
		ParticipantID:  &participantID,
		Author:         author,
		Details:        detailsPtr,
		CreatedAt:      createdAt,
	})
}

func seedChild(db *gorm.DB, index int, ts time.Time) {
	isFemale := index%2 == 0
	sex := "male"
	firstName := pick(boysNames)
	if isFemale {
		sex = "female"
		firstName = pick(girlsNames)
	}

	lastName := pick(lastNames)
	dob := randomChildDOB()
	city := pick(cities)
	lang := langForName(firstName)
	address := randomAddress()
	contactCity := pick(cities)
	postalCode := randomPostalCode()
	author := pick(authors)

	ramq := generateRAMQ(firstName, lastName, dob, isFemale)
	participant := types.Participant{
		FirstName:       firstName,
		LastName:        lastName,
		DateOfBirth:     dob,
		CityOfBirth:     &city,
		RAMQ:            &ramq,
		SexAtBirthCode:  sex,
		VitalStatusCode: "alive",
	}
	db.Create(&participant)

	// Activity: participant created
	createActivityLog(db, "participant_created", participant.ID, author,
		fmt.Sprintf("%s %s", firstName, lastName), ts)

	// Self contact (participant's own coordinates)
	selfContact := types.Contact{
		ParticipantID:     participant.ID,
		FirstName:         firstName,
		LastName:          lastName,
		RelationshipCode:  "self",
		IsPrimary:         false,
		Email:             fmt.Sprintf("%s.%s@%s", lower(firstName), lower(lastName), randomDomain()),
		Phone:             randomPhone(),
		StreetAddress:     address,
		City:              contactCity,
		Province:          "QC",
		CodePostal:        postalCode,
		PreferredLanguage: lang,
	}
	db.Create(&selfContact)

	// Mother contact (always present for children, is primary)
	motherFirst := pick(girlsNames)
	motherLast := lastName
	if rand.Intn(5) == 0 {
		motherLast = pick(lastNames) // ~20% different last name
	}

	motherContact := types.Contact{
		ParticipantID:     participant.ID,
		FirstName:         motherFirst,
		LastName:          motherLast,
		RelationshipCode:  "mother",
		IsPrimary:         true,
		Email:             fmt.Sprintf("%s.%s@%s", lower(motherFirst), lower(motherLast), randomDomain()),
		Phone:             randomPhone(),
		StreetAddress:     address,
		City:              contactCity,
		Province:          "QC",
		CodePostal:        postalCode,
		PreferredLanguage: lang,
	}
	db.Create(&motherContact)

	// ~30% chance participant was edited later
	if rand.Intn(100) < 30 {
		editTs := ts.Add(time.Duration(rand.Intn(48)+1) * time.Hour)
		editAuthor := pick(authors)
		createActivityLog(db, "participant_edited", participant.ID, editAuthor,
			fmt.Sprintf("%s %s", firstName, lastName), editTs)
	}

	// Father contact (~40% of children)
	if rand.Intn(5) < 2 {
		fatherFirst := pick(boysNames)
		fatherLast := lastName

		fatherContact := types.Contact{
			ParticipantID:     participant.ID,
			FirstName:         fatherFirst,
			LastName:          fatherLast,
			RelationshipCode:  "father",
			IsPrimary:         false,
			Email:             fmt.Sprintf("%s.%s@%s", lower(fatherFirst), lower(fatherLast), randomDomain()),
			Phone:             randomPhone(),
			StreetAddress:     address,
			City:              contactCity,
			Province:          "QC",
			CodePostal:        postalCode,
			PreferredLanguage: lang,
		}
		db.Create(&fatherContact)
	}
}

func seedAdult(db *gorm.DB, index int, ts time.Time) {
	isFemale := index%2 == 0
	sex := "male"
	firstName := pick(boysNames)
	if isFemale {
		sex = "female"
		firstName = pick(girlsNames)
	}

	lastName := pick(lastNames)
	dob := randomAdultDOB()
	city := pick(cities)
	author := pick(authors)

	ramq := generateRAMQ(firstName, lastName, dob, isFemale)
	participant := types.Participant{
		FirstName:       firstName,
		LastName:        lastName,
		DateOfBirth:     dob,
		CityOfBirth:     &city,
		RAMQ:            &ramq,
		SexAtBirthCode:  sex,
		VitalStatusCode: "alive",
	}
	db.Create(&participant)

	// Activity: participant created
	createActivityLog(db, "participant_created", participant.ID, author,
		fmt.Sprintf("%s %s", firstName, lastName), ts)

	// Adult is their own primary contact
	lang := langForName(firstName)
	selfContact := types.Contact{
		ParticipantID:     participant.ID,
		FirstName:         firstName,
		LastName:          lastName,
		RelationshipCode:  "self",
		IsPrimary:         true,
		Email:             fmt.Sprintf("%s.%s@%s", lower(firstName), lower(lastName), randomDomain()),
		Phone:             randomPhone(),
		StreetAddress:     randomAddress(),
		City:              pick(cities),
		Province:          "QC",
		CodePostal:        randomPostalCode(),
		PreferredLanguage: lang,
	}
	db.Create(&selfContact)

	// ~25% chance participant was edited later
	if rand.Intn(100) < 25 {
		editTs := ts.Add(time.Duration(rand.Intn(96)+1) * time.Hour)
		editAuthor := pick(authors)
		createActivityLog(db, "participant_edited", participant.ID, editAuthor,
			fmt.Sprintf("%s %s", firstName, lastName), editTs)
	}
}

// --- Helpers ---

func pick(list []string) string {
	return list[rand.Intn(len(list))]
}

func lower(s string) string {
	// Simple ASCII-safe lowercase for email generation
	result := make([]byte, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'A' && r <= 'Z':
			result = append(result, byte(r+32))
		case r == 'é' || r == 'è' || r == 'ê' || r == 'ë' || r == 'É':
			result = append(result, 'e')
		case r == 'à' || r == 'â' || r == 'ä':
			result = append(result, 'a')
		case r == 'î' || r == 'ï':
			result = append(result, 'i')
		case r == 'ô' || r == 'ö':
			result = append(result, 'o')
		case r == 'ù' || r == 'û' || r == 'ü':
			result = append(result, 'u')
		case r == 'ç':
			result = append(result, 'c')
		case r == 'ë':
			result = append(result, 'e')
		default:
			if r >= 'a' && r <= 'z' {
				result = append(result, byte(r))
			}
		}
	}
	return string(result)
}

func randomChildDOB() time.Time {
	// Children: 0-17 years old
	now := time.Now()
	yearsAgo := rand.Intn(17) + 1
	dob := now.AddDate(-yearsAgo, -rand.Intn(12), -rand.Intn(28))
	return time.Date(dob.Year(), dob.Month(), dob.Day(), 0, 0, 0, 0, time.UTC)
}

func randomAdultDOB() time.Time {
	// Adults: 18-65 years old
	now := time.Now()
	yearsAgo := rand.Intn(47) + 18
	dob := now.AddDate(-yearsAgo, -rand.Intn(12), -rand.Intn(28))
	return time.Date(dob.Year(), dob.Month(), dob.Day(), 0, 0, 0, 0, time.UTC)
}

func randomPhone() string {
	// Quebec area codes
	areaCodes := []string{"514", "438", "450", "418", "581", "819", "873", "367"}
	return fmt.Sprintf("(%s) %03d-%04d", pick(areaCodes), rand.Intn(1000), rand.Intn(10000))
}

func randomAddress() string {
	return fmt.Sprintf("%d %s", rand.Intn(9999)+1, pick(streets))
}

func randomPostalCode() string {
	letters := "ABCEGHJKLMNPRSTVXY"
	return fmt.Sprintf("%c%d%c %d%c%d",
		letters[rand.Intn(len(letters))],
		rand.Intn(10),
		letters[rand.Intn(len(letters))],
		rand.Intn(10),
		letters[rand.Intn(len(letters))],
		rand.Intn(10),
	)
}

var angloFirstNames = map[string]bool{
	"James": true, "Ryan": true, "Connor": true, "Dylan": true, "Tyler": true,
	"Brandon": true, "Kyle": true, "Matthew": true, "Andrew": true, "Kevin": true,
	"Ashley": true, "Brittany": true, "Megan": true, "Heather": true, "Jessica": true,
	"Kaitlyn": true, "Lindsay": true, "Samantha": true, "Stephanie": true, "Rachel": true,
}

func langForName(firstName string) string {
	if angloFirstNames[firstName] {
		return "en"
	}
	return "fr"
}

func randomDomain() string {
	domains := []string{"gmail.com", "outlook.com", "videotron.ca", "bell.net", "hotmail.com", "yahoo.ca"}
	return pick(domains)
}

// generateRAMQ generates a realistic RAMQ number.
// Format: AAAA NNNN NNNN (12 chars)
// - 3 first letters of last name (uppercased, unaccented)
// - 1 first letter of first name (uppercased, unaccented)
// - 2 digits: year of birth (+ 50 for females)
// - 2 digits: month of birth
// - 2 digits: day of birth
// - 2 digits: sequence (random 01-99)
func generateRAMQ(firstName, lastName string, dob time.Time, isFemale bool) string {
	ln := upper(lastName)
	fn := upper(firstName)

	// Pad last name to at least 3 chars
	for len(ln) < 3 {
		ln += "X"
	}

	year := dob.Year() % 100
	if isFemale {
		year += 50
	}

	seq := rand.Intn(99) + 1

	return fmt.Sprintf("%s%s %02d%02d %02d%02d",
		ln[:3], fn[:1],
		year, int(dob.Month()),
		dob.Day(), seq,
	)
}

func upper(s string) string {
	result := make([]byte, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z':
			result = append(result, byte(r-32))
		case r >= 'A' && r <= 'Z':
			result = append(result, byte(r))
		case r == 'é' || r == 'è' || r == 'ê' || r == 'ë' || r == 'É':
			result = append(result, 'E')
		case r == 'à' || r == 'â' || r == 'ä':
			result = append(result, 'A')
		case r == 'î' || r == 'ï':
			result = append(result, 'I')
		case r == 'ô' || r == 'ö':
			result = append(result, 'O')
		case r == 'ù' || r == 'û' || r == 'ü':
			result = append(result, 'U')
		case r == 'ç':
			result = append(result, 'C')
		}
	}
	return string(result)
}
