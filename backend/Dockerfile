FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
RUN go install github.com/swaggo/swag/cmd/swag@v1.16.4
COPY . .
RUN swag init -g cmd/api/main.go --parseDependency --parseInternal
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/main ./cmd/api/
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seed ./scripts/seed/

FROM alpine:latest AS production
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/bin/main /main
ENTRYPOINT ["/main"]

FROM alpine:latest AS seed
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/bin/seed /seed
COPY --from=builder /app/scripts/seed/Consentement_RareQc.pdf /data/Consentement_RareQc.pdf
COPY --from=builder /app/scripts/seed/Consentement_RQDM.pdf /data/Consentement_RQDM.pdf
ENTRYPOINT ["/seed"]
