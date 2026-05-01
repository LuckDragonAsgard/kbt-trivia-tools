# KBT Face Morph Tool — Architecture Brief

> Last updated: 2026-05-01  
> Commit: 6febe4b  
> Live: https://kbt.luckdragon.io/face-morph-tool

---

## Pipeline

```
Upload A + B
  → S0: MediaPipe 478-pt face landmark detection (client-side WASM)
  → S1: computeTransform — align B eye-landmarks to A (scale/rotate/translate)
  → S2: rembg — background removal via kbt-api.luckdragon.io/rembg (parallel A+B)
  → S3: cropToFace — crop rembg output to face only (chin-landmark boundary)
  → S4: compositeMorph — hard-cut per-region mask + single seam blur
  → S5: stickerFromCanvas — white border + drop shadow
  → S6: renderQ + renderA — 1920×1080 KBT slides
```

---

## cropToFace — clothing-proof crop

Uses **MediaPipe landmark 152 (chin tip)** as the hard bottom boundary.

```js
const chinY   = lm[152].y * origH * sy;   // anatomically exact chin tip
const fH_top  = chinY - minY;             // forehead-to-chin height
const neckPad = Math.round(fH_top * 0.07); // 7% = just neck skin, never collar
const y1      = Math.min(h, Math.round(chinY + neckPad));
```

- **Sides**: 40% of face width padding (catches hair/ears)
- **Top**: 55% of fH_top above minY (catches forehead/hair top)
- **Bottom**: `chinY + 7% of fH_top` — tested safe on suit collars and dress straps

**Why not percentage-based?**  
Any fixed percentage of bounding box height includes clothing on photos with neck/body in frame. `lm[152]` is anatomically precise regardless of framing.

---

## compositeMorph — hard cuts, no opacity

```
cA = Face A (rembg)  
cB = Face B (rembg, aligned via T transform)
cMask = 50/50 BLEND_HAIR fill (background + hair: genuine colour average)

For each region (eyeL, eyeR, nose, mouth, sideL, sideR):
  1. ERASE region hull (destination-out, no blur) → clears to transparent
  2. REDRAW region hull (source-over, BLEND_A=0.0 or BLEND_B=1.0) → hard cut

Apply blur(SEAM_BLUR=6px) to full cMask → softens seam lines only
Apply cMask to cB (destination-in)
Final: white → drawImage(cAclean) → drawImage(cBmasked)
return cleanAlpha(out)  ← CRITICAL: eliminates ghost pixels
```

### Ghost artifact fix
`cleanAlpha(out)` MUST be called on the compositeMorph output:
- **Cause**: 50/50 mask lets Face B bleed at 50% opacity into areas where Face A was transparent (rembg background) → ghost silhouette appears on white slide
- **Fix**: threshold alpha >180→255, else→0. All semi-transparent bleed pixels vanish.
- **Never remove this line.** The inputs can be pre-cleaned but the OUTPUT must also be cleaned.

### Parameters
| Constant | Value | Meaning |
|----------|-------|---------|
| BLEND_HAIR | 0.5 | Background + hair: 50/50 blend |
| BLEND_A | 0.0 | Region = 100% Face A |
| BLEND_B | 1.0 | Region = 100% Face B |
| SEAM_BLUR | 6px | Single blur on full mask after all hard assignments |
| Hull expand | 22px | Outward from centroid per feature hull |

---

## Toggle system

6 regions: eyeL, eyeR, nose, mouth, sideL, sideR  
Default: `eyeL:'A', eyeR:'B', nose:'A', mouth:'B', sideL:'B', sideR:'A'`  
Instant re-render after first generate (cached in `_morphCache`).  
`shuffleFeatures()` randomises all 6 at once.

---

## Slide output

**Q slide (1920×1080):** blended morph only, white bg, no answer text  
**A slide (1920×1080):** Face A thumb (left) + morph (centre) + Face B thumb (right) + answer in purple box  

Faces are large — morph fills ~88% of slide width / nearly full height on Q slide.  
Purple accent: `#7c3aed` (KBT brand).

---

## Test images

Pre-aligned to 640×720, deployed on same origin (no CORS):
- `taylor_aligned.jpg` — Taylor Swift
- `brad_aligned.jpg` — Brad Pitt (suit + white collar, hardest case for clothing)

---

## Known quirks

- **Tab freezes during upload**: MediaPipe WASM init + rembg API = 1-3 min freeze. Normal. Upload one image, wait for landmark dots to appear, then upload second.
- **White border invisible on white slides**: KBT only uses white slides so the sticker border has no visual effect — only the drop shadow renders. This is by design.
- **Chrome extension CDP timeout**: 45s timeout fires before rembg completes. The page is working; just wait.
