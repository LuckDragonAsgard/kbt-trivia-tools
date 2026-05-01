# KBT Face Morph Tool — Full Brief & Requirements

## Game Concept
Two celebrity faces are blended into one morph. Players must identify both people.

## Slides Output
- **Q slide (1920×1080):** Just the morphed face. White background. No names.
- **A slide (1920×1080):** Three faces side by side — Face A (left), Morph (centre), Face B (right). Answer text "Name A & Name B" in purple bordered box below. White background.

## The Morph — How It Must Work

### Step 1: Alignment (opacity used HERE ONLY)
- Both photos pre-processed: face detected, cropped, resized to same scale (640×720)
- Landmark dots overlaid on preview so host can SEE where eyes/nose/mouth align
- Face B rotated and scaled to match Face A's eye positions
- Opacity overlay used ONLY at this stage to confirm features line up visually
- **Opacity is then removed entirely from the final result**

### Step 2: Feature Region Toggles
Six independently toggled regions:
- Left Eye, Right Eye, Nose, Mouth, Left Side/Ear, Right Side/Ear
- Each toggle = A or B → that region shows 100% of that person's feature
- NO opacity mixing in the feature regions in final output
- Only the seam boundary (~10px) has a soft feathered blend for natural transition
- Hair/background: genuine 50/50 colour average (creates combined hair silhouette)

### Step 3: Compositing Rules
- Each feature region = HARD CUT (0% or 100% of Face B), NOT a washy semi-transparent overlay
- Seam feathering: small blur (6px) applied to the FULL mask AFTER hard assignments
- Interior of each region is fully clean — no ghosting of the other face
- Result should look like a real face, not two faces overlaid

### Step 4: Sticker Treatment
- White border around the cut-out face
- Drop shadow behind the face
- Applied to morph and to both individual face thumbnails on A slide

### Step 5: Output
- PNG, 1920×1080, white background, fully opaque (no transparency in final PNG)
- Purple (#7c3aed) KBT header with round label top-left
- Download Q and Download A buttons in the tool

## UI Requirements
- Upload drop zones for Face A and Face B (with photo previews)
- Landmark dot overlay on each uploaded photo showing the 6 feature regions (coloured dots per region)
- Toggle panel: 6 buttons (A|B) for each feature, updates slide instantly after first generate
- Shuffle button to randomise toggles
- Name fields for Face A and Face B
- Round label field (e.g. R1Q1)
- Generate Morph button (runs rembg + landmark detection — ~20 seconds)
- After first generate: toggles re-render instantly (cached rembg + landmarks)
- Download Q / Download A buttons

## Technical Pipeline
1. S0: MediaPipe 478-point face landmark detection (client-side, no server)
2. S1: computeTransform — align Face B eye positions to Face A eye positions (scale + rotate + translate)
3. S2: rembg via kbt-api.luckdragon.io — background removal (both faces in parallel)
4. S3: compositeMorph — hard-cut per-region mask + seam blur + composite
5. S4: sticker — white border + drop shadow on morph and thumbnails
6. S5: renderQ + renderA — draw final 1920×1080 slides

## Alignment Preview (Landmark Dots)
After uploading each photo, draw coloured dots on the preview image showing:
- 🔵 Blue: Left Eye landmarks
- 🟢 Green: Right Eye landmarks  
- 🔴 Red: Nose landmarks
- 🟡 Yellow: Mouth landmarks
- 🟣 Purple: Left Side/Ear landmarks
- 🟠 Orange: Right Side/Ear landmarks

This lets the host confirm faces are properly aligned before generating.

## Photo Requirements
- High-res source photos preferred (Google Images → Tools → Large)
- Pre-align: crop to face, resize both to same scale
- Aligned test photos: kbt.luckdragon.io/taylor_aligned.jpg + kbt.luckdragon.io/brad_aligned.jpg

## Hosted At
- Tool: https://kbt.luckdragon.io/face-morph-tool
- Source: LuckDragonAsgard/kbt-trivia-tools → face-morph-tool.html
