package main

import (
	"errors"
	"log"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// apiError is an error the gateway answers itself (before or instead of a
// service call). It becomes the spec's body: { "error": { "code", "message" } }.
type apiError struct {
	status  int
	code    string
	message string
}

func (e *apiError) Error() string { return e.message }

func badRequest(msg string) error { return &apiError{http.StatusBadRequest, "VALIDATION_FAILED", msg} }
func notFound(msg string) error   { return &apiError{http.StatusNotFound, "NOT_FOUND", msg} }
func unauthenticated(msg string) error {
	return &apiError{http.StatusUnauthorized, "UNAUTHENTICATED", msg}
}

// grpcToHTTP is the table from docs/AGREEMENTS.md. Anything else → 500 INTERNAL.
var grpcToHTTP = map[codes.Code]struct {
	status int
	code   string
}{
	codes.InvalidArgument:  {http.StatusBadRequest, "VALIDATION_FAILED"},
	codes.Unauthenticated:  {http.StatusUnauthorized, "UNAUTHENTICATED"},
	codes.PermissionDenied: {http.StatusForbidden, "PERMISSION_DENIED"},
	codes.NotFound:         {http.StatusNotFound, "NOT_FOUND"},
	codes.AlreadyExists:    {http.StatusConflict, "ALREADY_EXISTS"},
}

// toAPIError turns any error a handler returns into an apiError.
func toAPIError(err error) *apiError {
	var apiErr *apiError
	if errors.As(err, &apiErr) {
		return apiErr
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		switch fiberErr.Code {
		case http.StatusNotFound, http.StatusMethodNotAllowed:
			// The spec says an unknown path OR method is a plain 404 (no 405).
			return &apiError{http.StatusNotFound, "NOT_FOUND", "no such endpoint"}
		case http.StatusBadRequest, http.StatusRequestEntityTooLarge, http.StatusUnsupportedMediaType:
			return &apiError{http.StatusBadRequest, "VALIDATION_FAILED", fiberErr.Message}
		}
	}

	if st, ok := status.FromError(err); ok {
		if mapped, ok := grpcToHTTP[st.Code()]; ok {
			return &apiError{mapped.status, mapped.code, st.Message()}
		}
	}

	// A service is down, a bug, … — log the details, don't send them to the client.
	log.Printf("internal error: %v", err)
	return &apiError{http.StatusInternalServerError, "INTERNAL", "internal error"}
}

// errorHandler is Fiber's ErrorHandler: every error ends up as the spec's error body.
func errorHandler(c fiber.Ctx, err error) error {
	e := toAPIError(err)
	return c.Status(e.status).JSON(fiber.Map{"error": fiber.Map{"code": e.code, "message": e.message}})
}
