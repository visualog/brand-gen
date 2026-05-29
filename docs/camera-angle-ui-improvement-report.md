# Camera Angle UI Improvement Report

## Summary

The xGen Camera Angle node has been updated from a coordinate-pad-heavy control into a more readable camera composition tool.

The implementation keeps the existing `cameraAngle: string` state pipeline intact while changing the UI to prioritize visual orbit feedback and plain-language composition summaries.

## Files Changed

- `src/components/nodes/CameraAngleNode.tsx`
- `docs/camera-angle-ui-rag-improvement-plan.md`
- `docs/camera-angle-ui-improvement-report.md`
- `notes/fabric-camera-orbit-ui-plan.md`

## Implemented Changes

### Full Orbit Mini Viewer

The old flat `LEFT / RIGHT / HIGH / LOW` coordinate pad was replaced with a compact full-orbit viewer:

- neutral 3D object pivot
- spherical orbit guide around the subject
- camera marker positioned in front/back/left/right/top/bottom space
- camera marker scale and opacity indicate depth
- connector line from subject to camera marker
- pitch indicator on the side
- front/back/left/right/top/bottom direction labels
- six axis snap buttons for front, back, left, right, top, and bottom placement
- double-click resets the orbit to front eye-level
- Shift-drag snaps yaw and pitch to 15-degree increments

### Main Object Representation

The central reference was changed from an abstract silhouette into a neutral isometric cube:

- three visible shaded faces
- center target dot
- small `OBJECT` label
- no person/body silhouette that could be mistaken for the generated subject

This makes the control read as a 3D object pivot rather than a specific character or product.

### Readable Summary

The primary summary no longer exposes technical values first.

It now shows:

- `위치`: camera location around the object, such as front, back, left, or right
- `높이`: camera height, such as above, eye-level, or below
- `시점`: interpreted view direction such as left three-quarter or low angle
- `프레이밍`: close, medium, wide, or establishing framing
- `렌즈감`: wide, standard, or telephoto
- `수평선`: level or tilted horizon

### Lens Controls

The direct lens slider was moved behind advanced controls. The primary lens control is now:

- `광각`
- `표준`
- `망원`

Each option has a short effect-oriented description.

### Advanced Controls

Technical controls are still available but are no longer the first thing the user sees:

- horizon tilt / roll slider
- exact lens mm slider
- yaw, pitch, roll, and lens numeric values

### Prompt Output

The generated prompt now includes both:

- natural language camera direction
- technical camera values

It also adds guardrails for risky combinations such as close-up wide-angle framing and strong dutch tilt.

## Compatibility

The app-level state is still:

```ts
cameraAngle: string
```

Existing prompt parsing still reads:

- yaw
- pitch
- roll
- distance
- lens

Legacy strings such as `top`, `overhead`, `low`, and `side` still fall back to nearby camera models.

## Verification

### ESLint

Command:

```bash
./node_modules/.bin/eslint src/components/nodes/CameraAngleNode.tsx src/app/page.tsx
```

Result: passed.

### Next Production Build

Command:

```bash
npm run build:next
```

Result: passed.

### Electron mac Package

Command:

```bash
npm run pack:mac
```

Result: completed.

Known non-blocking warning:

```text
skipped macOS application code signing
```

Reason: no valid Developer ID Application certificate is installed.

### Bundle Verification

Searched generated bundles for the updated camera UI strings:

```bash
rg -n "OBJECT|카메라 축 스냅|위에서 내려봄|아래에서 올려봄|오브젝트 뒤|오브젝트 앞" src .next release/mac/xGen.app/Contents/Resources/next
```

Result: updated strings were present in the built output.

### Size Check

Command:

```bash
du -sh release/mac/xGen.app .next/standalone
```

Result:

```text
954M release/mac/xGen.app
353M .next/standalone
```

Note: this size increase is not caused by the camera-angle UI change. The production trace currently includes `style-references` through `.next/server/app/api/xmark/generate/route.js.nft.json`, which adds roughly 309M to `.next/standalone`. That should be handled as a separate packaging cleanup.
