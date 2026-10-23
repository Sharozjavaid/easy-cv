# Using the reference modules

Copy the three files from `assets/` into your game's source tree. They are small ES modules, not a complete camera application. Build the camera lifecycle and input adapter described in [runtime](runtime.md). The skill contains recipes for more movements than these helpers implement.

## Load a task

```js
import * as vision from '@mediapipe/tasks-vision';
import {chooseModel, loadLandmarker} from './model-loader.mjs';

const selection = chooseModel({needsFingers:false}); // pose / lite initially
const tracker = await loadLandmarker({
  vision,
  wasmRoot: './vendor/vision/wasm', // matching your pinned SDK package
  modelUrl: './models/pose_landmarker_lite.task', // your versioned asset manifest
  selection,
  numTracks: 1,
});
// On a fresh video frame, on your chosen inference execution context:
const result = tracker.landmarker.detectForVideo(frame, capturedAtMs);
// On teardown, on that same owning context:
tracker.close();
```

The paths are integration examples, not bundled files. Obtain the selected bundle from official sources linked in [models](models.md). Choose the matching model path when selecting another variant; `loadLandmarker` cannot inspect a URL to verify its contents. GPU initialization failure falls back to CPU; inference errors later need explicit lifecycle handling. Never call the synchronous inference loop directly on every animation frame without measuring its effect.

With actual measurements, supply rows from the same device, clips and detector version:

```js
const selection = chooseModel({
  needsFingers:false,
  benchmarks: measuredRows,
  inferenceBudgetMs:25,
  actionAgeBudgetMs:150,
  maxMissRate:.10,
  maxFalseActionsPerMinute:.10,
});
```

Each row is `{task, variant, inferenceP95Ms, actionAgeP95Ms, missRate, falseActionsPerMinute}`. Rates use fractions for misses (0..1) and counts/minute for false actions. These example budgets are adjustable targets, not proven performance. The function chooses the smallest acceptable variant, not necessarily the fastest row. An explicit empty array or no passing row throws; omitted measurements return an unbenchmarked initial choice. Pose and Hands are separate choices; a combined pipeline needs its own measured budget and association logic.

## Squat → action

```js
import {measureSquat} from './motion-core.mjs';
import {createSquatDetector} from './detectors.mjs';

// Collect a stable upright calibration window first; choose a representative
// sample or aggregate validated features. Do not calibrate from a crouch.
const baseline = measureSquat(uprightLandmarks, videoWidth, videoHeight);
const squat = createSquatDetector({baseline});
const state = squat.update({
  landmarks, width:videoWidth, height:videoHeight,
  capturedAtMs, nowMs, key:`${sessionGeneration}:${playerId}`,
});
for (const event of state.events) {
  if (event === 'squat-rep') onPoint();
}
if (state.phase === 'unknown') onTrackingUnavailable();
```

Only wire the events your game needs. `squat-release` and `squat-rep` occur together on return to standing: do not map both to the same score increment. The example requires all leg joints and explicit Pose visibility; it intentionally has no torso fallback. It starts unarmed and needs a confirmed upright observation even when a baseline is supplied. Long loss, invalid points, timestamp errors, and a new key clear progress. Call `reset()` on pause/loss immediately; do not wait for a future frame to cancel partial progress. Changing camera orientation or baseline requires a new detector.

## Hand path → callback

```js
import {createHandPathDetector} from './detectors.mjs';
const handPath = createHandPathDetector({scale:calibratedShoulderWidth});
// One instance per stable hand identity. Point, anchor and scale use
// the same aspect-corrected camera space.
const {segment} = handPath.update({
  point:observedWrist, anchor:observedShoulderCenter,
  observed:requiredJointsValid,
  capturedAtMs, nowMs, key:`${sessionGeneration}:${playerId}:${handId}`,
});
if (segment) onHandPath(segment);
```

The helper returns active path segments, not one event per gesture. Add an explicit preparation/activation/recovery state machine for a request such as “move left once to do X.” The callback defines the response; no application behavior is bundled.

The gate requires minimum observed travel and speed. It does not retroactively emit warmup segments. Set `observed` only after confidence, identity and freshness checks. Reset on disappearance or pause. The helper cannot determine whether caller-supplied points are real camera observations.

For screen mapping, use the same cover/contain/mirror transform as the camera. `toCanvas` accepts raw normalized points; the path helper accepts aspect-corrected points. Convert x back with `x * videoHeight/videoWidth` before using `toCanvas`, or map raw observations first and supply a matching pixel scale. Never mix spaces.

## Extending safely

Implement additional recipes as pure state machines with the same timestamp and reset contract. Include tests for both the desired action and the closest confusing movement. A sequence detector should specify whether it emits each phase or only the completed sequence. A `squat` signal should specify whether it is a depth value, onset, held state or rep. The names alone are insufficient.
