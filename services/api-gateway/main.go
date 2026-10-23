// api-gateway — the REST API in api/openapi.yaml, served by calling the
// gRPC services (proto/). The browser only ever talks to this.
//
// Env:
//
//	HTTP_ADDR     :8080
//	OPENAPI_PATH  api/openapi.yaml (requests are validated against it)
//	AUTH_ADDR     localhost:50051
//	TRACKER_ADDR  localhost:50052
//	DOCS_ADDR     localhost:50053
//	CORS_ORIGINS  http://localhost:5173,http://localhost:6006,http://localhost:8081
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	docsv1 "github.com/duck/tracking_board/gen/go/docs/v1"
	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

// requestTimeout bounds every call to a service.
const requestTimeout = 10 * time.Second

type gateway struct {
	auth    authv1.AuthServiceClient
	tracker trackerv1.TrackerServiceClient
	docs    docsv1.DocsServiceClient
}

// newApp builds the Fiber app. Split from main so tests can use fake services.
func newApp(g *gateway, spec *specValidator, corsOrigins []string) *fiber.App {
	app := fiber.New(fiber.Config{AppName: "tracking-board api-gateway", ErrorHandler: errorHandler})
	app.Use(logger.New()) // "21:05:01 | 200 | 3ms | GET /api/v1/projects"
	app.Use(cors.New(cors.Config{AllowOrigins: corsOrigins}))
	app.Get("/health", func(c fiber.Ctx) error { return c.JSON(fiber.Map{"status": "ok"}) })

	// auth → validate against the spec → handler
	api := app.Group(basePath, g.requireAuth, spec.middleware)
	g.routes(api)

	// Anything else (outside /api/v1)
	app.Use(func(c fiber.Ctx) error { return notFound("no route " + c.Method() + " " + c.Path()) })
	return app
}

func dial(addr string) *grpc.ClientConn {
	conn, err := grpc.NewClient(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithUnaryInterceptor(func(ctx context.Context, method string, req, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
			ctx, cancel := context.WithTimeout(ctx, requestTimeout)
			defer cancel()
			return invoker(ctx, method, req, reply, cc, opts...)
		}),
	)
	if err != nil {
		log.Fatalf("dial %s: %v", addr, err)
	}
	return conn
}

func main() {
	spec, err := loadSpec(svc.Env("OPENAPI_PATH", "api/openapi.yaml"))
	if err != nil {
		log.Fatal(err)
	}
	g := &gateway{
		auth:    authv1.NewAuthServiceClient(dial(svc.Env("AUTH_ADDR", "localhost:50051"))),
		tracker: trackerv1.NewTrackerServiceClient(dial(svc.Env("TRACKER_ADDR", "localhost:50052"))),
		docs:    docsv1.NewDocsServiceClient(dial(svc.Env("DOCS_ADDR", "localhost:50053"))),
	}
	origins := strings.Split(svc.Env("CORS_ORIGINS", "http://localhost:5173,http://localhost:6006,http://localhost:8081"), ",")

	app := newApp(g, spec, origins)
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		_ = app.ShutdownWithTimeout(5 * time.Second)
	}()
	if err := app.Listen(svc.Env("HTTP_ADDR", ":8080")); err != nil {
		log.Fatal(err)
	}
}
