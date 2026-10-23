---
name: easy-cv
description: Turn plain-English body and hand movements into camera inputs with MediaPipe. Choose tracking models, define motion events or values, and wire them to the requested application behavior. Use for requests such as count each squat, detect each jump, or move my hand left to do X; users need not name CV or a model.
---

# Easy CV

Translate the player's movement into a precise, testable game input. Implement in the user's existing stack and preserve the requested gameplay. This skill supplies engineering knowledge and reusable examples; it does not call a hosted generation API or recognize arbitrary actions by name.

Keep examples limited to physical movement and requested outputs. Do not propose game ideas, themes, named-game recreations or application-specific motion sequences. The user supplies the meaning of an action; an unspecified X or Y stays a callback.

## Let people describe the movement

Treat ordinary language, physical descriptions, slang and typos as valid specifications. In a game-building request, “each time I move my hand left, do X” implies camera input even without the word camera; an explicit click/keyboard/sensor choice still wins. Read [plain-English motion routing](references/plain-english.md) for phrase examples, useful defaults and composing motions that are not in the catalog.

Explain the experience in language an 11-year-old could follow, without assuming the user's age or talking down to them. Choose the model, joints and thresholds yourself. Ask only a brief gameplay question if the intended result is genuinely ambiguous. The intended experience is **describe the movement → the agent wires the camera control into the game**. Deliver that integration, not just a recommendation to use MediaPipe. Verify it and distinguish implemented controls from physically playtested controls.

## Work from the desired experience

1. Inspect the game input boundary and identify whether the motion is a **continuous value**, **held stance**, **onset event**, **completed repetition**, or **phase-timed event**. “Squat makes X happen” needs a deliberate choice: default to one event on confirmed descent for a trigger; use a complete down/up cycle for rep counting. State that choice.
2. Write a short motion contract using [motion cookbook](references/movements.md): player count, framing, tracked joints, units, calibration, arming, trigger, release/re-arm, loss behavior, and game event. For hand/AR effects or a vague idea, use [interaction maps](references/interactions.md) to connect named observations to a visible response. Ask only if an ambiguity changes the intended experience materially; otherwise state a sensible default and build.
3. Select the minimum necessary task with [model selection](references/models.md). “Hands” does not automatically require finger tracking. Start coarse body gestures with Pose Lite; test Full or Heavy when observed errors justify it and measured latency allows it. Use Hand Landmarker for fingertips, pinch, or palm orientation.
4. Read [coordinates](references/coordinates.md) before computing features. Read only the relevant movement sections. Use the [tuning guide](references/tuning.md) to separate example thresholds from measured settings.
5. Implement acquisition → tracked features → gesture state → game adapter using [runtime integration](references/runtime.md). Keep the detector pure and the game authoritative for collisions, scoring, and multiplayer state. Use [starter code](references/starter-usage.md) where it fits; extend it instead of implying it implements every recipe.
6. Run the checks in [evaluation](references/evaluation.md). Deliver runnable code, how to launch it, the chosen model and movement rules, tests, and the remaining physical-camera evidence gap.

## Rules that prevent bad controls

- MediaPipe supplies landmark estimates, not a universal “squat” or “hand movement” classifier. Define a movement over time with known units and reset behavior.
- Do not use a single wrist-height threshold for a swing, a single head-height threshold for a squat, or arbitrary per-frame displacement for a new speed detector.
- Distinguish camera coordinates, anatomical left/right, mirrored display, and game space. Apply mirroring once. Correct aspect ratio before distances or angles.
- Use a stable body scale; freeze the standing baseline during an active action. A torso turning or the camera moving is not a deliberate gesture.
- Evaluate fresh capture samples, not render frames. Reject stale/duplicate/out-of-order samples. Clear partial gestures after loss, pause, model switch, or player reassignment; reacquisition must not create a hit.
- Use real observations for activation. Predicted/interpolated points may smooth visuals but must not independently score. Confidence policies differ between Pose and Hands; never invent missing confidence fields.
- Keep unintended actions observable: reason codes, raw and filtered features, thresholds, capture age, and phase. No camera/model failure may silently turn into fake detections. Show an error and Retry.
- Run inference during loading/calibration; only a valid, nonempty observation can unlock camera-mode play. A loaded model or empty result is not tracking. Keep countdown/scoring separate from detector readiness.
- Start with video-only camera access. Keep inference local by default. Recording/sharing is a separate, explicit action.
- Call a result physically validated only after real target-device movement testing. Synthetic landmark tests prove logic, and generated images prove appearance, neither proves camera usability.

## Routing

- Casual descriptions, physical descriptions, defaults and unfamiliar motions: [plain-English routing](references/plain-english.md).
- Squat repetitions, jump events, steps, leaning, directional hands, holds and sequences: [motion recipes](references/movements.md).
- Skeleton, coordinate systems, angles, screen collisions and AR placement: [coordinates](references/coordinates.md).
- Lite/Full/Heavy, Hands, measured upgrades/downgrades and model loading: [models](references/models.md).
- Browser/native lifecycle, multi-person identity and multiplayer: [runtime](references/runtime.md).
- Events, held states, repetitions, continuous values and input adapters: [interactions](references/interactions.md).
- Executable helper interfaces and examples: [starter usage](references/starter-usage.md).
- Calibration, threshold units and evidence boundaries: [tuning](references/tuning.md).
- Regression matrix and acceptance evidence: [evaluation](references/evaluation.md).

For a new movement, compose known features and phases, label novel thresholds as starting values, and test positive and confusable negative examples. If one camera cannot distinguish the desired action reliably, adjust the framing, use a simpler observable control, or explain the limitation rather than hiding it with predictions.
