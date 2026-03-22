// Package geocode provides address geocoding via the Adresses Québec (AQRÉS) API.
// This package is self-contained — removing it has no impact on the rest of the application.
// Future ETL processes can use Geocode() to batch-geocode addresses.
package geocode

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

const aqresBase = "https://servicescarto.mern.gouv.qc.ca/pes/rest/services/Territoire/AdressesQuebec_Geocodage/GeocodeServer"

// Coordinates holds a latitude/longitude pair.
type Coordinates struct {
	Latitude  float64
	Longitude float64
}

type aqresResponse struct {
	Candidates []struct {
		Location struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"location"`
	} `json:"candidates"`
}

// Geocode resolves a single-line address to lat/lng coordinates using AQRÉS.
// Returns nil if the address cannot be resolved (no error — geocoding is best-effort).
func Geocode(address string) *Coordinates {
	if address == "" {
		return nil
	}

	params := url.Values{
		"SingleLine":   {address},
		"f":            {"json"},
		"maxLocations": {"1"},
		"outSR":        {"4326"},
	}

	resp, err := http.Get(fmt.Sprintf("%s/findAddressCandidates?%s", aqresBase, params.Encode()))
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var data aqresResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil
	}

	if len(data.Candidates) == 0 {
		return nil
	}

	return &Coordinates{
		Latitude:  data.Candidates[0].Location.Y,
		Longitude: data.Candidates[0].Location.X,
	}
}

// BuildAddressLine constructs a single-line address from components for geocoding.
func BuildAddressLine(street, city, province, postalCode string) string {
	parts := []string{}
	if street != "" {
		parts = append(parts, street)
	}
	if city != "" {
		parts = append(parts, city)
	}
	if province != "" {
		parts = append(parts, province)
	}
	if postalCode != "" {
		parts = append(parts, postalCode)
	}
	line := ""
	for i, p := range parts {
		if i > 0 {
			line += ", "
		}
		line += p
	}
	return line
}
