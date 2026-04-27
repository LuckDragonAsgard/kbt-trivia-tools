#!/usr/bin/env python3
"""
Face Morph Tool — Local Flask Server
=====================================
Run this first, then open Face Morph Tool.html in your browser.

  python face_morph_server.py

Listens on http://localhost:5001
"""

import os
import sys
import io
import base64
import tempfile
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

# Add the directory containing face_morph_v3 to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from face_morph_v3 import create_morph_q, create_morph_a, add_outline_and_shadow

app = Flask(__name__)
CORS(app)  # Allow requests from the HTML tool (file:// or localhost)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "morph_examples")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def pil_to_b64(img: Image.Image) -> str:
    """Convert PIL Image to base64 PNG string."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Face Morph Server running"})


@app.route("/morph", methods=["POST"])
def morph():
    try:
        # ── Get inputs ──
        name1 = request.form.get("name1", "Face 1").strip()
        name2 = request.form.get("name2", "Face 2").strip()
        fm_number = int(request.form.get("fm_number", 1))

        if "face1" not in request.files or face2" not in request.files:
            return jsonify({"error": "Both face1 and face2 images are required"}), 400

        file1 = request.files["face1"]
        file2 = request.files["face2"]

        # ── Save to temp files ──
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f1:
            file1.save(f1.name)
            path1 = f1.name

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f2:
            file2.save(f2.name)
            path2 = f2.name

        try:
            # ── Run Q pipeline ──
            print(f"\n[Server] FM{fm_number:02d}: {name1} + {name2}")
            print("[Server] Creating morph Q...")
            morph_cutout = create_morph_q(path1, path2)
            if morph_cutout is None:
                return jsonify({"error": "Face detection failed — try photos with clearer front-facing headshots"}), 422

            q_canvas = add_outline_and_shadow(morph_cutout)

            # ── Run A pipeline ──
            print("[Server] Creating answer A...")
            a_canvas = create_morph_a(path1, path2)

            # ── Save to disk ──
            q_filename = f"FM{fm_number:02d} Q {name1}, {name2}.png"
            a_filename = f"FM{fm_number:02d} A {name1}, {name2}.png"
            q_path = os.path.join(OUTPUT_DIR, q_filename)
            a_path = os.path.join(OUTPUT_DIR, a_filename)
            q_canvas.save(q_path, "PNG")
            a_canvas.save(a_path, "PNG")
            print(f"[Server] Saved: {q_filename}")
            print(f"[Server] Saved: {a_filename}")

            # ── Return base64 ──
            return jsonify({
                "q": pil_to_b64(q_canvas),
                "a": pil_to_b64(a_canvas),
                "q_filename": q_filename,
                "a_filename": a_filename,
            })

        finally:
            os.unlink(path1)
            os.unlink(path2)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 55)
    print("  KBT — Face Morph Server")
    print("  http://localhost:5001")
    print("  Then open: Face Morph Tool.html")
    print("=" * 55)
    app.run(host="0.0.0.0", port=5001, debug=False)
