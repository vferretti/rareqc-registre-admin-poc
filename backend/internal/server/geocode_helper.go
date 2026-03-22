package server

import (
	"registre-admin/internal/geocode"
	"registre-admin/internal/types"
)

// geocodeContact sets latitude/longitude on a contact based on its address.
// If the request already provides coordinates (from frontend AQRÉS lookup), those are used.
// Otherwise, the backend geocodes the address via AQRÉS (useful for ETL imports).
// This function is best-effort — it never fails, coordinates are simply left nil.
func geocodeContact(contact *types.Contact, reqLat, reqLng *float64) {
	// Use frontend-provided coordinates if available
	if reqLat != nil && reqLng != nil {
		contact.Latitude = reqLat
		contact.Longitude = reqLng
		return
	}

	// Fallback: geocode from address components
	address := geocode.BuildAddressLine(
		contact.StreetAddress,
		contact.City,
		contact.Province,
		contact.CodePostal,
	)
	if coords := geocode.Geocode(address); coords != nil {
		contact.Latitude = &coords.Latitude
		contact.Longitude = &coords.Longitude
	}
}
