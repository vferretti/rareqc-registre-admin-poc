package main

import (
	"log"
	"os"
	"os/exec"
	"strings"
)

var prefixes = []string{
	"registre-admin_internal_types.",
	"registre-admin_internal_repository.",
	"internal_server.",
}

var genericReplacements = []struct{ old, new string }{
	{"PaginatedResponse-registre-admin_internal_repository_", "PaginatedResponse_"},
	{"PaginatedResponse-registre-admin_internal_types_", "PaginatedResponse_"},
}

func main() {
	cmd := exec.Command("swag", "init", "-g", "cmd/api/main.go", "--parseDependency", "--parseInternal")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatalf("Failed to run swag init: %v\nOutput: %s", err, output)
	}
	log.Println("Successfully ran swag init.")

	cleanupFile("docs/swagger.yaml")
	cleanupFile("docs/swagger.json")
}

func cleanupFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		log.Printf("Failed to read %s: %v", filePath, err)
		return
	}

	modified := string(content)

	// Clean up generic type names first (before removing prefixes)
	for _, r := range genericReplacements {
		modified = strings.ReplaceAll(modified, r.old, r.new)
	}

	// Remove package prefixes
	for _, prefix := range prefixes {
		modified = strings.ReplaceAll(modified, prefix, "")
	}

	if err := os.WriteFile(filePath, []byte(modified), 0644); err != nil {
		log.Printf("Failed to write %s: %v", filePath, err)
		return
	}

	log.Printf("Cleaned up %s", filePath)
}
