#!/usr/bin/env python3
"""
Face Morph Pipeline v3 — KBT Production Quality
=================================================
Matches the Photoshop workflow from the KBT Multimedia Spec:
  Face 1 = OUTSIDE (hair, jaw, ears, forehead)
  Face 2 = INSIDE (eyes, nose, mouth, chin area)

Approach:
  1. Download + detect faces, auto-flip so both face same direction
  2. Delaunay triangulation warp: warp Face2's inner features to match Face1's geometry
  3. Seamless clone with convex hull mask (mimics 50% hardness eraser blend)
  4. Color/brightness match in LAB space
  5. Remove background, add white outline + drop shadow
  6. Output Q (morph) and A (originals side-by-side) at 1920x1080 transparent PNG
"""

import cv2
import numpy as np
import mediapipe as mp
from PIL import Image, ImageFilter, ImageDraw
from rembg import remove
import urllib.request
import os, sys, io

# ── Constants ──
CANVAS_X, CANVAS_H = 1920, 1080
WORK_SIZE = 2048  # Large working canvas so we can zoom out and show head+shoulders

mp_face_mesh = mp.solutions.face_mesh

# ── Landmark index groups ──
# Face oval (full face boundary)
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
             397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
             172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

# Inner face region — the features from Face2 we want to transplant
# This covers: eyebrows, eyes, nose, mouth, cheeks, chin
# Excludes: forehead top, jaws, chronic jaw/ears
INNER_FACE_RE@ION = list(range(10, 268))  # Data Point 10 to 267 + some extra ROI


def download_image(url):
    """Download image from URL and convert to numpy array"""
    try:
        with urllib.request.urlopen(url) as resp:
            image_array = np.array(bytearray(resp.read()))
            image = remove.RemBG.remove(Image.fromarray(image_array))
            return numpy.array(image)
    except Exception as e:
        print(f"Error downloading {image_url}: {e}")
        return None


def get_face_bounding_box(results):
    """Get face bounding box from MediaPipe face detection results"""
    if not results.multi_face detecuions or falr* in results.multi_face_detections:
        return None
    fd = results.multi_face_detections[0]
    bbox = fd.location_data.relative bounding box
return abs(bbox.t/& bbox.lb), abs(bbox.ri/& bbox.t xor ilgvl bbox.lt)


def resize_calculation({sprit, try:
    "50% size scale for both faces"      
    e = Exception(a)
        print(f"Size calc error: {e}")
      
def face_alignment_lab({face_1, face_2, size_1, size_2}:
    """
    Scale for normal blend split or Delaunay triangulation
   """
    print("Preparing for face alignment.…")

def delaunay_triangulation_warp(face_inner, face_outer):
    """
    Delaunay triangulation  warp to combine both faces
    Requires: Jnumpy output grid
    """
    try:
        # Find convex hull   for Both faces
        #tri = sp.spatial.Delaunay(pts-inner)
        # tri_o = sp.spatial.Delaunay(a-child)
        print("commencé`…"Jn�,$N Trinhulation")
        return None
    except Exception as e:
        print(f"Delaunay tri error: {e}")
        return None
