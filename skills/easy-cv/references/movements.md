# Motion cookbook

Recipes define body observations and input events. The consuming application decides what those inputs do. Do not pair these recipes with game concepts or recreate another application's behavior.

Read [coordinates](coordinates.md) for joint indices and units, [tuning](tuning.md) for calibration and [evaluation](evaluation.md) for evidence. Numerical values are starting settings, not universal recognition thresholds. The bundled helpers cover only the interfaces in [starter usage](starter-usage.md).

## Write the input contract

```text
Instruction: count each completed squat
View: shoulders, hips, knees and ankles visible
Model: Pose Lite initially
Features: calibrated hip descent, projected knee angles
States: unknown -> standing -> down -> standing
Output: one squat-rep event on confirmed return
Reset: invalid observation, pause, session or person change
Negative cases: leaning, stepping, starting crouched, reacquisition
```

For each motion specify required observations, units, calibration, activation, event/hold/value semantics, recovery, loss behavior and output callback.

## Squat repetitions

Require observed shoulders, hips, knees and ankles for a full-body detector. Calibrate standing hip position and torso length over a stable window. Stillness alone does not establish standing: confirm near-extended knees and appropriate geometry.

Use hip descent divided by calibrated torso length together with bent knees. Confirm both descent and return for a short duration. Count once on return to standing after a confirmed low position. Holding low does not add repetitions. Starting low remains unarmed until a valid standing observation.

The reference helper starts with descent >0.18 torso lengths and projected knee angles <155 degrees, then returns below 0.08 with angles >165 degrees, confirmed for 80 ms. These are adjustable example settings requiring evaluation. Front-facing projection can obscure knee bend; do not silently accept missing leg evidence.

If a user requests only a torso-based downward motion, define that as a different input using coherent hip/shoulder descent, stable scale and lean rejection. Do not describe it as validated exercise form.

## Jump events

Track coherent upward shoulder and hip movement from a standing baseline, elapsed-time velocity and visible leg/foot evidence. Image y increases downward, so upward velocity is negative. Arm raising alone, camera tilt and ordinary body bobbing must not trigger.

Use `neutral -> rising -> event sent -> recovered`. Send once per accepted ascent and require observed landing or near-baseline recovery to re-arm. A cooldown alone cannot establish another jump. Clear partial evidence after loss.

A cropped upper-body view cannot reliably prove that feet left the floor. Label that output upward body motion or require a view with sufficient leg and floor evidence. Do not substitute a different physical motion without explaining the change.

## Steps and leaning

For a lateral step, observe hip translation in calibrated shoulder widths and speed from a short timestamped window. Require sufficient travel and speed, then re-arm on stillness or a deliberate reversal. Keep the scale stable during body rotation. One continuous movement should not become repeated events unless the request specifies a repeat distance.

For leaning, use torso angle or shoulder-to-hip horizontal offset relative to neutral. Return a bounded continuous value or a threshold event according to the request. Lean and lateral translation are different observations. Apply the chosen display-direction convention once and use hysteresis at boundaries.

## Directional hand movement

Track the selected wrist with Pose for broad movements; use Hands when fingertip or palm detail is required. Confirm direction, minimum travel and plausible speed in both body-relative and image coordinates. Shoulder movement with a stationary wrist must not count as hand travel.

Specify left/right/up/down relative to the declared camera or mirrored display space. A user's right hand means anatomical right, not whichever track appears on screen-right. Keep hand identity stable across result ordering changes.

For a single event, require neutral or a new deliberate preparation before firing again. For continuous output, return position or velocity with a declared range. Do not infer a single event per gesture from the path helper: it returns accepted segments and needs a separate event state machine.

The `createHandPathDetector` helper gates observed path segments by travel and speed. Clear history after loss, long gaps, pause or identity changes; never connect a pre-loss point to a new detection. Keep display smoothing separate from action evidence.

## Raised-hand holds

Calibrate a comfortable threshold relative to the shoulders. Enter when the required wrist or wrists remain above that threshold for a confirmation interval; exit through a separate lower threshold. Return a boolean or onset/release events as requested. Holding the pose must not emit repeated activations.

Specify whether one or both hands are required. Expire the held signal when required observations are lost. Returning to tracking while already raised should follow an explicit re-arming policy, not generate an accidental event.

## Hand separation and pinch

For separation, measure distance between two stable tracked hands in a common coordinate system. Normalize to calibrated body scale or a comfortable observed min/max range. Return a bounded scalar; missing one hand invalidates the value.

For pinch, use same-hand thumb-tip/index-tip distance normalized by palm width. Use separate close/open thresholds, identity checks and confirmation. One close/open cycle can yield one event; held pinch can instead yield a boolean. Handedness classification confidence is not pinch confidence.

## Holds and ordered sequences

A dwell requires fresh observed samples inside a defined region for the requested time; missing samples break progress. Count an entry only once until observed exit re-arms it.

Compose multiple movements with explicit phases, a bounded interval and cancellation. State whether each transition or only the complete sequence emits an event. Test reversed order, incomplete phases, unrelated movements, timeouts and reacquisition. Avoid publishing application-specific sequences as universal motion recipes.
