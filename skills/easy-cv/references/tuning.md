# Calibration, tuning and evidence

Treat each motion recipe as a design to implement and evaluate. The included code provides geometry helpers, a strict squat state machine, a gated hand path and model-loading utilities. A recipe without an executable helper needs its own detector and adapter. Neither recipe text nor synthetic tests prove physical-camera accuracy.

## Give every threshold a meaning

Record the feature, coordinate space, unit, baseline, entry/exit values, confirmation time, reset condition and evidence behind a setting. For example:

| Setting | Meaning | Evidence to collect |
| --- | --- | --- |
| Hip descent / standing torso length | Downward movement relative to a frozen neutral baseline | Deliberate crouch, lean, step and camera movement |
| Projected knee angle | Angle in an aspect-corrected image; not a clinical joint measurement | Front/diagonal views with knees and ankles visible |
| Wrist travel / calibrated shoulder width | Movement relative to a stable body scale | Intended sweep, stationary wrist with moving shoulder, torso turn |
| Wrist speed in widths/second | Travel divided by capture-time interval | Slow reset, quick strike, frame gaps and coordinate spikes |
| Confirmation time in milliseconds | Duration of valid evidence required to accept a state | Brief jitter versus a deliberate hold |

Never interchange normalized image y, torso lengths, shoulder widths, angle degrees or fractions of a calibrated range. A threshold of 0.2 is meaningless without its unit. Use elapsed time for speed and confirmation; a per-frame displacement threshold changes behavior with frame rate.

## Calibrate what the control needs

1. Ask for a neutral pose with the required joints visible. Check pose geometry as well as stillness; a motionless crouch is not necessarily standing.
2. Estimate body scale over a stable window. Freeze the baseline during an active gesture so motion does not redefine its own threshold.
3. When useful, sample a comfortable motion range. Keep the instructions concrete: “Stand tall,” “Bend a little,” or “Show both hands.”
4. Use separate enter and exit thresholds plus observed recovery to re-arm. A cooldown alone does not establish a new action.
5. On loss, pause, camera movement or player replacement, cancel partial gestures and re-establish a valid neutral state as needed.

A torso-only crouch and a full-body squat have different evidence requirements. Make the chosen mode explicit; hidden knees cannot satisfy a knee-angle check. When geometry is ambiguous, change framing or choose a simpler observable control.

## Tune with positive and negative examples

Start from a labeled example value, then compare intended actions with confusable movement on the same devices and camera views. Keep tuning recordings separate from holdout evaluation. Measure false actions, misses, duplicates and latency together; increasing sensitivity can improve one while worsening another. See [evaluation](evaluation.md) for the full procedure.

Record the selected model and version, framing, feature units, settings and evidence level alongside an implementation. Use clear labels such as experimental, logic-tested, replay-tested or physically playtested. Do not describe a proposed recipe as proven just because its state machine looks plausible.
