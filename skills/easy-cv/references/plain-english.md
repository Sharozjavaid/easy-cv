# Everyday instructions to camera inputs

Read the request as **body part → movement → output → timing**. The user supplies the application behavior; the agent implements observation and input wiring. Handle slang, typos and short sentences without asking for a technical rewrite. Do not infer age from writing style.

## Examples

| Instruction | Detection meaning | Output |
| --- | --- | --- |
| “count each squat as a point” | Confirm standing, descent and return to standing | One callback per completed repetition |
| “every time I jump do X” | Confirm ascent and recovery, with visible leg/foot evidence where needed | One X event per jump |
| “move my right hand left to do Y” | Observe deliberate leftward travel of the selected hand | One Y event, then require reset |
| “while both hands are up keep X on” | Both wrists remain above a calibrated boundary | Boolean with explicit release and loss behavior |
| “when I step left do X” | Lateral hip translation from neutral | One directional event |
| “use how far I lean as Y” | Torso angle relative to neutral | Bounded continuous value |
| “send the distance between my hands” | Distance between stable hand identities | Calibrated scalar |
| “when I pinch do X” | Thumb/index distance crosses an entry threshold | One event; opening re-arms |
| “hold my hand here for a second then do X” | Observed position stays inside the specified region | One event after a valid dwell |
| “move my hand up then right to do Y” | Two directional phases occur in order | One event after the full sequence |

Use [motion recipes](movements.md) for features and reset rules and [input mappings](interactions.md) for output contracts. These examples describe instructions, not a set of pretrained action labels.

## Preserve intent

In an application-building request, “when I squat” or “move my hand” can imply camera input without requiring the words CV or MediaPipe. An explicit mouse, keyboard or other sensor request takes precedence. “Animate a raised hand” alone is an animation request.

Do not introduce a game idea, theme, character behavior, sport, progression system or motion-to-game mechanic. Connect the movement to the user's stated callback or behavior. If X or Y is a placeholder and no implementation exists, provide a clearly named callback for the user to connect; do not invent its meaning.

Choose technical defaults yourself. Ask a short question only when output semantics materially change the result and context cannot resolve them. For counting squats, default to a full down/up repetition. For a continuous value, do not convert it into repeated events. For a held state, release it on observed exit or tracking loss according to its declared policy.

## Compose unfamiliar motions

Use position relative to neutral, direction, travel, elapsed-time velocity, reversal, projected joint angle, distance, hold duration and ordered phases. Write neutral → preparation → activation → recovery only where needed. Specify cancellation and re-arming so partial or unrelated movements cannot complete a sequence.

For “move my hand up then right,” track shoulder-relative and image-space travel, accept upward motion first, then rightward motion within a bounded interval. Reset on timeout, invalid observations or a new person. This needs its own evaluation; do not invent a built-in model label.

## Complete the wiring

Deliver camera acquisition, appropriate model assets, fresh-frame inference, validity checks, stable identities, calibration, detector and the requested input adapter. Reuse the application's existing loading, retry and pause controls. Explain setup simply: “Show both hands,” “Stand tall,” or “Step back so your knees are visible.”

State which parts were implemented and tested. If the camera cannot distinguish the requested motion reliably, explain the limitation and discuss a simpler observable input without silently changing the behavior.
