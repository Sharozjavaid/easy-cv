# Runtime and game integration

## Separate responsibilities

```text
camera -> fresh frames -> local model -> player/hand association
       -> validity + calibrated features -> gesture state machine
       -> action adapter -> existing game rules
```

The AI coding agent writes this integration at build time. It is not needed to interpret every frame during play. Model inference can stay on the player's device; no per-frame hosted API call is required.

Keep detector code independent of DOM, networking, audio, and the game engine. Emit explicit input values:

```js
{
  type: 'hand-left',    // or squat-rep, jump, hold-start, hold-end
  playerId: 'player-1',
  sequence: 17,        // monotonically increasing within a session
  capturedAtMs: 1234,  // original input timestamp, local session clock
  decidedAtMs: 1280,
  strength: 0.7,
  direction: {x: -1, y: 0},
  source: 'camera'
}
```

Continuous values and leased held-state signals are not repeated scoring events. The game owns whether an action is allowed during setup, pause, recovery, impact, or results. Reject duplicate sequences at the adapter. A Unity WebGL bridge can call a narrow C# input method; a JavaScript game can call its existing input dispatcher. For an external binary/emulator, inspect whether an authorized input adapter exists before promising full control. An arbitrary URL does not give code access.

## Browser lifecycle

1. Use a visible Enable camera action, `getUserMedia({video: ..., audio:false})`, and HTTPS or localhost. Explain framing and show a useful preview. Model loading and permissions have separate visible states and Retry paths.
2. Pin SDK/WASM versions and download only needed model assets. Model initialization is outside the frame loop. Use a worker where supported; retain a CPU fallback and surface failure.
3. Schedule from fresh video frames (`requestVideoFrameCallback` when available, otherwise compare video time). Do not infer every render frame on the same image. Share one inference result between control logic, overlays and diagnostics; never infer again just to draw the skeleton. Bound work to one in-flight inference and drop excess frames; do not build a queue that adds latency.
4. Carry `generation`, `requestId`, capture timestamp, frame dimensions, and player identity through worker replies. Discard results from an earlier camera/model session, out-of-order results, or overly old captures. Close transferred image bitmaps in all success/error paths.
5. On pause, document hidden, camera loss, model switch, rotation, or player change: stop action delivery, reset gesture histories, and clear held-state leases. Cancel pending callbacks; discard their replies even if they finish later.
6. On resume: obtain fresh frames, confirm the tracked player, re-establish neutral/calibration if necessary, and only then arm gestures. Stop tracks and close the task on teardown. Retry must clean up prior resources, not start a second inference loop.

Use a single timestamp convention. Browser frame metadata `captureTime` (when available) and `performance.now()` are monotonic-clock values; `mediaTime`/`video.currentTime` are timeline seconds. Do not subtract them without a documented mapping. If true capture time is unavailable, label the timestamp as frame-observation time, and do not claim it measures camera latency. For recordings, timeline milliseconds are fine, but “now” must be on the same timeline.

Filtering may reduce jitter but adds delay. Compute gesture signals on a measured low-latency feature filter; smooth display skeletons separately. Keep rejected observations out of activation logic. A drawn skeleton is not evidence that a frame was accepted.

## Readiness, recovery, and game clocks

The pipeline must make progress before play: run inference and consume results during loading/calibration. Gating inference behind `state === 'playing'` deadlocks a game that needs tracking to become ready. A resolved inference call, truthy result object, or `{landmarks: []}` is not readiness. Require a nonempty observation with the landmarks the mechanic needs, finite coordinates, and the task's available confidence checks; complete any required neutral/calibration step before countdown. Model-ready, player-observed, calibrated, and playing are separate states.

Treat camera permission waiting, explicit permission/model failure, and prolonged no-detection as separate cases. Show modality-specific status immediately. A bounded no-detection recovery timer must be checked independently of awaited setup promises. For example, offer recovery after 12 seconds from the **later** of successful video-only permission and the first visibly rendered loading state. Permission-wait time does not consume it. Once both exist, start that clock without waiting for `video.play()`, imports, model creation, or detection. The exact duration is product tuning, not a universal CV constant. Explicit failures can show an error and Retry immediately.

Recovery offers a real, labeled touch/pointer mode only if that mode is implemented, plus Retry where appropriate. Never silently switch control source. After an explicit fallback choice, stop camera inference before the next detector call, invalidate outstanding results, and clear motion state. Only an explicit retry may reactivate camera mode. A pending model initialization that finishes after fallback cannot change the mode or create a second loop. Keep permission/recovery buttons accessible as semantic controls.

Compute countdown and round deadlines from monotonic timestamps, accounting explicitly for paused duration if the design pauses. Clamp physics integration separately; accumulating clamped render deltas can make a nominally timed round last indefinitely at low frame rates. Check the deadline even when there are no detections or accepted inputs. Emit round-start/end once from central transitions. In multi-round games, every win/loss/draw/timeout advances the round counter once; a per-round reset must not reset the match counter.

## Identity and confidence

`poses[0]` and `hands[0]` are not stable person IDs. Lock to a calibrated person using position/scale continuity. For two players, enroll left/right slots once, then associate tracks by continuity and reject ambiguous assignments. A crossing bystander must not inherit an armed gesture. Losing one player should not fire or erase the other's action.

Pose required joints need finite coordinates and documented visibility/presence gates. If the selected adapter promises a confidence field and it is missing, fail closed. A task that does not output per-landmark visibility (such as typical Hand results) needs a different validity contract: valid task result, bounds, continuity, geometry, and task-level tracking settings. Never set all hand confidences to 1 just to satisfy a Pose validator. Handedness confidence says left/right, not that motion is correct.

Default to conservative activation after loss. Continuity logic must have explicit age, identity and confidence limits backed by evaluation. Keep visual prediction separate from action evidence.

## Multiplayer and latency

For remote players, detect locally and send compact input events through the game's existing multiplayer transport. Camera video is not required for synchronization. Remote clocks are not directly comparable; translate to session/server time, include sequence numbers, bound compensation, and let the authoritative game adjudicate hits. Client landmark events are not cheat-proof evidence. A shared-camera two-player game instead needs robust local person association.

## Native adapters

Use the same **feature and event contract**, but platform-specific capture/model lifecycle. Rotate input upright before inference, preserve frame dimensions, and retain confidence fields. GPU creation/inference/disposal should stay on the required owning execution context; serialize frames and drop excess work. Native and browser frame rates can differ, so use elapsed-time features for new controls. Keep sampling rate and aspect conventions explicit when comparing implementations.

Native installation and device tests are separate from a browser prototype. Do not claim native parity because both platforms use the same landmark names.
