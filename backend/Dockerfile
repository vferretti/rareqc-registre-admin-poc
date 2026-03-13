FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
RUN go install github.com/swaggo/swag/cmd/swag@v1.16.4
COPY . .
RUN swag init -g cmd/api/main.go --parseDependency --parseInternal
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/main ./cmd/api/

FROM alpine:latest AS certs
RUN apk add --no-cache ca-certificates

FROM scratch
COPY --from=builder /app/bin/main /main
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
ENTRYPOINT ["/main"]
