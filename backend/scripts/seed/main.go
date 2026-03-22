package main

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"registre-admin/internal/database"
	"registre-admin/internal/geocode"
	"registre-admin/internal/guid"
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

// realAddress holds a real Quebec address for seed data geocoding.
type realAddress struct {
	Street     string
	City       string
	PostalCode string
}

// 200 real Quebec addresses across major cities.
var realAddresses = []realAddress{
	// Montréal (40)
	{"1000 rue Sherbrooke Ouest", "Montréal", "H3A 3G4"},
	{"3175 chemin de la Côte-Sainte-Catherine", "Montréal", "H3T 1C5"},
	{"845 rue Sherbrooke Est", "Montréal", "H2L 1K6"},
	{"1255 rue University", "Montréal", "H3B 3B6"},
	{"500 boulevard René-Lévesque Ouest", "Montréal", "H2Z 1W7"},
	{"1001 boulevard de Maisonneuve Est", "Montréal", "H2L 4P9"},
	{"4101 rue Sherbrooke Est", "Montréal", "H1X 2B2"},
	{"7400 boulevard Saint-Laurent", "Montréal", "H2R 2Y1"},
	{"2900 boulevard Édouard-Montpetit", "Montréal", "H3T 1J4"},
	{"6100 avenue du Parc", "Montréal", "H2V 4H9"},
	{"1515 rue Sainte-Catherine Ouest", "Montréal", "H3G 2W1"},
	{"3200 rue Jean-Brillant", "Montréal", "H3T 1N8"},
	{"185 avenue du Mont-Royal Est", "Montréal", "H2T 1P4"},
	{"5100 rue Sherbrooke Est", "Montréal", "H1V 1A1"},
	{"2313 rue Sainte-Catherine Est", "Montréal", "H2K 2J4"},
	{"8500 boulevard Henri-Bourassa Est", "Montréal", "H1E 2S4"},
	{"3535 avenue Papineau", "Montréal", "H2K 4J9"},
	{"1400 boulevard de Maisonneuve Ouest", "Montréal", "H3G 1M8"},
	{"4700 rue Saint-Denis", "Montréal", "H2J 2L5"},
	{"6700 avenue de Chateaubriand", "Montréal", "H2S 2N7"},
	{"1717 boulevard René-Lévesque Est", "Montréal", "H2L 4T3"},
	{"9300 boulevard Lacordaire", "Montréal", "H1R 3A5"},
	{"4500 rue de Bellechasse", "Montréal", "H1T 2A3"},
	{"2100 avenue Pierre-Dupuy", "Montréal", "H3C 3R5"},
	{"5500 avenue Gatineau", "Montréal", "H3T 1X5"},
	{"1100 rue de la Cathédrale", "Montréal", "H3B 2S2"},
	{"3000 avenue McGill College", "Montréal", "H3A 3J6"},
	{"7700 boulevard Langelier", "Montréal", "H1S 1V7"},
	{"2500 chemin de Polytechnique", "Montréal", "H3T 1J4"},
	{"800 boulevard De La Gauchetière Ouest", "Montréal", "H5A 1K6"},
	{"4200 rue Saint-Urbain", "Montréal", "H2W 1V3"},
	{"1950 rue Saint-Antoine Ouest", "Montréal", "H3J 1A5"},
	{"5800 rue Saint-Denis", "Montréal", "H2S 3L5"},
	{"3450 rue Drummond", "Montréal", "H3G 1Y2"},
	{"6500 rue Beaubien Est", "Montréal", "H1M 1A9"},
	{"1200 avenue des Pins Ouest", "Montréal", "H3G 1A9"},
	{"8100 rue du Parc", "Montréal", "H3N 1X1"},
	{"4800 rue Molson", "Montréal", "H1Y 3G1"},
	{"2700 boulevard Pie-IX", "Montréal", "H1V 2C8"},
	{"1600 avenue de Lorimier", "Montréal", "H2K 3W5"},
	// Québec (25)
	{"1050 avenue du Séminaire", "Québec", "G1V 4K2"},
	{"2325 rue de l'Université", "Québec", "G1V 0A6"},
	{"900 boulevard René-Lévesque Est", "Québec", "G1R 2B5"},
	{"1000 route de l'Église", "Québec", "G1V 3V9"},
	{"580 Grande Allée Est", "Québec", "G1R 2K2"},
	{"775 avenue Honoré-Mercier", "Québec", "G1R 6A5"},
	{"2700 boulevard Laurier", "Québec", "G1V 2L8"},
	{"1200 avenue Germain-des-Prés", "Québec", "G1V 3M7"},
	{"5400 boulevard des Galeries", "Québec", "G2K 2B4"},
	{"3175 chemin des Quatre-Bourgeois", "Québec", "G1W 2K7"},
	{"555 boulevard Wilfrid-Hamel", "Québec", "G1M 2S8"},
	{"1451 avenue Maguire", "Québec", "G1T 1Z3"},
	{"300 boulevard Jean-Lesage", "Québec", "G1K 8K6"},
	{"500 rue du Pont", "Québec", "G1K 6M7"},
	{"1100 rue de la Chevrotière", "Québec", "G1R 5E5"},
	{"2450 chemin Sainte-Foy", "Québec", "G1V 1T6"},
	{"800 avenue Joffre", "Québec", "G1S 3L4"},
	{"3500 boulevard de Maskinongé", "Québec", "G1X 1R1"},
	{"1635 rue de l'Entente", "Québec", "G1S 4S9"},
	{"825 boulevard Lebourgneuf", "Québec", "G2J 0B9"},
	{"6380 boulevard Guillaume-Couture", "Lévis", "G6V 9P7"},
	{"50 route du Président-Kennedy", "Lévis", "G6V 6C1"},
	{"1175 avenue Taniata", "Lévis", "G6Z 0G2"},
	{"735 boulevard Alphonse-Desjardins", "Lévis", "G6V 2L1"},
	{"5700 rue J.-B.-Michaud", "Lévis", "G6V 0B1"},
	// Laval (15)
	{"1950 boulevard Le Corbusier", "Laval", "H7S 1Y7"},
	{"3003 boulevard Le Carrefour", "Laval", "H7T 1C8"},
	{"1600 boulevard de l'Avenir", "Laval", "H7S 2N5"},
	{"3100 boulevard de la Concorde Est", "Laval", "H7E 2B8"},
	{"1555 boulevard Chomedey", "Laval", "H7V 3Z1"},
	{"400 boulevard Armand-Frappier", "Laval", "H7V 4B4"},
	{"2500 boulevard Daniel-Johnson", "Laval", "H7T 2P6"},
	{"1700 boulevard Laval", "Laval", "H7S 2M5"},
	{"225 boulevard Sainte-Rose", "Laval", "H7L 1L6"},
	{"6000 boulevard Robert-Bourassa", "Laval", "H7T 0C3"},
	{"3225 avenue Francis-Hughes", "Laval", "H7L 5A5"},
	{"705 boulevard Curé-Labelle", "Laval", "H7V 2T8"},
	{"1415 boulevard Le Corbusier", "Laval", "H7S 2K8"},
	{"4900 boulevard Arthur-Sauvé", "Laval", "H7R 3X7"},
	{"1530 boulevard des Laurentides", "Laval", "H7M 2Y3"},
	// Gatineau (10)
	{"855 boulevard de la Gappe", "Gatineau", "J8T 8H9"},
	{"455 boulevard de l'Hôpital", "Gatineau", "J8V 1S7"},
	{"200 boulevard du Plateau", "Gatineau", "J9A 3G3"},
	{"1100 boulevard Maloney Est", "Gatineau", "J8P 1H1"},
	{"325 boulevard Gréber", "Gatineau", "J8T 5R3"},
	{"75 rue d'Edmonton", "Gatineau", "J8Y 6S1"},
	{"700 boulevard Saint-Joseph", "Gatineau", "J8Y 4B8"},
	{"1500 boulevard La Vérendrye Ouest", "Gatineau", "J8T 8K5"},
	{"200 promenade du Portage", "Gatineau", "J8X 4B7"},
	{"425 boulevard Alexandre-Taché", "Gatineau", "J9A 1M8"},
	// Longueuil (10)
	{"3141 boulevard Taschereau", "Longueuil", "J4V 2H2"},
	{"1550 boulevard Marie-Victorin", "Longueuil", "J4G 1A5"},
	{"1111 rue Beauregard", "Longueuil", "J4K 2M3"},
	{"2500 chemin de Chambly", "Longueuil", "J4L 1M5"},
	{"100 place Charles-Le Moyne", "Longueuil", "J4K 2T4"},
	{"5400 boulevard Cousineau", "Longueuil", "J3Y 3P4"},
	{"3200 rue de Lyon", "Longueuil", "J4H 3Z6"},
	{"1200 boulevard Roland-Therrien", "Longueuil", "J4J 5H4"},
	{"6400 rue de la Côte-de-Liesse", "Longueuil", "J3Y 2J7"},
	{"750 rue Adoncour", "Longueuil", "J4G 2M6"},
	// Sherbrooke (10)
	{"2500 boulevard de l'Université", "Sherbrooke", "J1K 2R1"},
	{"3001 12e Avenue Nord", "Sherbrooke", "J1H 5N4"},
	{"1200 rue King Est", "Sherbrooke", "J1G 1E4"},
	{"900 rue du Conseil", "Sherbrooke", "J1G 1L3"},
	{"4100 boulevard de Portland", "Sherbrooke", "J1L 1K1"},
	{"1375 rue King Ouest", "Sherbrooke", "J1J 2B5"},
	{"2600 rue College", "Sherbrooke", "J1M 1Z7"},
	{"550 rue du Cégep", "Sherbrooke", "J1E 2K1"},
	{"100 rue Belvédère Nord", "Sherbrooke", "J1H 4A9"},
	{"1900 rue Galt Ouest", "Sherbrooke", "J1K 1K4"},
	// Saguenay (10)
	{"930 rue Jacques-Cartier Est", "Saguenay", "G7H 7K9"},
	{"1671 boulevard Talbot", "Saguenay", "G7H 4C3"},
	{"2505 rue Saint-Jean-Baptiste", "Saguenay", "G7X 4B1"},
	{"725 boulevard du Royaume", "Saguenay", "G7S 4S6"},
	{"455 rue Racine Est", "Saguenay", "G7H 1T3"},
	{"1100 boulevard Saint-Paul", "Saguenay", "G7J 3Y2"},
	{"3791 boulevard Harvey", "Saguenay", "G7X 3A8"},
	{"2655 boulevard du Royaume", "Saguenay", "G7S 5B8"},
	{"150 place du Portage", "Saguenay", "G7H 8M9"},
	{"530 avenue de l'Hôtel-Dieu", "Saguenay", "G7H 5H6"},
	// Trois-Rivières (10)
	{"3351 boulevard des Forges", "Trois-Rivières", "G8Z 1M2"},
	{"1991 boulevard des Récollets", "Trois-Rivières", "G8Z 3W5"},
	{"100 rue Laviolette", "Trois-Rivières", "G9A 1T9"},
	{"3500 rue De Courval", "Trois-Rivières", "G8Y 6S8"},
	{"4450 boulevard Gene-H.-Kruger", "Trois-Rivières", "G9A 4M3"},
	{"1525 boulevard des Forges", "Trois-Rivières", "G8Z 1T4"},
	{"200 rue Bellefeuille", "Trois-Rivières", "G9A 3Y3"},
	{"810 boulevard Thibeau", "Trois-Rivières", "G8T 7A6"},
	{"1680 boulevard de la Pinière", "Trois-Rivières", "G8Z 1A1"},
	{"5300 boulevard Jean-XXIII", "Trois-Rivières", "G8Z 4A6"},
	// Terrebonne (5)
	{"3175 boulevard de la Pinière", "Terrebonne", "J6X 4P7"},
	{"1155 montée Masson", "Terrebonne", "J6W 6G1"},
	{"2990 avenue des Grandes-Tourelles", "Terrebonne", "J6V 0A1"},
	{"800 boulevard des Seigneurs", "Terrebonne", "J6W 1T5"},
	{"600 rue Léon-Martel", "Terrebonne", "J6W 5S6"},
	// Saint-Jean-sur-Richelieu (5)
	{"315 rue MacDonald", "Saint-Jean-sur-Richelieu", "J3B 8J3"},
	{"104 rue Champlain", "Saint-Jean-sur-Richelieu", "J3B 6V1"},
	{"725 boulevard du Séminaire Nord", "Saint-Jean-sur-Richelieu", "J3A 1E1"},
	{"190 boulevard d'Iberville", "Saint-Jean-sur-Richelieu", "J2X 2J3"},
	{"2925 boulevard Industriel", "Saint-Jean-sur-Richelieu", "J3B 7Y5"},
	// Drummondville (5)
	{"400 rue Saint-Georges", "Drummondville", "J2C 4H4"},
	{"1225 boulevard Lemire", "Drummondville", "J2C 8L8"},
	{"2000 boulevard René-Lévesque", "Drummondville", "J2C 5W4"},
	{"555 boulevard Saint-Joseph", "Drummondville", "J2C 2B6"},
	{"960 rue Saint-Pierre", "Drummondville", "J2C 3V9"},
	// Granby (5)
	{"233 rue Principale", "Granby", "J2G 2V9"},
	{"77 rue Dufferin", "Granby", "J2G 4X1"},
	{"400 rue Cowie", "Granby", "J2G 3V3"},
	{"650 rue Principale", "Granby", "J2G 8L4"},
	{"1535 boulevard Leclerc Ouest", "Granby", "J2J 1L4"},
	// Saint-Hyacinthe (5)
	{"2075 rue Sicotte", "Saint-Hyacinthe", "J2S 7C5"},
	{"1100 boulevard Laframboise", "Saint-Hyacinthe", "J2S 4Z2"},
	{"3000 avenue Bourdages Nord", "Saint-Hyacinthe", "J2S 5W6"},
	{"900 rue Saint-Antoine", "Saint-Hyacinthe", "J2S 6C4"},
	{"1550 rue des Cascades Ouest", "Saint-Hyacinthe", "J2S 3H5"},
	// Rimouski (5)
	{"60 rue de l'Évêché Ouest", "Rimouski", "G5L 4H6"},
	{"300 allée des Ursulines", "Rimouski", "G5L 3A1"},
	{"150 avenue Belzile", "Rimouski", "G5L 3E6"},
	{"455 boulevard Saint-Germain Ouest", "Rimouski", "G5L 3N2"},
	{"1 rue du Fleuve", "Rimouski", "G5L 0A1"},
	// Victoriaville (5)
	{"475 boulevard des Bois-Francs Sud", "Victoriaville", "G6P 5W2"},
	{"100 rue Notre-Dame Ouest", "Victoriaville", "G6P 1T2"},
	{"259 boulevard des Bois-Francs Nord", "Victoriaville", "G6P 6S5"},
	{"945 boulevard Jutras Est", "Victoriaville", "G6P 8A5"},
	{"1700 boulevard Arthabaska Est", "Victoriaville", "G6T 2C3"},
	// Shawinigan (5)
	{"1250 105e Rue", "Shawinigan", "G9P 1K1"},
	{"3355 boulevard Royal", "Shawinigan", "G9N 4V3"},
	{"550 avenue de la Station", "Shawinigan", "G9N 1W2"},
	{"1100 avenue Champlain", "Shawinigan", "G9N 2K1"},
	{"150 promenade du Saint-Maurice", "Shawinigan", "G9N 1L3"},
	// Rouyn-Noranda (5)
	{"53 rue Gamble Ouest", "Rouyn-Noranda", "J9X 2R3"},
	{"425 boulevard du Collège", "Rouyn-Noranda", "J9X 5E5"},
	{"100 rue du Terminus Est", "Rouyn-Noranda", "J9X 3B5"},
	{"270 avenue Principale", "Rouyn-Noranda", "J9X 5B9"},
	{"850 rue Saguenay", "Rouyn-Noranda", "J9X 1K3"},
	// Val-d'Or (5)
	{"900 7e Rue", "Val-d'Or", "J9P 3P7"},
	{"1185 rue Principale", "Val-d'Or", "J9P 4P8"},
	{"400 avenue Centrale", "Val-d'Or", "J9P 1P4"},
	{"100 rue Perreault Est", "Val-d'Or", "J9P 2G1"},
	{"600 3e Avenue", "Val-d'Or", "J9P 1S2"},
	// Repentigny (5)
	{"100 boulevard Brien", "Repentigny", "J6A 8B6"},
	{"740 rue Notre-Dame", "Repentigny", "J6A 2V8"},
	{"222 rue de la Mairie", "Repentigny", "J5Y 0A1"},
	{"1065 boulevard Iberville", "Repentigny", "J5Y 1P4"},
	{"435 boulevard de L'Assomption", "Repentigny", "J6A 1E3"},
	// Brigham, Cowansville, etc. (10)
	{"660 chemin Hallé Est", "Brigham", "J2K 4H1"},
	{"145 rue Principale", "Cowansville", "J2K 1J2"},
	{"350 rue du Sud", "Cowansville", "J2K 2X5"},
	{"1000 boulevard de Bromont", "Bromont", "J2L 1C2"},
	{"100 rue Shefford", "Bromont", "J2L 1A1"},
	{"50 rue Dépôt", "Magog", "J1X 0B1"},
	{"300 rue Principale Ouest", "Magog", "J1X 2A9"},
	{"185 rue du Moulin", "Coaticook", "J1A 2R6"},
	{"500 rue Principale Est", "Farnham", "J2N 1L2"},
	{"1100 boulevard Industriel", "Granby", "J2J 0K6"},
}

