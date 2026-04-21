
// /api/generate-slides.js
// Vercel Serverless Function - generates a native Google Slides deck from a KBT event

const SUPABASE_URL = "https://huvfgenbcaiicatvtxak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmZnZW5iY2FpaWNhdHZ0eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTczNjIsImV4cCI6MjA5MTE5MzM2Mn0.uTgzTKYjJnkFlRUIhGfW4ODKyV24xOdKaX7lxpDuMfc";

// KBT color palette
const COLORS = {
  BG:     { red: 0.957, green: 0.973, blue: 0.984 },
  DARK:   { red: 0.263, green: 0.263, blue: 0.263 },
  BLUE:   { red: 0.114, green: 0.686, blue: 0.945 },
  BLUE2:  { red: 0.173, green: 0.580, blue: 0.761 },
  ORANGE: { red: 1.000, green: 0.635, blue: 0.318 },
  PURPLE: { red: 0.616, green: 0.478, blue: 0.925 },
  GREEN:  { red: 0.133, green: 0.780, blue: 0.529 },
  YELLOW: { red: 0.984, green: 0.773, blue: 0.000 },
  RED:    { red: 0.984, green: 0.255, blue: 0.255 },
  WHITE:  { red: 1, green: 1, blue: 1 },
  PINK:   { red: 0.984, green: 0.518, blue: 0.514 },
  DARK_BG:{ red: 0.102, green: 0.102, blue: 0.118 },
};

const TYPE_COLORS = {
  follower_freebie: COLORS.BLUE, freebie: COLORS.BLUE, standard: COLORS.BLUE, classic: COLORS.BLUE,
  "50-50": COLORS.ORANGE, multiple_choice: COLORS.PURPLE, maths: COLORS.PINK,
  song_lyrics: COLORS.GREEN, soundmash: COLORS.GREEN, anagram: COLORS.ORANGE,
  face_morph: COLORS.PURPLE, ghost_actors: COLORS.PURPLE, linked_pics: COLORS.PURPLE,
  map_pins: COLORS.GREEN, guess_the_year: COLORS.GREEN, crack_the_code: COLORS.PURPLE,
  bonus_1: COLORS.YELLOW, bonus_ht: COLORS.YELLOW, gambler: COLORS.RED,
  brain: COLORS.BLUE2, brand: COLORS.BLUE2,
};

const SLIDE_W = 9144000; // EMU - 16:9
const SLIDE_H = 5143500;

// ─── Google OAuth via Service Account ──────────────────────────────────────
async function getAccessToken(saJson) {
  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  
  const sigInput = `${header}.${claim}`;
  
  // Import private key
  const keyData = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  
  const encoder = new TextEncoder();
  const sigBytes = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(sigInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
  const jwt = `${sigInput}.${sig}`;
  
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  
  const { access_token } = await tokenRes.json();
  return access_token;
}

// ─── Supabase helpers ──────────────────────────────────────────────────────
async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return r.json();
}

// ─── Slides API helpers ──────────────────────────────────────────────────────
function rgb(c) { return { red: c.red, green: c.green, blue: c.blue }; }

function textBox(text, x, y, w, h, fontSize, color, bold = false, align = "CENTER") {
  const id = `tb_${Math.random().toString(36).slice(2,8)}`;
  return [
    {
      createShape: {
        objectId: id,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: "__SLIDE__",
          size: { width: { magnitude: w, unit: "EMU" }, height: { magnitude: h, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: "EMU" }
        }
      }
    },
    {
      insertText: { objectId: id, text }
    },
    {
      updateTextStyle: {
        objectId: id,
        style: {
          fontSize: { magnitude: fontSize, unit: "PT" },
          foregroundColor: { opaqueColor: { rgbColor: rgb(color) } },
          bold,
        },
        fields: "fontSize,foregroundColor,bold"
      }
    },
    {
      updateParagraphStyle: {
        objectId: id,
        style: { alignment: align },
        fields: "alignment"
      }
    }
  ];
}

