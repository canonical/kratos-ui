package web

import (
	"io/fs"
	"net/http"

	ih "github.com/canonical/identity_platform_login_ui/internal/hydra"
	ik "github.com/canonical/identity_platform_login_ui/internal/kratos"
	"github.com/canonical/identity_platform_login_ui/internal/logging"
	"github.com/canonical/identity_platform_login_ui/internal/monitoring"
	chi "github.com/go-chi/chi/v5"
	middleware "github.com/go-chi/chi/v5/middleware"
	trace "go.opentelemetry.io/otel/trace"

	"github.com/canonical/identity_platform_login_ui/pkg/extra"
	"github.com/canonical/identity_platform_login_ui/pkg/kratos"
	"github.com/canonical/identity_platform_login_ui/pkg/metrics"
	"github.com/canonical/identity_platform_login_ui/pkg/status"
	"github.com/canonical/identity_platform_login_ui/pkg/ui"
)

func NewRouter(kratosClient *ik.Client, hydraClient *ih.Client, distFS fs.FS, tracer trace.Tracer, monitor monitoring.MonitorInterface, logger logging.LoggerInterface) http.Handler {
	router := chi.NewMux()

	middlewares := make(chi.Middlewares, 0)
	middlewares = append(
		middlewares,
		middleware.RequestID,
		monitoring.NewMiddleware(monitor, logger).ResponseTime(),
	)

	// TODO @shipperizer add a proper configuration to enable http logger middleware as it's expensive
	if true {
		middlewares = append(
			middlewares,
			middleware.RequestLogger(logging.NewLogFormatter(logger)), // LogFormatter will only work if logger is set to DEBUG level
		)
	}

	router.Use(middlewares...)

	kratos.NewAPI(kratosClient, hydraClient, logger).RegisterEndpoints(router)
	extra.NewAPI(kratosClient, hydraClient, logger).RegisterEndpoints(router)
	status.NewAPI(tracer, monitor, logger).RegisterEndpoints(router)
	ui.NewAPI(distFS, logger).RegisterEndpoints(router)
	metrics.NewAPI(logger).RegisterEndpoints(router)

	return router
}
