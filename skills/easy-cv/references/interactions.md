# Mapping motion to application inputs

Keep the movement detector independent from the behavior it controls. Use the user's existing callback, dispatcher or input interface. If the requested output is unspecified, expose a callback rather than inventing an application concept.

| Requested output | Contract | Loss behavior |
| --- | --- | --- |
| “Each time I do this, do X” | One event with sequence number and capture timestamp | Cancel partial evidence; reacquisition must not create X |
| “While I hold this, keep X active” | Boolean or start/end events with an expiry | Expire or explicitly cancel the held state |
| “Use this movement as a value” | Scalar/vector with declared units and range | Mark unavailable; never treat missing as a measured zero |
| “Count each complete motion” | One event after all required phases | Discard incomplete repetition |
| “When I move through this region, do Y” | Path-region intersection with entry/re-entry semantics | Clear path history to prevent a bridging segment |

## Define the adapter

Specify body part, observation validity, coordinate space, input semantics, output destination and reset policy. Example: “Observe the right wrist. After confirmed leftward travel, call `onMotion({type:'hand-left', capturedAtMs, sequence})` once. Require a new preparation before another event.”

Separate accepted-input feedback from raw tracking feedback. A cursor can show observed position continuously, while event feedback follows accepted events. Log rejection reasons for tuning. Do not add themed effects, extra mechanics or unrelated visual features.

## Continuous values

For two-hand position, use the midpoint in a shared coordinate space. Separation is a scalar; direction is `(B-A)/length`. Below a small separation threshold, direction is undefined: return unavailable for control purposes. Never divide by zero or promote a retained visual direction to a new observation.

Use time-based filtering where needed: `alpha = 1 - exp(-rate * dtSeconds)`. Measure the delay it introduces. Display interpolation and extrapolation may smooth feedback but must not independently trigger events.

## Path intersections

Map both the observed hand path and the requested region into the same space. Segment tests prevent fast movement from skipping a region between samples. Define whether Y occurs once per entry, once per region identifier or for every accepted segment. Keep target motion synchronized to capture timestamps.

## Integration boundaries

Preserve the host's framework, renderer and input architecture. Tracking overlays can use the existing display surface. If recording is explicitly requested, compose the requested views before capture; a canvas stream does not automatically include separate DOM layers. Recording and sharing remain separate user choices.
