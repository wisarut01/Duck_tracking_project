package svc

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsLoginRejected(t *testing.T) {
	for err, want := range map[error]bool{
		&pgconn.PgError{Code: "28P01"}: true,
		errors.New(`server error: FATAL: (ECIRCUITBREAKER) too many authentication failures (SQLSTATE XX000)`): true,
		errors.New(`FATAL: password authentication failed for user "postgres"`):                                true,
		errors.New("dial tcp 127.0.0.1:5432: connect: connection refused"):                                     false,
	} {
		if got := isLoginRejected(err); got != want {
			t.Errorf("isLoginRejected(%v) = %v, want %v", err, got, want)
		}
	}
}