function coloredRect(x, y, w, h, color, slideId) {
  const id = `rect_${Math.random().toString(36).slice(2,8)}`;
  return [
    {
      createShape: {
        objectId: id,
        shapeType: "RECTANGLE",
        elementProperties: {
          pageObjectId: slideId,
          size: { width: { magnitude: w, unit: "EMU" }, height: { magnitude: h, unit: "EMU" } },
          transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: "EMU" }
        }
      }
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: rgb(color) } } },
          outline: { outlineFill: { solidFill: { color: { rgbColor: rgb(color) } } }, weight: { magnitude: 0, unit: "PT" } }
        },
        fields: "shapeBackgroundFill,outline"
      }
    }
  ];
}

function setBg(slideId, color) {
  return [{
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: { solidFill: { color: { rgbColor: rgb(color) } } }
      },
      fields: "pageBackgroundFill"
    }
  }];
}

// KBT logo as text (KNOW + BRAINER)
function logoRequests(slideId, tb1, tb2) {
  const idK = `logo_know_${Math.random().toString(36).slice(2,6)}`;
  const idB = `logo_brain_${Math.random().toString(36).slice(2,6)}`;
  return [
    { createShape: { objectId: idK, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 1500000, unit: "EMU" }, height: { magnitude: 350000, unit: "EMU" } }, transform: { scaleX:1, scaleY:1, translateX: 280000, translateY: 130000, unit:"EMU" } } } },
    { insertText: { objectId: idK, text: "KNOW" } },
    { updateTextStyle: { objectId: idK, style: { fontSize: { magnitude: 22, unit: "PT" }, foregroundColor: { opaqueColor: { rgbColor: rgb(COLORS.DARK) } }, bold: true }, fields: "fontSize,foregroundColor,bold" } },
    { createShape: { objectId: idB, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 2000000, unit: "EMU" }, height: { magnitude: 350000, unit: "EMU" } }, transform: { scaleX:1, scaleY:1, translateX: 1650000, translateY: 130000, unit:"EMU" } } } },
    { insertText: { objectId: idB, text: "BRAINER" } },
    { updateTextStyle: { objectId: idB, style: { fontSize: { magnitude: 22, unit: "PT" }, foregroundColor: { opaqueColor: { rgbColor: rgb(COLORS.BLUE2) } }, bold: true }, fields: "fontSize,foregroundColor,bold" } },
  ];
}

function accentBar(slideId, color) {
  const id = `bar_${Math.random().toString(36).slice(2,8)}`;
  return [
    { createShape: { objectId: id, shapeType: "RECTANGLE", elementProperties: { pageObjectId: slideId, size: { width: { magnitude: SLIDE_W, unit: "EMU" }, height: { magnitude: 80000, unit: "EMU" } }, transform: { scaleX:1, scaleY:1, translateX:0, translateY:0, unit:"EMU" } } } },
    { updateShapeProperties: { objectId: id, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: rgb(color) } } }, outline: { outlineFill: { solidFill: { color: { rgbColor: rgb(color) } } }, weight: { magnitude: 0, unit: "PT" } } }, fields: "shapeBackgroundFill,outline" } }
  ];
}

// ─── Build all slides requests ────────────────────────────────────────────
function buildSlideRequests(slides) {
  // slides = [{id, bg, requests:[...]}]
  // Returns flat array of batchUpdate requests with slide IDs substituted
  const all = [];
  for (const slide of slides) {
    all.push({ createSlide: { objectId: slide.id, insertionIndex: slide.idx } });
    all.push(...setBg(slide.id, slide.bg));
    for (const req of slide.requests) {
      // substitute __SLIDE__ with actual slide id
      all.push(JSON.parse(JSON.stringify(req).replace(/__SLIDE__/g, slide.id)));
    }
  }
  return all;
}

