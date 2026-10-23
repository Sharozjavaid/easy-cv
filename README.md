# easy-cv

**Describe a movement. Connect it to an action.**

An open-source skill for AI coding agents that turns plain-English movement instructions into camera inputs using MediaPipe.

> “Count each squat as one point.”
>
> “Every time I jump, do X.”
>
> “When I move my right hand left, do Y.”
>
> “Keep X active while both hands are raised.”
>
> “Use the distance between my hands as a value from 0 to 1.”

You describe the movement and the result you want. The agent chooses the tracking model, defines how to detect the motion, and connects it to your existing code. You do not need to know landmark IDs or CV terminology.

This is a motion-to-input cookbook. You supply what X or Y means. The skill does not supply game concepts, themes, or scoring rules beyond the behavior you request.

## Install

Copy the whole skill folder, including its references and assets:

```sh
git clone https://github.com/Sharozjavaid/easy-cv.git
mkdir -p ~/.codex/skills
cp -R easy-cv/skills/easy-cv ~/.codex/skills/
```

For Claude Code, copy the folder to `~/.claude/skills/easy-cv` or your project's `.claude/skills/easy-cv`. For another agent, use its documented skill directory or ask it to read [SKILL.md](skills/easy-cv/SKILL.md). Preserve relative paths and review an existing installation before replacing it.

```text
Use $easy-cv. Count each completed squat as one point.
Connect the count to my existing onPoint callback.
```

## What's included

| Reference | Purpose |
| --- | --- |
| [Plain-English instructions](skills/easy-cv/references/plain-english.md) | Interpret casual descriptions and preserve the requested output |
| [Motion cookbook](skills/easy-cv/references/movements.md) | Squats, jumps, steps, leaning, directional hand movement, holds and sequences |
| [Model selection](skills/easy-cv/references/models.md) | Choose Pose Lite, Full, Heavy or Hands from required features and measured performance |
| [Coordinates](skills/easy-cv/references/coordinates.md) | Joint indices, mirroring, body scale, angles, velocity and screen mapping |
| [Input mappings](skills/easy-cv/references/interactions.md) | Connect observations to callbacks, booleans and continuous values |
| [Runtime](skills/easy-cv/references/runtime.md) | Camera setup, fresh frames, calibration, tracking loss and retry |
| [Tuning](skills/easy-cv/references/tuning.md) | Calibrate thresholds with explicit units |
| [Evaluation](skills/easy-cv/references/evaluation.md) | Check unintended events, missed movements and timing |

The [reference modules](skills/easy-cv/references/starter-usage.md) provide geometry helpers, a squat detector, a gated hand-path detector and a MediaPipe loader. Other motions require the agent to implement a detector using the cookbook. MediaPipe estimates landmarks; it does not automatically recognize arbitrary actions by name.

No hosted API or API key is required. Models are separate downloads. Camera inference can run locally in the consuming application.

## Checks

Requires Node.js 20+. No npm install is needed:

```sh
cd easy-cv
npm test
npm run validate
```

Tests use synthetic landmarks and loader doubles. They check logic, not physical-camera accuracy. Evaluate real movement on target devices before claiming reliable detection. An optional CI template is at `tests/github-actions.example.yml`; copy it to `.github/workflows/check.yml` to enable it with an account authorized to manage workflows.

## Contributing

Contributions are welcome through pull requests. Keep examples about a movement and its requested output. Do not add game concepts, named-game recreations or source-project walkthroughs. State units and evidence for thresholds. Detector changes should include a behavioral regression and a negative case. Do not publish private recordings, credentials or third-party assets.

MIT licensed. MediaPipe and downloaded model assets retain their own licenses.
