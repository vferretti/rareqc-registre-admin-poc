package guid

import (
	"crypto/sha512"
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"

	"registre-admin/internal/types"
)

// normalize lowercases, trims, and strips accents from a string.
func normalize(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, _ := transform.String(t, s)
	return result
}

// hash concatenates parts with "|" and returns the first 64 hex chars of the SHA-512 digest.
func hash(parts ...string) string {
	h := sha512.Sum512([]byte(strings.Join(parts, "|")))
	return fmt.Sprintf("%x", h)[:64]
}

// Compute calculates the GUIDs for a participant based on identity fields.
func Compute(p *types.Participant) *types.Guid {
	firstName := normalize(p.FirstName)
	lastName := normalize(p.LastName)
	dob := p.DateOfBirth.Format("2006-01-02")

	g := &types.Guid{
		ParticipantID: p.ID,
		GuidBasic:     hash(firstName, lastName, dob),
	}

	if p.RAMQ != nil && *p.RAMQ != "" {
		v := hash(firstName, lastName, dob, normalize(*p.RAMQ))
		g.GuidRamq = &v
	}

	if p.CityOfBirth != nil && *p.CityOfBirth != "" {
		v := hash(firstName, lastName, dob, normalize(*p.CityOfBirth))
		g.GuidBirthplace = &v
	}

	return g
}