// ─── Main handler ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  
  const { event_code, event_id } = req.query;
  if (!event_code && !event_id) return res.status(400).json({ error: "event_code or event_id required" });
  
  const saJson = process.env.GOOGLE_SA_JSON;
  if (!saJson) return res.status(500).json({ error: "GOOGLE_SA_JSON not configured in Vercel env vars" });
  
  // 1. Fetch event data
  const eventQuery = event_id
    ? `kbt_event?id=eq.${event_id}&limit=1&select=id,event_date,event_description,event_location_id`
    : `kbt_event?event_code=eq.${event_code}&limit=1&select=id,event_date,event_description,event_location_id`;
  
  const [event] = await dbGet(eventQuery);
  if (!event) return res.status(404).json({ error: "Event not found" });
  
  // Get venue
  let venue = event.event_description || "KBT Trivia";
  let timeStr = "7:00 PM";
  if (event.event_location_id) {
    const [loc] = await dbGet(`kbt_loc?id=eq.${event.event_location_id}&select=loc_fullname,loc_time`);
    if (loc) { venue = loc.loc_fullname || venue; timeStr = loc.loc_time || timeStr; }
  }
  
  // Get quiz items
  const quiz = await dbGet(
    `kbt_quiz?quiz_event_id=eq.${event.id}&order=quiz_item_round.asc,quiz_item_order.asc` +
    `&select=quiz_item_round,quiz_item_number,quiz_points,quiz_qtype,quiz_question_id`
  );
  
  // Get questions
  const qids = [...new Set(quiz.map(s => s.quiz_question_id).filter(Boolean))].slice(0, 50);
  let qMap = {};
  if (qids.length) {
    const qs = await dbGet(`kbt_question?id=in.(${qids.join(",")})&select=id,question_question_text,question_answer_text,question_fun_fact`);
    qs.forEach(q => qMap[q.id] = q);
  }
  
  // 2. Get Google access token
  const accessToken = await getAccessToken(saJson);
  
  // 3. Create empty presentation
  const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: `KBT Trivia — ${venue}` })
  });
  const pres = await createRes.json();
  const presId = pres.presentationId;
  
  // 4. Build slide requests
  const slideList = [];
  let idx = 0;
  
  const newSlide = (bg) => {
    const id = `slide_${(++idx).toString().padStart(3,"0")}_${Math.random().toString(36).slice(2,6)}`;
    return { id, bg, idx: idx - 1, requests: [] };
  };
  
  const add = (slide, ...items) => slide.requests.push(...items.flat());
  
  // ── WELCOME ──
  const s1 = newSlide(COLORS.BG);
  add(s1, accentBar(s1.id, COLORS.BLUE2));
  add(s1, logoRequests(s1.id));
  add(s1, textBox(venue, 0, 1800000, SLIDE_W, 900000, 44, COLORS.DARK, true, "CENTER"));
  add(s1, textBox("Trivia. But Better.", 0, 2900000, SLIDE_W, 400000, 18, {red:0.6,green:0.6,blue:0.6}, false, "CENTER"));
  slideList.push(s1);
  
  // ── SOCIAL ──
  const s2 = newSlide(COLORS.DARK_BG);
  add(s2, logoRequests(s2.id));
  add(s2, textBox("@knowbrainertrivia", 0, 2000000, SLIDE_W, 500000, 32, {red:0.847,green:0.506,blue:0.784}, true, "CENTER"));
  add(s2, textBox("/knowbrainertrivia", 0, 2600000, SLIDE_W, 500000, 32, COLORS.BLUE, true, "CENTER"));
  add(s2, textBox("Check our socials for a clue to the first question each week", 0, 3300000, SLIDE_W, 400000, 16, {red:0.6,green:0.6,blue:0.6}, false, "CENTER"));
  slideList.push(s2);
  
  // ── LOCATION / PRIZES ──
  const s3 = newSlide(COLORS.WHITE);
  add(s3, accentBar(s3.id, COLORS.BLUE2));
  add(s3, logoRequests(s3.id));
  add(s3, textBox(timeStr, 280000, 1300000, 3500000, 1000000, 64, COLORS.BLUE, true, "LEFT"));
  add(s3, textBox(venue, 280000, 2500000, 5000000, 600000, 28, COLORS.DARK, true, "LEFT"));
  add(s3, textBox("🥇 $75 Voucher", 5500000, 1500000, 3000000, 400000, 22, COLORS.BLUE2, true, "LEFT"));
  add(s3, textBox("🥈 Bar Prize", 5500000, 2000000, 3000000, 400000, 22, COLORS.BLUE2, true, "LEFT"));
  add(s3, textBox("➕ Bonus Prizes!", 5500000, 2500000, 3000000, 400000, 22, COLORS.BLUE2, true, "LEFT"));
  slideList.push(s3);
  
  // ── TO-DO LIST ──
  const s4 = newSlide(COLORS.WHITE);
  add(s4, accentBar(s4.id, COLORS.BLUE2));
  add(s4, logoRequests(s4.id));
  add(s4, textBox("To do list…", 280000, 800000, 6000000, 500000, 26, COLORS.BLUE, true, "LEFT"));
  const todos = ["Nominate a Team Captain", "Captain scans QR code to register your team", "Check email inbox for your answer submission link", "Play like a Champion! 🏆"];
  todos.forEach((t, i) => {
    const y = 1600000 + i * 780000;
    add(s4, textBox(`${i+1}.`, 280000, y, 500000, 600000, 22, COLORS.BLUE2, true, "LEFT"));
    add(s4, textBox(t, 900000, y, 7800000, 600000, 20, COLORS.DARK, false, "LEFT"));
  });
  slideList.push(s4);
  
  // ── QR REGISTER ──
  const s5 = newSlide(COLORS.WHITE);
  add(s5, accentBar(s5.id, COLORS.BLUE2));
  add(s5, logoRequests(s5.id));
  add(s5, textBox("Register Your Team", 280000, 800000, 5000000, 1200000, 40, COLORS.DARK, true, "LEFT"));
  const steps = ["Scan the QR code with your phone camera", "Enter your team name and pick an emoji", "You're in! Submit answers each round via your phone"];
  steps.forEach((step, i) => {
    const y = 2200000 + i * 800000;
    add(s5, textBox(`${i+1}`, 280000, y, 500000, 600000, 20, COLORS.WHITE, true, "CENTER"));
    add(s5, textBox(step, 900000, y + 100000, 7800000, 500000, 18, COLORS.DARK, false, "LEFT"));
  });
  add(s5, textBox("kbt-trial.vercel.app/player-app", 0, 4700000, SLIDE_W, 300000, 12, {red:0.7,green:0.7,blue:0.7}, false, "CENTER"));
  slideList.push(s5);
  
  // ── ROUNDS ──
  const byRound = {};
  for (const slot of quiz) {
    const r = slot.quiz_item_round || 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push({ ...slot, qd: qMap[slot.quiz_question_id] || {} });
  }
  
  const roundNames = ["ONE","TWO","THREE","FOUR","FIVE","SIX"];
  
  for (const r of Object.keys(byRound).sort((a,b) => +a - +b)) {
    const slots = byRound[r];
    
    // Round intro
    const ri = newSlide(COLORS.BG);
    add(ri, logoRequests(ri.id));
    add(ri, textBox("ROUND", 0, 1800000, SLIDE_W, 500000, 18, COLORS.BLUE2, true, "CENTER"));
    add(ri, textBox(roundNames[(+r-1) % 6], 0, 2300000, SLIDE_W, 1500000, 96, COLORS.DARK, true, "CENTER"));
    slideList.push(ri);
    
    for (const slot of slots) {
      const qtype = (slot.quiz_qtype || "standard").toLowerCase();
      const accent = TYPE_COLORS[qtype] || COLORS.BLUE;
      const q_text = slot.qd.question_question_text || "";
      const a_text = slot.qd.question_answer_text || "";
      const fun = slot.qd.question_fun_fact || "";
      const pts = slot.quiz_points || 1;
      const qnum = slot.quiz_item_number || 0;
      const label = qtype.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());
      const isBonus = ["bonus_1","bonus_ht"].includes(qtype);
      const isGambler = qtype === "gambler";
      
      // Question slide
      const sq = newSlide(isBonus ? COLORS.BG : COLORS.WHITE);
      add(sq, accentBar(sq.id, accent));
      add(sq, logoRequests(sq.id));
      add(sq, textBox(`R${r}Q${qnum}`, 280000, 150000, 2000000, 400000, 24, accent, true, "LEFT"));
      add(sq, textBox(label.toUpperCase(), 6000000, 200000, 2800000, 350000, 13, {red:0.6,green:0.6,blue:0.6}, false, "RIGHT"));
      add(sq, textBox(`${pts} pt${pts > 1 ? "s" : ""}`, 6000000, 550000, 2800000, 350000, 13, accent, true, "RIGHT"));
      
      if (isGambler) {
        add(sq, textBox("🎲 GAMBLER PAIRS", 0, 800000, SLIDE_W, 600000, 28, COLORS.RED, true, "CENTER"));
        add(sq, textBox(q_text || "Place your wagers!", 280000, 1600000, SLIDE_W - 560000, 2800000, 22, COLORS.DARK, false, "LEFT"));
        add(sq, textBox("Place your wagers — teams bet their current score!", 0, 4600000, SLIDE_W, 400000, 16, COLORS.RED, false, "CENTER"));
      } else if (isBonus) {
        const t = qtype === "bonus_1" ? "🎯 BONUS QUESTION" : "🪙 BONUS — HEADS & TAILS";
        add(sq, textBox(t, 0, 700000, SLIDE_W, 600000, 26, COLORS.YELLOW, true, "CENTER"));
        add(sq, textBox(q_text, 280000, 1500000, SLIDE_W - 560000, 3200000, 30, COLORS.DARK, false, "CENTER"));
      } else {
        const fsize = q_text.length > 150 ? 24 : q_text.length > 80 ? 32 : 40;
        add(sq, textBox(q_text, 280000, 1000000, SLIDE_W - 560000, 4000000, fsize, COLORS.DARK, false, "CENTER"));
      }
      slideList.push(sq);
      
      // Answer slide
      const sa = newSlide(COLORS.WHITE);
      add(sa, accentBar(sa.id, accent));
      add(sa, logoRequests(sa.id));
      add(sa, textBox(`R${r}Q${qnum} — ANSWER`, 280000, 150000, 7000000, 400000, 18, {red:0.6,green:0.6,blue:0.6}, true, "LEFT"));
      if (q_text) add(sa, textBox(q_text, 280000, 700000, SLIDE_W - 560000, 900000, 16, {red:0.7,green:0.7,blue:0.7}, false, "CENTER"));
      // Big answer box
      const ansColor = (accent === COLORS.YELLOW || accent === COLORS.ORANGE) ? COLORS.DARK : COLORS.WHITE;
      const ansBox = newSlide(COLORS.WHITE); // temp — we use rect + textbox
      const boxId = `ansbox_${Math.random().toString(36).slice(2,8)}`;
      sa.requests.push({ createShape: { objectId: boxId, shapeType: "RECTANGLE", elementProperties: { pageObjectId: sa.id, size: { width: { magnitude: 7500000, unit: "EMU" }, height: { magnitude: 1800000, unit: "EMU" } }, transform: { scaleX:1, scaleY:1, translateX: 822000, translateY: 1900000, unit:"EMU" } } } });
      sa.requests.push({ updateShapeProperties: { objectId: boxId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: rgb(isBonus ? COLORS.YELLOW : accent) } } }, outline: { outlineFill: { solidFill: { color: { rgbColor: rgb(isBonus ? COLORS.YELLOW : accent) } } }, weight: { magnitude: 0, unit: "PT" } } }, fields: "shapeBackgroundFill,outline" } });
      const afsize = a_text.length > 60 ? 16 : a_text.length > 30 ? 28 : 44;
      add(sa, textBox(a_text, 922000, 1950000, 7300000, 1650000, afsize, ansColor, true, "CENTER"));
      if (fun) add(sa, textBox(`💡 ${fun}`, 280000, 4100000, SLIDE_W - 560000, 600000, 14, {red:0.6,green:0.6,blue:0.6}, false, "CENTER"));
      slideList.push(sa);
    }
    
    // Submit slide
    const ss = newSlide(COLORS.GREEN);
    add(ss, textBox(`End of Round ${r}`, 0, 1800000, SLIDE_W, 1000000, 60, COLORS.WHITE, true, "CENTER"));
    add(ss, textBox("Hit Submit in your email now ✉️", 0, 3000000, SLIDE_W, 600000, 28, COLORS.WHITE, false, "CENTER"));
    slideList.push(ss);
    
    // Ladder slide
    const sl = newSlide(COLORS.BG);
    add(sl, accentBar(sl.id, COLORS.BLUE2));
    add(sl, logoRequests(sl.id));
    add(sl, textBox("🏆 Leaderboard", 280000, 700000, 5000000, 600000, 36, COLORS.DARK, true, "LEFT"));
    add(sl, textBox("(live at end of each round)", 5500000, 800000, 3000000, 400000, 16, {red:0.6,green:0.6,blue:0.6}, false, "RIGHT"));
    const medals = ["🥇","🥈","🥉","4","5"];
    for (let i = 0; i < 5; i++) {
      const y = 1600000 + i * 680000;
      add(sl, textBox(medals[i], 280000, y, 600000, 550000, 22, COLORS.DARK, false, "LEFT"));
      add(sl, textBox(`Team ${i+1}`, 1000000, y + 100000, 5000000, 450000, 20, COLORS.DARK, true, "LEFT"));
      add(sl, textBox("—", 7800000, y + 100000, 1000000, 450000, 24, COLORS.BLUE2, true, "RIGHT"));
    }
    slideList.push(sl);
  }
  
  // ── FINAL ──
  const sf = newSlide(COLORS.BG);
  add(sf, accentBar(sf.id, COLORS.BLUE2));
  add(sf, logoRequests(sf.id));
  add(sf, textBox("Thanks for playing!", 0, 2000000, SLIDE_W, 1000000, 60, COLORS.DARK, true, "CENTER"));
  add(sf, textBox("See you next week 🍺", 0, 3200000, SLIDE_W, 500000, 22, {red:0.6,green:0.6,blue:0.6}, false, "CENTER"));
  slideList.push(sf);
  
  // 5. Delete default slide + batch create all slides
  const requests = [
    { deleteObject: { objectId: pres.slides[0].objectId } },
    ...buildSlideRequests(slideList)
  ];
  
  const batchRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests })
  });
  
  if (!batchRes.ok) {
    const err = await batchRes.text();
    return res.status(500).json({ error: "Slides API error", details: err });
  }
  
  // 6. Make it publicly shareable (view only)
  await fetch(`https://www.googleapis.com/drive/v3/files/${presId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" })
  });
  
  const slidesUrl = `https://docs.google.com/presentation/d/${presId}/edit`;
  const presentUrl = `https://docs.google.com/presentation/d/${presId}/present`;
  
  return res.json({
    ok: true,
    slides_url: slidesUrl,
    present_url: presentUrl,
    presentation_id: presId,
    venue,
    slides: slideList.length,
    event_id: event.id
  });
}
