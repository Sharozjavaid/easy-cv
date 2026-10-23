# Model choice and loading

MediaPipe Tasks is a local inference library. An agent can generate its integration without calling a hosted vision API. Choose the task by the **observable information required**, then the model variant by measured quality and latency.

| Request | First candidate | When to change |
| --- | --- | --- |
| Squat, lateral step, jump, raised-hand hold | Pose Lite | Compare Full if relevant joints are unstable despite good framing |
| Directional hand movement | Pose Lite wrists | Hands if finger/palm position is actually necessary |
| Pinch, fingertip cursor, palm orientation | Hand Landmarker | Add Pose only for torso-relative motion, body actions, or player association |
| Fast arm movement | Pose Lite for arm trajectory | Compare Full; add Hands for detailed finger observations only if its benefit survives fast-motion testing |
| Precise body-pose matching | Compare Pose Lite and Full | Heavy is a candidate only if measured quality improves within the device budget |

The official [Pose model list](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) exposes Lite, Full, and Heavy bundles. [Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) has a separate bundle; do not invent corresponding Lite/Heavy hand URLs. A static Gesture Recognizer label such as a fist is not a detector for motion over time.

## Make selection evidence-based

Begin with one task and one person unless gameplay requires more. Person count is not hand count: for either-hand input or a two-hand measurement using Hand Landmarker, explicitly request two hands (`numTracks: 2` in the helper). A single Pose already provides both wrists. Warm up the model, then measure fresh-frame throughput, inference p50/p95, end-to-end capture-to-action latency, idle false actions, misses, and tracking-loss time on identical clips and hardware. Rendering and inference compete for device resources.

Suggested **starting budget**, not a guarantee: aim for 30 fresh samples/s for fast hand movements (33 ms total sample interval), with headroom for camera and rendering. Slower stance games may tolerate 15–20. An inference time below 33 ms does not itself prove 30 Hz end-to-end throughput or low latency. Choose a game-specific action-age budget, then measure it.

Upgrade only when the larger model demonstrably reduces relevant errors and fits the full budget. Do not automatically upgrade when confidence falls: low light, occlusion, framing, or motion blur may be the cause. Downgrade for sustained overload between rounds; clear detector history and recalibrate. Avoid oscillating models mid-movement. Download one selected variant lazily; do not fetch all variants on startup.

`assets/model-loader.mjs` provides selection from **supplied benchmark rows**, plus a GPU-first/CPU-fallback task factory. It does not collect measurements or auto-benchmark real cameras. The coding agent must add device benchmarking if requested. With no measurements, it chooses the initial task/variant above. With measurements and no acceptable candidate, it reports failure rather than silently choosing a model that missed the criteria.

## Integration details

- Pin an actual `@mediapipe/tasks-vision` package version in the game lockfile and use its matching WASM directory. Verify its exported API when integrating; do not use `@latest` in a production URL.
- Obtain model paths from the official model pages, pin the selected version/hash in the game's asset manifest, and keep their licensing with the download. Do not confuse old Solutions `modelComplexity` settings with Tasks model bundle selection.
- For a browser video stream use `runningMode: 'VIDEO'` and call `detectForVideo(frame, capturedAtMs)`. See the [web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js). Calls are synchronous; use a worker where supported to keep the game responsive.
- Try GPU creation, then CPU creation if it fails. A successful CPU fallback still needs latency measurement. If both fail, show the actual failure and Retry; do not return an empty “working” detector.
- Task confidence configuration controls tracking/detection internals. Apply feature-level validity checks as well. Pose visibility and presence fields are not interchangeable with Hand handedness classification scores.

To combine Pose and Hands, associate observations by image-space wrist proximity and continuity to a locked player. Never assume `hands[0]` belongs to `poses[0]`. Separate task results must have compatible capture times. Reuse one capture bitmap safely or make separate transferable copies; transferring the same bitmap twice is invalid.

## Match the packaging to the consuming game

Support standalone browser documents, bundled games and native adapters according to the user's chosen environment. A bundled app can import its installed SDK; a browser-only document needs an actual browser-resolvable module URL or supported script build. Do not mix an ESM entrypoint with a classic script tag or assume a legacy global-script package has named ESM exports. Verify the selected package's documented entrypoint and its matching WASM assets, and pin compatible versions for reproducible builds.

The loader intentionally handles only Pose and Hands. Head/facial-expression or real-object games may require a different task; evaluate the required output and the selected model's documented labels first. Do not promise arbitrary object recognition from a fixed label set or silently substitute a different object/game mechanic.
