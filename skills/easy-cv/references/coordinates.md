# Coordinates, skeletons, and features

## Declare spaces before writing a detector

The default input contract is an **unmirrored**, upright camera frame with capture timestamp in milliseconds. Normalized image x grows right; y grows down. Landmark side labels refer to the person's anatomical side, not the left side of a preview. A CSS mirror does not change model input. Do not swap landmark indices merely because the preview is mirrored.

Pose indices needed by these recipes:

| Left / right | Indices |
| --- | --- |
| Shoulders | 11 / 12 |
| Elbows | 13 / 14 |
| Wrists | 15 / 16 |
| Hips | 23 / 24 |
| Knees | 25 / 26 |
| Ankles | 27 / 28 |
| Heel / foot tip | 29,31 / 30,32 |

Pose also has nose 0 and coarse hand points. Use Hand Landmarker for detailed fingers: wrist 0, thumb tip 4, index tip 8, middle tip 12, ring tip 16, pinky tip 20; palm knuckles 5,9,13,17. These are a different landmark array. Maintain separate task/track IDs.

MediaPipe's [Pose output documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) defines normalized image and world outputs. Image z is relative depth, not an absolute camera range. Model-estimated world coordinates are not a calibrated room tracking system. Never compare world meters directly to normalized image thresholds, or align separate hands' local world origins as though they shared room coordinates.

## Aspect correction and body units

For frame width W and height H, convert normalized image coordinates to height units:

```text
p = (x * W/H, y)
S = midpoint(leftShoulder, rightShoulder)
Hips = midpoint(leftHip, rightHip)
T0 = distance(S, Hips) during upright calibration
B0 = distance(leftShoulder, rightShoulder) during upright calibration
hipDrop = (Hips.y - standingHipY) / T0
shoulderDrop = (S.y - standingShoulderY) / T0
wristRelative = (wrist - S) / B0
velocity = change in feature / elapsed seconds
```

Pixel coordinates `(x*W,y*H)` are equally valid. Raw `(x,y)` Euclidean distances distort geometry on non-square frames. Axis-only thresholds must name their unit. A frozen, calibrated scale helps during body rotation; live shoulder width can collapse and inflate normalized speeds. Recalibrate after a sustained distance/framing change, in a neutral state, not halfway through a swing.

Joint angle at B: `acos(clamp(dot(A-B,C-B)/(length(A-B)*length(C-B)),-1,1))`. Reject degenerate segments. A hip-knee-ankle angle is a projected angle in 2D; front-facing bent legs can look straight. Combine it with calibrated hip descent and confidence; never claim clinical exercise-form measurement.

## Camera image → canvas

With centered CSS `object-fit: cover`, scale is `max(canvasW/videoW, canvasH/videoH)`; use `min` for contain. The rendered image is centered, with crop or letterbox offset `(canvas-renderedImage)/2`. Apply the same transformation to the video and overlays. Mirrored preview uses `1-x` once before mapping. Include devicePixelRatio consistently; do not mix CSS pixels and backing-store pixels.

A hand-path segment and any region it intersects must share this canvas coordinate system. Use segment/region intersection when fast movement might skip a region between frames. Define repeat semantics explicitly. For a moving region, use relative motion at the same two capture times rather than testing only its latest location.

## Optional observation overlays

Place markers at observed positions using the declared transform. A two-hand midpoint provides a shared anchor; separation can provide a direction only when it is large enough to be stable. A visual hold may smooth brief loss but cannot count as a fresh observation. Model-estimated depth does not prove metric 3D contact.
