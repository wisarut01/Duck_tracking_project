package main

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"os"
	"regexp"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
)

const basePath = "/api/v1"

// Paths (under /api/v1) that need no token — `security: []` in the spec.
var publicPaths = map[string]bool{"/auth/register": true, "/auth/login": true}

// requireAuth checks "Authorization: Bearer <token>" with auth-service and
// stores the user for the handlers (see currentUser). It runs before request
// validation, so a request without a token gets 401 even if its body is wrong.
func (g *gateway) requireAuth(c fiber.Ctx) error {
	if publicPaths[strings.TrimPrefix(c.Path(), basePath)] {
		return c.Next()
	}
	scheme, token, _ := strings.Cut(c.Get(fiber.HeaderAuthorization), " ")
	if !strings.EqualFold(scheme, "bearer") || token == "" {
		return unauthenticated("missing Bearer token")
	}
	resp, err := g.auth.ValidateToken(c.Context(), &authv1.ValidateTokenRequest{AccessToken: token})
	if err != nil {
		return err // Unauthenticated → 401
	}
	c.Locals(userKey{}, resp.GetUser())
	return c.Next()
}

type userKey struct{}

func currentUser(c fiber.Ctx) *authv1.User {
	user, _ := c.Locals(userKey{}).(*authv1.User)
	return user
}

// specValidator checks every request against api/openapi.yaml (path, query,
// body, formats, `pattern: '\S'`, …) so bad input never reaches a service.
type specValidator struct {
	router routers.Router
}

func loadSpec(path string) (*specValidator, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	doc, err := openapi3.NewLoader().LoadFromData(data)
	if err != nil {
		return nil, fmt.Errorf("load %s: %w", path, err)
	}
	if err := doc.Validate(context.Background()); err != nil {
		return nil, fmt.Errorf("invalid spec %s: %w", path, err)
	}
	// The spec lists the mock and the gateway as servers with full URLs;
	// match on the path only, whatever host the request came in on.
	doc.Servers = openapi3.Servers{{URL: basePath}}
	router, err := gorillamux.NewRouter(doc)
	if err != nil {
		return nil, err
	}
	return &specValidator{router: router}, nil
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$`)

func init() {
	// kin-openapi only checks formats it has been told about.
	openapi3.DefineStringFormatCallback("uuid", func(s string) error {
		if !uuidPattern.MatchString(s) {
			return errors.New("must be a UUID")
		}
		return nil
	})
	openapi3.DefineStringFormatCallback("email", func(s string) error {
		if addr, err := mail.ParseAddress(s); err != nil || addr.Address != s {
			return errors.New("must be an email address")
		}
		return nil
	})
}

func (v *specValidator) middleware(c fiber.Ctx) error {
	req, err := adaptor.ConvertRequest(c, false)
	if err != nil {
		return badRequest(err.Error())
	}
	route, pathParams, err := v.router.FindRoute(req)
	if err != nil {
		// Unknown path, or a method the path doesn't have → 404 (never 405).
		return notFound(fmt.Sprintf("no route %s %s", c.Method(), c.Path()))
	}

	// Like the mock: query parameters the spec doesn't list are an error.
	allowed := map[string]bool{}
	for _, params := range []openapi3.Parameters{route.PathItem.Parameters, route.Operation.Parameters} {
		for _, p := range params {
			if p.Value != nil && p.Value.In == openapi3.ParameterInQuery {
				allowed[p.Value.Name] = true
			}
		}
	}
	for name := range req.URL.Query() {
		if !allowed[name] {
			return badRequest(fmt.Sprintf("query parameter %q is not allowed", name))
		}
	}

	err = openapi3filter.ValidateRequest(c.Context(), &openapi3filter.RequestValidationInput{
		Request:    req,
		PathParams: pathParams,
		Route:      route,
		Options:    &openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc},
	})
	if err != nil {
		return badRequest(validationMessage(err))
	}
	return c.Next()
}

// validationMessage turns kin-openapi's long error into something short,
// e.g. "request body: title must not be blank".
func validationMessage(err error) string {
	var reqErr *openapi3filter.RequestError
	if !errors.As(err, &reqErr) {
		return err.Error()
	}
	where := "request body"
	if reqErr.Parameter != nil {
		where = fmt.Sprintf("%s parameter %q", reqErr.Parameter.In, reqErr.Parameter.Name)
	}

	var schemaErr *openapi3.SchemaError
	if errors.As(reqErr.Err, &schemaErr) {
		reason := schemaErr.Reason
		if strings.Contains(reason, `"\S"`) {
			reason = "must not be blank" // pattern '\S' is the spec's "not blank" rule
		}
		if field := strings.Join(schemaErr.JSONPointer(), "."); field != "" && reqErr.Parameter == nil {
			return fmt.Sprintf("%s: %s: %s", where, field, reason)
		}
		return fmt.Sprintf("%s: %s", where, reason)
	}
	if reqErr.Err != nil {
		return fmt.Sprintf("%s: %v", where, reqErr.Err)
	}
	return fmt.Sprintf("%s: %s", where, reqErr.Reason)
}
