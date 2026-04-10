package repository

import (
	"strings"

	"gorm.io/gorm"
)

// searchTerm prepares a LIKE search term from user input.
func searchTerm(input string) string {
	return "%" + strings.ToLower(input) + "%"
}

// repeatArg returns a slice of n copies of val for use as SQL placeholder args.
func repeatArg(val interface{}, n int) []interface{} {
	args := make([]interface{}, n)
	for i := range args {
		args[i] = val
	}
	return args
}

// SQL fragments for participant search (accent + case insensitive).
const (
	// matchName matches first_name, last_name, or "first last" (with unaccent).
	// Requires the table alias or empty prefix. Uses 3 args.
	matchFirstName = `LOWER(immutable_unaccent(%s.first_name)) LIKE immutable_unaccent(?)`
	matchLastName  = `LOWER(immutable_unaccent(%s.last_name)) LIKE immutable_unaccent(?)`
	matchFullName  = `LOWER(immutable_unaccent(%s.first_name || ' ' || %s.last_name)) LIKE immutable_unaccent(?)`

	// matchRAMQ matches RAMQ ignoring spaces. Uses 1 arg.
	matchRAMQ = `REPLACE(LOWER(COALESCE(%s.ramq, '')), ' ', '') LIKE REPLACE(?, ' ', '')`

	// matchID matches participant ID as text. Uses 1 arg.
	matchID = `CAST(%s.id AS TEXT) LIKE ?`

	// matchEmail / matchPhone for contact fields. Uses 1 arg each.
	matchEmail = `LOWER(%s.email) LIKE ?`
	matchPhone = `%s.phone LIKE ?`
)

// participantSearchSQL returns the WHERE clause and arg count for participant name/RAMQ/ID search.
// alias is the table alias (e.g. "p", "participant").
func participantSearchSQL(alias string) (sql string, argCount int) {
	clauses := []string{
		sprintf(matchID, alias),
		sprintf(matchFirstName, alias),
		sprintf(matchLastName, alias),
		sprintf(matchFullName, alias, alias),
		sprintf(matchRAMQ, alias),
	}
	return strings.Join(clauses, " OR "), 5
}

// contactSearchSQL returns the WHERE clause and arg count for contact name/email/phone search.
// alias is the table alias (e.g. "c", "contact").
func contactSearchSQL(alias string) (sql string, argCount int) {
	clauses := []string{
		sprintf(matchFirstName, alias),
		sprintf(matchLastName, alias),
		sprintf(matchFullName, alias, alias),
		sprintf(matchEmail, alias),
		sprintf(matchPhone, alias),
	}
	return strings.Join(clauses, " OR "), 5
}

// Reusable JOIN clauses.
const (
	joinConsentClause  = "JOIN consent_clause ON consent.clause_id = consent_clause.id"
	joinExternalSystem = "JOIN external_system ON external_system.id = external_id.external_system_id"
)

// WithListSearch filters participants by a search term across participant fields, contacts, and external IDs.
func WithListSearch(search string) func(*gorm.DB) *gorm.DB {
	return func(tx *gorm.DB) *gorm.DB {
		term := searchTerm(search)
		pSQL, pN := participantSearchSQL("p")
		cSQL, cN := contactSearchSQL("c")
		return tx.Where(
			`id IN (
				SELECT p.id FROM participant p WHERE `+pSQL+`
				UNION
				SELECT c.participant_id FROM contact c WHERE `+cSQL+`
				UNION
				SELECT e.participant_id FROM external_id e WHERE LOWER(e.external_id) LIKE ?
			)`,
			repeatArg(term, pN+cN+1)...,
		)
	}
}

// WithConsentFilter filters participants who have a consent of the given clause type with one of the given statuses.
func WithConsentFilter(clauseType string, statuses []string) func(*gorm.DB) *gorm.DB {
	return func(tx *gorm.DB) *gorm.DB {
		return tx.Where(
			`id IN (SELECT c.participant_id FROM consent c
				JOIN consent_clause cc ON c.clause_id = cc.id
				WHERE cc.clause_type_code = ? AND c.status_code IN ?)`,
			clauseType, statuses,
		)
	}
}

// WithExternalSystemFilter filters participants who have an external ID in one of the given systems.
func WithExternalSystemFilter(systems []string) func(*gorm.DB) *gorm.DB {
	return func(tx *gorm.DB) *gorm.DB {
		return tx.Where(
			`id IN (SELECT e.participant_id FROM external_id e
				JOIN external_system es ON e.external_system_id = es.id
				WHERE es.name IN ?)`,
			systems,
		)
	}
}

// sprintf is a simple formatter that replaces %s with args.
func sprintf(format string, args ...string) string {
	result := format
	for _, arg := range args {
		result = strings.Replace(result, "%s", arg, 1)
	}
	return result
}