func randomRealAddress() realAddress {
	return realAddresses[rand.Intn(len(realAddresses))]
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
	db.Exec("DELETE FROM cart_item")
	db.Exec("DELETE FROM external_id")
	db.Exec("DELETE FROM consent")
	db.Exec("DELETE FROM document_file")
	db.Exec("DELETE FROM activity_log")
	db.Exec("DELETE FROM guid")
	db.Exec("DELETE FROM contact")
	db.Exec("DELETE FROM participant")

	log.Println("Seeding 200 participants...")

	// Distribute participants across 7 quarters (Q3 2024 → Q1 2026)
	// with progressive growth: fewer early, more recent
	type quarterSlot struct {
		start time.Time
		end   time.Time
	}
	quarters := []quarterSlot{
		{time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC), time.Date(2024, 9, 30, 0, 0, 0, 0, time.UTC)},   // 24Q3
		{time.Date(2024, 10, 1, 0, 0, 0, 0, time.UTC), time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)},  // 24Q4
		{time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(2025, 3, 31, 0, 0, 0, 0, time.UTC)},    // 25Q1
		{time.Date(2025, 4, 1, 0, 0, 0, 0, time.UTC), time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC)},    // 25Q2
		{time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC), time.Date(2025, 9, 30, 0, 0, 0, 0, time.UTC)},    // 25Q3
		{time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC), time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)},  // 25Q4
		{time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)},    // 26Q1
	}
	// Progressive distribution: 10, 15, 20, 25, 35, 45, 50 = 200
	perQuarter := []int{10, 15, 20, 25, 35, 45, 50}

	// 85% children, 15% adults
	childCount := 170
	adultCount := 30
	totalCount := childCount + adultCount

	// Build a list of enrollment timestamps spread across quarters
	enrollTimes := make([]time.Time, 0, totalCount)
	for qi, count := range perQuarter {
		q := quarters[qi]
		dayRange := int(q.end.Sub(q.start).Hours() / 24)
		if dayRange < 1 {
			dayRange = 1
		}
		for j := 0; j < count; j++ {
			randomDay := rand.Intn(dayRange)
			randomHour := rand.Intn(10) + 8 // 08:00-17:59
			ts := q.start.Add(time.Duration(randomDay)*24*time.Hour + time.Duration(randomHour)*time.Hour)
			enrollTimes = append(enrollTimes, ts)
		}
	}
	// Shuffle to mix children and adults
	rand.Shuffle(len(enrollTimes), func(i, j int) {
		enrollTimes[i], enrollTimes[j] = enrollTimes[j], enrollTimes[i]
	})

	for i := 0; i < childCount; i++ {
		ts := enrollTimes[i]
		seedChild(db, i, ts)
	}
	for i := 0; i < adultCount; i++ {
		ts := enrollTimes[childCount+i]
		seedAdult(db, childCount+i, ts)
	}

	// Override created_at to match enrollment timestamps (GORM autoCreateTime sets to NOW)
	var allParticipants []types.Participant
	db.Order("id ASC").Find(&allParticipants)
	for i, p := range allParticipants {
		if i < len(enrollTimes) {
			db.Exec("UPDATE participant SET created_at = ? WHERE id = ?", enrollTimes[i], p.ID)
		}
	}

	// Load consent PDF into document table
	seedConsentDocuments(db)

	// Seed consents
	seedConsents(db)

	// Geocode self contacts
	geocodeSelfContacts(db)

	// Seed external systems and IDs
	seedExternalSystems(db)

	log.Printf("Seed complete: %d participants created across 7 quarters with activity logs, consents, and external IDs", totalCount)
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
	addr := randomRealAddress()
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
		CreatedAt:       ts,
	}
	db.Create(&participant)
	db.Create(guid.Compute(&participant))

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
		StreetAddress:     addr.Street,
		City:              addr.City,
		Province:          "QC",
		CodePostal:        addr.PostalCode,
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
		StreetAddress:     addr.Street,
		City:              addr.City,
		Province:          "QC",
		CodePostal:        addr.PostalCode,
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
			StreetAddress:     addr.Street,
			City:              addr.City,
			Province:          "QC",
			CodePostal:        addr.PostalCode,
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
		CreatedAt:       ts,
	}
	db.Create(&participant)
	db.Create(guid.Compute(&participant))

	// Activity: participant created
	createActivityLog(db, "participant_created", participant.ID, author,
		fmt.Sprintf("%s %s", firstName, lastName), ts)

	// Adult is their own primary contact
	lang := langForName(firstName)
	addr := randomRealAddress()
	selfContact := types.Contact{
		ParticipantID:     participant.ID,
		FirstName:         firstName,
		LastName:          lastName,
		RelationshipCode:  "self",
		IsPrimary:         true,
		Email:             fmt.Sprintf("%s.%s@%s", lower(firstName), lower(lastName), randomDomain()),
		Phone:             randomPhone(),
		StreetAddress:     addr.Street,
		City:              addr.City,
		Province:          "QC",
		CodePostal:        addr.PostalCode,
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

// loadTemplatePDF loads a PDF file into a template document's document_file row.
func loadTemplatePDF(db *gorm.DB, fileName, pdfPath string) {
	pdfData, err := os.ReadFile(pdfPath)
	if err != nil {
		log.Printf("Warning: could not read %s: %v", pdfPath, err)
		return
	}
	var doc types.Document
	if err := db.Where("file_name = ?", fileName).First(&doc).Error; err != nil {
		log.Printf("Warning: document %q not found in DB: %v", fileName, err)
		return
	}
	doc.FileSize = int64(len(pdfData))
	db.Save(&doc)
	file := types.DocumentFile{DocumentID: doc.ID, Data: pdfData}
	db.Where("document_id = ?", doc.ID).FirstOrCreate(&file)
	log.Printf("Template PDF loaded: %s (%d bytes)", doc.Name, len(pdfData))
}

// seedConsentDocuments loads both template PDFs into the database.
func seedConsentDocuments(db *gorm.DB) {
	loadTemplatePDF(db, "Consentement_RareQc.pdf", "/data/Consentement_RareQc.pdf")
	loadTemplatePDF(db, "Consentement_RQDM.pdf", "/data/Consentement_RQDM.pdf")
}

// seedConsents creates consent records for all participants.
// Each participant gets one template (70% RareQc, 30% RQDM).
// Adults sign for themselves, minors are signed by their primary contact.
// A signed document is created per participant.
func seedConsents(db *gorm.DB) {
	// Fetch templates with their clauses
	var rareqcDoc, rqdmDoc types.Document
	db.Where("name LIKE ?", "%RareQc%").First(&rareqcDoc)
	db.Where("name LIKE ?", "%RQDM%").First(&rqdmDoc)

	var rareqcClauses, rqdmClauses []types.ConsentClause
	db.Where("template_document_id = ?", rareqcDoc.ID).Find(&rareqcClauses)
	db.Where("template_document_id = ?", rqdmDoc.ID).Find(&rqdmClauses)

	if len(rareqcClauses) == 0 && len(rqdmClauses) == 0 {
		log.Println("No consent clauses found, skipping consent seeding")
		return
	}

	// Load template PDFs for copying into signed documents
	rareqcPDF, _ := os.ReadFile("/data/Consentement_RareQc.pdf")
	rqdmPDF, _ := os.ReadFile("/data/Consentement_RQDM.pdf")

	var participants []types.Participant
	db.Preload("Contacts").Find(&participants)

	now := time.Now()
	for _, p := range participants {
		// Determine signer
		age := now.Year() - p.DateOfBirth.Year()
		if now.YearDay() < p.DateOfBirth.YearDay() {
			age--
		}
		isMinor := age < 18

		var signerID *int
		if isMinor {
			for _, ct := range p.Contacts {
				if ct.IsPrimary && ct.RelationshipCode != "self" {
					id := ct.ID
					signerID = &id
					break
				}
			}
		} else {
			// Adult signs for themselves (self contact)
			for _, ct := range p.Contacts {
				if ct.RelationshipCode == "self" {
					id := ct.ID
					signerID = &id
					break
				}
			}
		}

		// Pick a template: 70% RareQc, 30% RQDM
		clauses := rareqcClauses
		templateName := "RareQc"
		pdfData := rareqcPDF
		if rand.Intn(100) < 30 {
			clauses = rqdmClauses
			templateName = "RQDM"
			pdfData = rqdmPDF
		}

		// Create a signed document for this participant with the template PDF as content
		fileName := fmt.Sprintf("Consentement_%s_%s_%s.pdf", p.FirstName, p.LastName, templateName)
		signedDoc := types.Document{
			Name:     fmt.Sprintf("Consentement signé — %s %s (%s)", p.FirstName, p.LastName, templateName),
			FileName: fileName,
			TypeCode: "consent_signed",
			MimeType: "application/pdf",
			FileSize: int64(len(pdfData)),
		}
		db.Create(&signedDoc)
		if len(pdfData) > 0 {
			db.Create(&types.DocumentFile{DocumentID: signedDoc.ID, Data: pdfData})
		}

		// Consent date: random within 7 days of participant creation
		consentDate := p.CreatedAt.Add(-time.Duration(rand.Intn(7)) * 24 * time.Hour)
		consentDate = time.Date(consentDate.Year(), consentDate.Month(), consentDate.Day(), 0, 0, 0, 0, time.UTC)
		author := pick(authors)
		docID := signedDoc.ID

		// Phase 1: create all consents as valid
		type consentRecord struct {
			consent    types.Consent
			clauseType string
		}
		var created []consentRecord
		for i, clause := range clauses {
			skipRate := []int{5, 15, 30}
			if i < len(skipRate) && rand.Intn(100) < skipRate[i] {
				continue
			}

			consent := types.Consent{
				ClauseID:      clause.ID,
				ParticipantID: p.ID,
				Date:          consentDate,
				StatusCode:    "valid",
				SignedByID:    signerID,
				DocumentID:    &docID,
			}
			db.Create(&consent)
			created = append(created, consentRecord{consent: consent, clauseType: clause.ClauseTypeCode})

			addedAt := consentDate.Add(time.Duration(rand.Intn(8)) * time.Hour)
			details := fmt.Sprintf("%s — valid", clause.ClauseTypeCode)
			createActivityLog(db, "consent_added", p.ID, author, details, addedAt)
		}

		// Phase 2: randomly expire/withdraw some consents
		// Business rule: if registry is withdrawn or expired, all other clauses get the same status
		var registryCascadeStatus string
		var cascadeDate time.Time
		var cascadeAuthor string

		for i := range created {
			if created[i].clauseType != "registry" {
				continue
			}
			roll := rand.Intn(100)
			if roll < 25 {
				newStatus := "expired"
				if roll >= 15 {
					newStatus = "withdrawn"
				}
				cascadeDate = consentDate.Add(time.Duration(rand.Intn(18)+3) * 24 * time.Hour)
				cascadeDate = time.Date(cascadeDate.Year(), cascadeDate.Month(), cascadeDate.Day(), 0, 0, 0, 0, time.UTC)
				cascadeAuthor = pick(authors)

				created[i].consent.StatusCode = newStatus
				created[i].consent.Date = cascadeDate
				db.Save(&created[i].consent)

				editDetails := fmt.Sprintf("%s — valid → %s", created[i].clauseType, newStatus)
				createActivityLog(db, "consent_edited", p.ID, cascadeAuthor, editDetails, cascadeDate.Add(time.Duration(rand.Intn(8))*time.Hour))

				registryCascadeStatus = newStatus
			}
		}

		for i := range created {
			if created[i].clauseType == "registry" {
				continue
			}
			if registryCascadeStatus != "" {
				// Cascade: registry withdrawn/expired → all other clauses get same status
				created[i].consent.StatusCode = registryCascadeStatus
				created[i].consent.Date = cascadeDate
				db.Save(&created[i].consent)

				editDetails := fmt.Sprintf("%s — valid → %s (registre %s)", created[i].clauseType, registryCascadeStatus, registryCascadeStatus)
				createActivityLog(db, "consent_edited", p.ID, cascadeAuthor, editDetails, cascadeDate.Add(time.Duration(rand.Intn(8))*time.Hour))
			} else {
				// Independent expire/withdraw for non-registry clauses
				roll := rand.Intn(100)
				if roll < 20 {
					newStatus := "expired"
					if roll >= 12 {
						newStatus = "withdrawn"
					}
					editDate := consentDate.Add(time.Duration(rand.Intn(18)+3) * 24 * time.Hour)
					editDate = time.Date(editDate.Year(), editDate.Month(), editDate.Day(), 0, 0, 0, 0, time.UTC)

					created[i].consent.StatusCode = newStatus
					created[i].consent.Date = editDate
					db.Save(&created[i].consent)

					editDetails := fmt.Sprintf("%s — valid → %s", created[i].clauseType, newStatus)
					createActivityLog(db, "consent_edited", p.ID, pick(authors), editDetails, editDate.Add(time.Duration(rand.Intn(8))*time.Hour))
				}
			}
		}
	}

	log.Printf("Consents seeded for %d participants", len(participants))
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
	return fmt.Sprintf("%s%03d%04d", pick(areaCodes), rand.Intn(1000), rand.Intn(10000))
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
	month := int(dob.Month())
	if isFemale {
		month += 50
	}

	seq := rand.Intn(99) + 1

	return fmt.Sprintf("%s%s %02d%02d %02d%02d",
		ln[:3], fn[:1],
		year, month,
		dob.Day(), seq,
	)
}

// geocodeSelfContacts geocodes the address of all "self" contacts using AQRÉS.
func geocodeSelfContacts(db *gorm.DB) {
	var contacts []types.Contact
	db.Where("relationship_code = ? AND latitude IS NULL AND street_address != ''", "self").Find(&contacts)

	geocoded := 0
	for i, c := range contacts {
		address := geocode.BuildAddressLine(c.StreetAddress, c.City, c.Province, c.CodePostal)
		coords := geocode.Geocode(address)
		if coords != nil {
			db.Model(&contacts[i]).Updates(map[string]interface{}{
				"latitude":  coords.Latitude,
				"longitude": coords.Longitude,
			})
			geocoded++
		}
		// Rate limit: small pause between requests
		if i%10 == 9 {
			time.Sleep(100 * time.Millisecond)
		}
	}
	log.Printf("Geocoded %d/%d self contacts", geocoded, len(contacts))
}

// seedExternalSystems creates external systems and assigns external IDs to some participants.
func seedExternalSystems(db *gorm.DB) {
	cqdg := types.ExternalSystem{
		Name:    "CQDG",
		TitleFr: "Centre québécois de données génomiques",
		TitleEn: "Quebec Centre for Genomic Data",
	}
	db.Where("name = ?", cqdg.Name).FirstOrCreate(&cqdg)

	cqgc := types.ExternalSystem{
		Name:    "CQGC",
		TitleFr: "Centre québécois de génomique clinique",
		TitleEn: "Quebec Centre for Clinical Genomics",
	}
	db.Where("name = ?", cqgc.Name).FirstOrCreate(&cqgc)

	var participants []types.Participant
	db.Find(&participants)

	cqdgCount, cqgcCount := 0, 0
	for _, p := range participants {
		if rand.Float64() < 0.6 {
			db.Create(&types.ExternalID{
				ExternalSystemID: cqdg.ID,
				ParticipantID:    p.ID,
				ExternalID:       fmt.Sprintf("CQDG-%06d", rand.Intn(999999)+1),
			})
			cqdgCount++
		}
		if rand.Float64() < 0.4 {
			db.Create(&types.ExternalID{
				ExternalSystemID: cqgc.ID,
				ParticipantID:    p.ID,
				ExternalID:       fmt.Sprintf("CQGC-%06d", rand.Intn(999999)+1),
			})
			cqgcCount++
		}
	}

	log.Printf("External systems seeded: CQDG (%d IDs), CQGC (%d IDs)", cqdgCount, cqgcCount)
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
