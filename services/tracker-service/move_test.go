package main

import (
	"errors"
	"testing"
)

func col(positions ...float64) []Issue {
	out := make([]Issue, len(positions))
	for i, p := range positions {
		out[i] = Issue{Key: string(rune('A' + i)), Position: p}
	}
	return out
}

func TestNewPosition(t *testing.T) {
	c := col(1024, 2048, 3072)
	tests := []struct {
		name          string
		column        []Issue
		after, before *Issue
		want          float64
	}{
		{"empty column", nil, nil, nil, 1024},
		{"no hints = bottom", c, nil, nil, 3072 + 1024},
		{"between two", c, &c[0], &c[1], 1536},
		{"after only = before the next card", c, &c[1], nil, 2560},
		{"after the last card = bottom", c, &c[2], nil, 4096},
		{"before only = after the previous card", c, nil, &c[1], 1536},
		{"before the first card = top", c, nil, &c[0], 0},
	}
	for _, tt := range tests {
		got, err := newPosition(tt.column, tt.after, tt.before)
		if err != nil || got != tt.want {
			t.Errorf("%s: got %v, %v; want %v", tt.name, got, err, tt.want)
		}
	}
}

func TestNewPositionErrors(t *testing.T) {
	c := col(1024, 2048)
	if _, err := newPosition(c, &c[1], &c[0]); err == nil || errors.Is(err, errNoRoom) {
		t.Errorf("after below before: got %v, want a validation error", err)
	}

	tight := col(1, 1+2.220446049250313e-16) // neighbours one float64 step apart
	if _, err := newPosition(tight, &tight[0], &tight[1]); !errors.Is(err, errNoRoom) {
		t.Errorf("no room: got %v, want errNoRoom", err)
	}
}

func TestBottomPosition(t *testing.T) {
	if got := bottomPosition(nil); got != 1024 {
		t.Errorf("empty: %v", got)
	}
	if got := bottomPosition(col(-5000, 2048)); got != 3072 {
		t.Errorf("max+gap: %v", got)
	}
	if got := bottomPosition(col(-5000)); got != 1024 {
		t.Errorf("never below the gap: %v", got)
	}
}
