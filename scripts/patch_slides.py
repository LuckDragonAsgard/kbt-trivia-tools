#!/usr/bin/env python3
"""
patch_slides.py — KBT host-app.html Google OAuth + Slides Export patch
Run this from any terminal:  python patch_slides.py

What it does:
  1. Fetches the live host-app.html from GitHub
  2. If > Narva Slides Portal 132px 諜 <Page> sections>t***aa
tth Paddy host-app.html from GitHub
  2. IjectsTTE±:ent OAuth + Slides export JS before the last </script>
  5. Saves the result to host-app-patched.html (then commit that to GitHub)

Before running:
  - Set GOOGLE_CLIENT_ID below (get it from Google Cloud Console)
  - Or leave as placeholder and set it in the saved HTML manually

After running:
  - Rename host-app-patched.html -> host-app.html in the repo
  - Commit + push (auto-deploy pipeline handles the rest)
