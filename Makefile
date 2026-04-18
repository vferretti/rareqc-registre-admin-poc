.PHONY: doc generate-client-typescript generate

doc:
	@cd backend && PATH="/usr/local/go/bin:$(HOME)/go/bin:$$PATH" go run scripts/openapi/generate.go
	@echo "✅ Generated Swagger docs in ./backend/docs"

generate-client-typescript:
	@npx @openapitools/openapi-generator-cli generate \
		-i ./backend/docs/swagger.yaml \
		-g typescript-axios \
		-o ./frontend/api
	@rm -rf ./frontend/api/docs ./frontend/api/git_push.sh ./frontend/api/.gitignore ./frontend/api/.npmignore
	@for f in ./frontend/api/api.ts ./frontend/api/base.ts ./frontend/api/common.ts; do \
		sed -i '1s|^|// @ts-nocheck\n|' "$$f"; \
	done
	@echo "✅ Generated TypeScript API client in ./frontend/api"

generate: doc generate-client-typescript
