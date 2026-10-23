package main

import (
	"errors"
	"fmt"
	"math"
)

// errNoRoom means two neighbours are so close that float64 has no number
// between them. The caller renumbers the column and tries again.
var errNoRoom = errors.New("no room between the neighbours")

// positionGap is the space between cards when they are added at the top or
// bottom of a column, so there is room to drop cards in between later.
const positionGap = 1024

// newPosition works out where a dragged card lands ("fractional positions"):
// halfway between its new neighbours, so no other card has to be renumbered.
//
// column is the target column top → bottom WITHOUT the moved card. after is the
// card that will be above it, before the card below it; either may be nil.
// If only one is given, the other neighbour is simply the next card in the
// column. Neither = bottom of the column.
func newPosition(column []Issue, after, before *Issue) (float64, error) {
	upper, lower := after, before
	if upper != nil && lower == nil {
		for i := range column {
			if column[i].Position > upper.Position {
				lower = &column[i]
				break
			}
		}
	}
	if lower != nil && upper == nil {
		for i := len(column) - 1; i >= 0; i-- {
			if column[i].Position < lower.Position {
				upper = &column[i]
				break
			}
		}
	}
	if upper == nil && lower == nil && len(column) > 0 {
		upper = &column[len(column)-1]
	}

	switch {
	case upper != nil && lower != nil:
		if upper.Position >= lower.Position {
			return 0, fmt.Errorf("afterKey must be above beforeKey")
		}
		mid := (upper.Position + lower.Position) / 2
		// After ~50 drops into the same gap, float64 runs out of room.
		if mid <= upper.Position || mid >= lower.Position {
			return 0, errNoRoom
		}
		return mid, nil
	case upper != nil:
		return upper.Position + positionGap, nil // bottom of column
	case lower != nil:
		return lower.Position - positionGap, nil // top of column (negative numbers are fine)
	default:
		return positionGap, nil // empty column
	}
}

// bottomPosition is the position for a new card at the bottom of a column.
// It never goes below positionGap, same as the mock.
func bottomPosition(column []Issue) float64 {
	highest := 0.0
	for _, i := range column {
		highest = math.Max(highest, i.Position)
	}
	return highest + positionGap
}
