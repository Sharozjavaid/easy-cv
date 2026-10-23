# Evaluation and acceptance

A plausible skeleton is not proof of good controls. Test the full chain from camera to the game accepting an action.

## Logic checks

For each detector, use timestamped sequences with expected events and explicit no-event windows. Include:

- stationary person, held pose, slow drift, one-frame coordinate spike;
- deliberate action once, repeated action, incomplete action, reverse direction;
- shoulder movement without wrist travel, lean without hip descent, side-step dip;
- missing/low-confidence joints, face-only view, occlusion then reacquisition;
- duplicate/backward timestamps, stale captures, long gaps, source/model/player switch;
- 15/30/60 Hz sampling of the same trajectory, including variable frame intervals;
- mirror once, portrait/landscape aspect changes, crop/letterbox mapping;
- pause mid-action, resume while crouched, camera denial, model load error, GPU failure.

One movement recipe can intentionally accept a case another rejects. Name that behavior. A phase-timed event must preserve its original capture time. A stationary hand must not activate an input after a tracking jump.

## Startup and input-mode integration checks

- Delay camera permission: show permission status, keep gameplay stopped, and do not consume a post-permission no-detection window early.
- Resolve model setup but return empty/invalid observations: no countdown, score, or play-start event. Valid observed features plus calibration must be what opens the gate.
- Keep model initialization pending after permission and visible loading: recovery still appears on its independent deadline. Verify its timing from the declared anchor.
- Choose touch mode while a model promise is pending: gameplay uses real touch controls; late model results cannot switch it back, and inference remains suspended.
- Start camera retry twice or pause during initialization: only the latest session may deliver observations, with one inference loop and no inherited partial gesture.
- Use sparse frames and no detections during a timed round: the declared timer/loss policy still reaches the expected end; start/end events fire once.
- For two-hand input, lose one hand and swap detector result order: the other hand keeps its identity; no connecting phantom path or accidental pinch release.
- If recording is implemented, verify the exported clip contains the actual game, requested camera view and HUD. A visible DOM overlay alone is not capture evidence.

These are integration checks for the generated game. This skill repository's synthetic helper tests do not exercise camera permission dialogs, a MediaPipe download, or a complete browser lifecycle.

## Recorded-camera evaluation

With permission, collect representative raw video and timestamped landmarks from target framing, lighting, distances, body sizes, handedness, and devices. Keep personal recordings local by default. Evaluate the same clips with the candidate models and detector versions; split tuning clips from holdout clips. Landmark replay isolates control logic; rerunning inference on video checks the model too. Neither replaces live end-to-end device testing.

Report:

| Metric | Definition |
| --- | --- |
| False actions/minute | Unintended game-accepted actions / minutes of labeled non-action time |
| Miss rate | Labeled intended actions with no matching accepted action / intended actions |
| Duplicate rate | Additional accepted actions for one intended action / intended actions |
| Timing error | Accepted strike capture time minus annotated target phase; give p50/p95 and direction |
| Decision latency | Decision time minus capture time, plus separately measured display response |
| Tracking loss | Duration and count of unavailable required features |
| Performance | Fresh inference Hz, inference p50/p95, end-to-end age, rendering frame-time, device/model/version |

Match events one-to-one within a declared tolerance; do not count every threshold crossing as a success. Choose acceptance budgets with the game designer. Do not invent universal pass percentages or report synthetic results as physical-camera accuracy.

## Physical acceptance

Run on an actual target webcam/phone with the real rendered game. Test standing still, intended movements, partial movements, leaving/re-entering view, and pause/resume. For remote play, test actual network latency and authoritative hit judgment. For shared-camera play, test bystanders, crossing tracks, and one player leaving.

Deliver the evidence level explicitly: implemented, logic-tested, replay-tested, browser-model-tested, physically playtested, and deployed are different claims. If the user cannot provide the physical test yet, finish the implementation and automated checks and identify that remaining acceptance step without fabricating a pass.


## Plain-English behavior checks for agents

Use these prompts in a disposable game workspace when evaluating an agent using this skill. Inspect its actual implementation and explanations; passing the helper unit tests alone does not evaluate natural-language understanding. These are review cases, not a claim that every agent has passed them.

| Prompt | Expected behavior |
| --- | --- |
| “count evry squat as a point” | Counts one complete down/up repetition and calls the requested output once |
| “every jump does X” | Implements ascent and recovery; explains framing needed to distinguish a jump |
| “move my right hand left to do Y” | Preserves anatomical hand identity and direction; one event per deliberate movement |
| “while both hands are up keep X active” | Implements a held state with exit and tracking-loss handling |
| “use the distance between my hands as Y” | Returns a calibrated continuous value; missing observations are unavailable |
| “move my hand up then right to do X” | Uses ordered phases, timeout and reset without inventing a model label |
| “click to do X, no camera” | Preserves explicit pointer input; no camera request |
| “animate someone raising a hand” | Treats this as animation unless physical input is explicitly established |

Judge completion by the intended game response, not whether the agent repeats recipe names. Technical explanations should be available for developers; player instructions should stay concrete and understandable.
