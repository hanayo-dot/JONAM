FROM golang:1.20-alpine AS builder
WORKDIR /src/api
COPY api/go.mod ./
COPY api/*.go ./
RUN go build -o /kijani-api .

FROM alpine:3.18
WORKDIR /app
COPY --from=builder /kijani-api /app/kijani-api
COPY frontend /app/frontend
EXPOSE 8080
CMD ["/app/kijani-api"]
