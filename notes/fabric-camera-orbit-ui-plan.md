# Fabric Note: xGen Camera Orbit UI Plan

## User Goal

Improve the Camera Angle node so the user can easily place a camera anywhere around the main object. The UI must make it obvious when the camera is in front, behind, above, or below the object, while staying simple.

## External References Collected

- Blender Navigation Gizmo and orbit behavior: https://docs.blender.org/manual/en/latest/editors/3dview/navigate/introduction.html
- Unity Scene View navigation, orientation overlay, orbit around pivot, movement shortcuts: https://docs.unity3d.com/Manual/SceneViewNavigation.html
- Autodesk Maya Camera Tools, especially Tumble, Dolly, Zoom, Azimuth/Elevation, Yaw/Pitch: https://help.autodesk.com/cloudhelp/2023/ENU/Maya-Basics/files/GUID-DDE25A30-0D59-4F92-8150-98DD12EF39DE.htm
- Godot 3D editor navigation and viewport manipulator behavior: https://docs.godotengine.org/en/stable/tutorials/3d/introduction_to_3d.html

## Reference Takeaways

1. Orbit should be centered on a point of interest, not on arbitrary screen coordinates.
2. Orientation should be visible as a small gizmo, not hidden behind numeric yaw/pitch.
3. Axis snapping is important: front, back, left, right, top, bottom.
4. Dolly/framing and zoom/lens should remain separate concepts.
5. Roll is secondary and should not compete with camera position.

## Current Problem

The current xGen camera node uses spherical math internally, but the visual target in the center looks abstract and slightly strange. It does not clearly read as the main object. The user also needs clearer feedback for:

- camera behind the object
- camera above looking down
- camera below looking up
- camera anywhere around the object

## Product Direction

Keep the node compact and simple. Do not recreate a full 3D application viewport. Use a simplified orbit gizmo that behaves like a composition control for image generation.

## UI Plan

### Main Object

Replace the ambiguous central shape with a recognizable neutral 3D object:

- isometric cube
- three visible faces with subtle shading
- small center target dot
- no character/body silhouette unless the user later chooses a subject type

Reason: a cube is universally understood as a 3D object and does not imply a person, product, or specific generated subject.

### Camera Orbit

Keep the drag surface, but make the spatial mapping clearer:

- camera icon moves on a spherical guide around the cube
- front camera marker appears stronger/larger
- back camera marker appears lighter/smaller and behind the cube
- connector line uses dashed style when the camera is behind

### Direction Feedback

Add a concise location summary above or inside the viewer:

- `카메라 위치: 앞 / 뒤 / 좌 / 우`
- `높이: 위에서 / 눈높이 / 아래에서`

This is more readable than raw `Yaw` and `Pitch`.

### Axis Snap Buttons

Add small simple buttons for the six canonical views:

- 앞
- 뒤
- 좌
- 우
- 위
- 아래

These should set yaw/pitch values directly while the orbit viewer remains draggable for intermediate positions.

### Prompt Mapping

Retain `cameraAngle: string` compatibility.

Generated prompt should include both:

- natural-language camera position: from behind, from below, top-down, etc.
- technical yaw/pitch/roll/lens values for repeatability

## Implementation Plan

1. Replace central target drawing in `CameraAngleNode.tsx` with an isometric cube component.
2. Add `AXIS_VIEWS` buttons for six directional snaps.
3. Add clearer Korean camera position summary helpers.
4. Keep existing drag orbit interaction and lens/framing controls.
5. Update `docs/camera-angle-ui-improvement-report.md`.
6. Run lint, Next build, and Electron mac package.

## Success Criteria

- The center target reads as a 3D main object, not a strange body or abstract blob.
- The user can place the camera behind, above, below, left, right, front, and intermediate positions.
- Current camera position is understandable without reading numbers.
- The UI stays compact and simple.
- Existing saved `cameraAngle` strings remain parseable.
- `eslint`, `npm run build:next`, and `npm run pack:mac` pass.

