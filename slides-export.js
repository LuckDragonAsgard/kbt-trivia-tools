// slides-export.js - KBT Google Slides leaderboard export (branded)
// Requires GIS: <script src="https://accounts.google.com/gsi/client" async defer></script>
(function() {
  var GCID = '342815819710-sugohi5jr60hs2mfv1vgi4apfp3p2bjc.apps.googleusercontent.com';
  var SB_URL = 'https://huvfgenbcaiicatvtxak.supabase.co/rest/v1';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmZnZW5iY2FpaWNhdHZ0eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTczNjIsImV4cCI6MjA5MTE5MzM2Mn0.uTgzTKYjJnkFlRUIhGfW4ODKyV24xOdKaX7lxpDuMfc';
  var SB_H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  // KBT brand
  var BRAND = {
    blue:    { red: 0.173, green: 0.580, blue: 0.761 },  // #2C94C2
    yellow:  { red: 0.984, green: 0.773, blue: 0.000 },  // #FBC500
    charcoal:{ red: 0.220, green: 0.216, blue: 0.216 },  // #383737
    bg:      { red: 0.973, green: 0.980, blue: 0.988 },  // #F8FAFC
    white:   { red: 1, green: 1, blue: 1 },
    black:   { red: 0, green: 0, blue: 0 },
    dim:     { red: 0.5, green: 0.5, blue: 0.5 }
  };

  var _tc = null, _tok = null;
  function getTC() {
    if (_tc) return _tc;
    if (typeof google === 'undefined' || !google.accounts) { alert('GIS not loaded'); return null; }
    _tc = google.accounts.oauth2.initTokenClient({
      client_id: GCID,
      scope: 'https://www.googleapis.com/auth/presentations',
      callback: async function(resp) {
        var btn = document.getElementById('btn-export-slides');
        if (resp.error) { alert('Sign-in failed: ' + resp.error); if(btn){btn.disabled=false;btn.textContent='Export to Slides';} return; }
        _tok = resp.access_token;
        await _doExport(_tok);
      }
    });
    return _tc;
  }

  window.exportLeaderboardToSlides = async function() {
    var btn = document.getElementById('btn-export-slides');
    if (btn) { btn.disabled = true; btn.textContent = 'Exporting...'; }
    var tc = getTC();
    if (!tc) { if (btn) { btn.disabled = false; btn.textContent = 'Export to Slides'; } return; }
    if (_tok) { await _doExport(_tok); } else { tc.requestAccessToken(); }
  };

  async function _api(m, url, body) {
    var res = await fetch(url, {
      method: m,
      headers: { 'Authorization': 'Bearer ' + _tok, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    var d = await res.json();
    if (!res.ok) throw new Error('Slides API ' + res.status + ': ' + JSON.stringify(d));
    return d;
  }

  async function _sbGet(path, params) {
    var url = new URL(SB_URL + '/' + path);
    if (params) Object.entries(params).forEach(function(e){ url.searchParams.set(e[0], e[1]); });
    var r = await fetch(url.toString(), { headers: SB_H });
    if (!r.ok) throw new Error('Supabase ' + r.status + ' for ' + path);
    return r.json();
  }

  function buildLeaderboard(scores) {
    var totals = {};
    scores.forEach(function(s){ totals[s.team_name] = (totals[s.team_name]||0) + (s.points||0); });
    return Object.entries(totals).map(function(p){ return { team_name: p[0], total: p[1] }; })
      .sort(function(a,b){ return b.total - a.total; });
  }

  function buildPerRound(scores) {
    // scores: [{team_name, round, points}]
    var byTeam = {}; var rounds = new Set();
    scores.forEach(function(s){
      if (!byTeam[s.team_name]) byTeam[s.team_name] = {};
      byTeam[s.team_name][s.round] = (byTeam[s.team_name][s.round]||0) + (s.points||0);
      rounds.add(s.round);
    });
    var roundList = Array.from(rounds).sort(function(a,b){ return a-b; });
    var teams = Object.keys(byTeam).map(function(n){
      var per = roundList.map(function(r){ return byTeam[n][r]||0; });
      return { team_name: n, per_round: per, total: per.reduce(function(a,b){return a+b;},0) };
    }).sort(function(a,b){ return b.total - a.total; });
    return { rounds: roundList, teams: teams };
  }

  async function _doExport(tok) {
    var btn = document.getElementById('btn-export-slides');
    _tok = tok;
    try {
      var code = (window._kbtHostEventCode) || (window.kbtData && window.kbtData.TARGET_EVENT_CODE) || 'KBT';

      // Fetch event meta, teams (for emojis), and ALL round scores
      var ev = (await _sbGet('kbt_event', {
        select: 'event_code,event_description,event_date',
        event_code: 'eq.' + code,
        limit: 1
      }))[0] || { event_code: code };

      var teams = await _sbGet('kbt_teams', {
        select: 'team_name,display_name,team_emoji,team_captain',
        event_code: 'eq.' + code
      });
      var emojiByTeam = {};
      teams.forEach(function(t){ emojiByTeam[t.team_name] = t.team_emoji || '🧠'; });

      var allScores = await _sbGet('trial_scores', {
        select: 'team_name,round,points',
        event_code: 'eq.' + code,
        question_number: 'eq.0'
      });

      if (!allScores.length) { alert('No scores yet.'); if (btn) { btn.disabled = false; btn.textContent = 'Export to Slides'; } return; }

      var lb = buildLeaderboard(allScores);
      var perRound = buildPerRound(allScores);

      var dateStr = ev.event_date
        ? new Date(ev.event_date).toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' });
      var venue = ev.event_description || '';

      // 1. Create deck
      var pres = await _api('POST', 'https://slides.googleapis.com/v1/presentations', {
        title: 'KBT Results — ' + (venue || code) + ' — ' + dateStr
      });
      var presId = pres.presentationId;
      var s0 = pres.slides[0], s0Id = s0.objectId;

      var requests = [];

      // ============== SLIDE 1: TITLE ==============
      // Charcoal bg, "KNOW" white + "BRAINER" yellow, subtitle date+venue
      requests.push({
        updatePageProperties: {
          objectId: s0Id,
          pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: BRAND.charcoal } } } },
          fields: 'pageBackgroundFill'
        }
      });
      // Replace any existing placeholders by deleting them, then create our own boxes
      (s0.pageElements || []).forEach(function(e){
        requests.push({ deleteObject: { objectId: e.objectId } });
      });
      // Big logo "KNOWBRAINER" — split into two text boxes for color
      var logoTopId = 'logo_top_' + Date.now();
      var logoBotId = 'logo_bot_' + Date.now();
      var dateBoxId = 'date_box_' + Date.now();
      var venueBoxId = 'venue_box_' + Date.now();
      requests.push({
        createShape: {
          objectId: logoTopId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: s0Id,
            size: { height: { magnitude: 80, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 110, unit: 'PT' } }
        }
      });
      requests.push({ insertText: { objectId: logoTopId, text: 'KNOW BRAINER', insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: logoTopId, textRange: { type: 'FIXED_RANGE', startIndex: 0, endIndex: 5 }, style: { bold: true, fontSize: { magnitude: 72, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.white } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateTextStyle: { objectId: logoTopId, textRange: { type: 'FIXED_RANGE', startIndex: 5, endIndex: 13 }, style: { bold: true, fontSize: { magnitude: 72, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.yellow } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: logoTopId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      requests.push({
        createShape: {
          objectId: logoBotId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: s0Id,
            size: { height: { magnitude: 50, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 200, unit: 'PT' } }
        }
      });
      requests.push({ insertText: { objectId: logoBotId, text: 'TRIVIA NIGHT — RESULTS', insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: logoBotId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 22, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.blue } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: logoBotId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      requests.push({
        createShape: {
          objectId: venueBoxId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: s0Id,
            size: { height: { magnitude: 35, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 290, unit: 'PT' } }
        }
      });
      requests.push({ insertText: { objectId: venueBoxId, text: venue || code, insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: venueBoxId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: 20, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.white } }, fontFamily: 'Open Sans' }, fields: 'fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: venueBoxId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      requests.push({
        createShape: {
          objectId: dateBoxId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: s0Id,
            size: { height: { magnitude: 30, unit: 'PT' }, width: { magnitude: 600, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 330, unit: 'PT' } }
        }
      });
      requests.push({ insertText: { objectId: dateBoxId, text: dateStr, insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: dateBoxId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: 16, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.dim } }, fontFamily: 'Open Sans' }, fields: 'fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: dateBoxId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      // ============== SLIDE 2: PODIUM (top 3) ==============
      var podiumSlideId = 'slide_podium_' + Date.now();
      requests.push({ createSlide: { objectId: podiumSlideId, slideLayoutReference: { predefinedLayout: 'BLANK' }, insertionIndex: 1 } });
      requests.push({ updatePageProperties: { objectId: podiumSlideId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: BRAND.charcoal } } } }, fields: 'pageBackgroundFill' } });

      var podiumTitleId = 'podium_t_' + Date.now();
      requests.push({ createShape: { objectId: podiumTitleId, shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: podiumSlideId,
          size: { height: { magnitude: 50, unit: 'PT' }, width: { magnitude: 700, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 10, translateY: 30, unit: 'PT' } } } });
      requests.push({ insertText: { objectId: podiumTitleId, text: '🏆 The Podium', insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: podiumTitleId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 36, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.yellow } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: podiumTitleId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      // 1st (centre, biggest), 2nd (left), 3rd (right)
      var medals = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
      var positions = [
        { x: 240, y: 110, w: 240, h: 280, fs: 32, accent: BRAND.yellow },  // 1st centre
        { x:  20, y: 160, w: 220, h: 230, fs: 26, accent: BRAND.white  },  // 2nd left
        { x: 480, y: 200, w: 220, h: 190, fs: 22, accent: BRAND.white  }   // 3rd right
      ];
      for (var i = 0; i < 3 && i < lb.length; i++) {
        var t = lb[i];
        var em = emojiByTeam[t.team_name] || '🧠';
        var pos = positions[i];
        var cardId = 'pod_card_' + i + '_' + Date.now();
        requests.push({ createShape: { objectId: cardId, shapeType: 'ROUND_RECTANGLE',
          elementProperties: { pageObjectId: podiumSlideId,
            size: { height: { magnitude: pos.h, unit: 'PT' }, width: { magnitude: pos.w, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: pos.x, translateY: pos.y, unit: 'PT' } } } });
        requests.push({ updateShapeProperties: { objectId: cardId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: BRAND.blue }, alpha: 0.9 } }, outline: { outlineFill: { solidFill: { color: { rgbColor: pos.accent } } }, weight: { magnitude: 3, unit: 'PT' } } }, fields: 'shapeBackgroundFill,outline' } });
        requests.push({ insertText: { objectId: cardId, text: medals[i] + '\n\n' + em + '\n\n' + t.team_name + '\n\n' + t.total + ' pts', insertionIndex: 0 } });
        requests.push({ updateParagraphStyle: { objectId: cardId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });
        requests.push({ updateTextStyle: { objectId: cardId, textRange: { type: 'ALL' }, style: { foregroundColor: { opaqueColor: { rgbColor: BRAND.white } }, fontFamily: 'Open Sans', fontSize: { magnitude: pos.fs * 0.45, unit: 'PT' } }, fields: 'foregroundColor,fontFamily,fontSize' } });
        // Make medal line + team name extra big
        requests.push({ updateTextStyle: { objectId: cardId, textRange: { type: 'FIXED_RANGE', startIndex: 0, endIndex: medals[i].length }, style: { bold: true, fontSize: { magnitude: pos.fs, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: pos.accent } } }, fields: 'bold,fontSize,foregroundColor' } });
      }

      // ============== SLIDE 3: FULL LEADERBOARD ==============
      var lbSlideId = 'slide_lb_' + Date.now();
      requests.push({ createSlide: { objectId: lbSlideId, slideLayoutReference: { predefinedLayout: 'BLANK' }, insertionIndex: 2 } });
      requests.push({ updatePageProperties: { objectId: lbSlideId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: BRAND.bg } } } }, fields: 'pageBackgroundFill' } });

      var lbTitleId = 'lb_t_' + Date.now();
      requests.push({ createShape: { objectId: lbTitleId, shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: lbSlideId,
          size: { height: { magnitude: 45, unit: 'PT' }, width: { magnitude: 700, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 10, translateY: 25, unit: 'PT' } } } });
      requests.push({ insertText: { objectId: lbTitleId, text: '🏆 Final Leaderboard', insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: lbTitleId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 32, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.charcoal } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: lbTitleId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

      var lbBoxId = 'lb_box_' + Date.now();
      requests.push({ createShape: { objectId: lbBoxId, shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: lbSlideId,
          size: { height: { magnitude: 320, unit: 'PT' }, width: { magnitude: 640, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 40, translateY: 80, unit: 'PT' } } } });
      var lbText = lb.map(function(t, i) {
        var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ' + (i+1) + '.';
        var em = emojiByTeam[t.team_name] || '🧠';
        return medal + '  ' + em + '  ' + t.team_name + '  —  ' + t.total + ' pts';
      }).join('\n');
      requests.push({ insertText: { objectId: lbBoxId, text: lbText, insertionIndex: 0 } });
      requests.push({ updateTextStyle: { objectId: lbBoxId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: 20, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.charcoal } }, fontFamily: 'Open Sans' }, fields: 'fontSize,foregroundColor,fontFamily' } });
      requests.push({ updateParagraphStyle: { objectId: lbBoxId, textRange: { type: 'ALL' }, style: { lineSpacing: 140 }, fields: 'lineSpacing' } });

      // ============== SLIDE 4: PER-ROUND BREAKDOWN ==============
      if (perRound.rounds.length > 1) {
        var prSlideId = 'slide_pr_' + Date.now();
        requests.push({ createSlide: { objectId: prSlideId, slideLayoutReference: { predefinedLayout: 'BLANK' }, insertionIndex: 3 } });
        requests.push({ updatePageProperties: { objectId: prSlideId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: BRAND.bg } } } }, fields: 'pageBackgroundFill' } });

        var prTitleId = 'pr_t_' + Date.now();
        requests.push({ createShape: { objectId: prTitleId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: prSlideId,
            size: { height: { magnitude: 45, unit: 'PT' }, width: { magnitude: 700, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 10, translateY: 25, unit: 'PT' } } } });
        requests.push({ insertText: { objectId: prTitleId, text: '📊 Round-by-Round', insertionIndex: 0 } });
        requests.push({ updateTextStyle: { objectId: prTitleId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 32, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.charcoal } }, fontFamily: 'Open Sans' }, fields: 'bold,fontSize,foregroundColor,fontFamily' } });
        requests.push({ updateParagraphStyle: { objectId: prTitleId, textRange: { type: 'ALL' }, style: { alignment: 'CENTER' }, fields: 'alignment' } });

        var prBoxId = 'pr_box_' + Date.now();
        requests.push({ createShape: { objectId: prBoxId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: prSlideId,
            size: { height: { magnitude: 320, unit: 'PT' }, width: { magnitude: 660, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 80, unit: 'PT' } } } });

        // Header line + rows
        var header = 'Team' + ' '.repeat(20) + perRound.rounds.map(function(r){ return 'R'+r; }).join('   ') + '   Total';
        var rows = perRound.teams.map(function(t){
          var em = emojiByTeam[t.team_name] || '🧠';
          var nameCol = (em + ' ' + t.team_name).padEnd(24, ' ');
          var perCol = t.per_round.map(function(p){ return String(p).padStart(2,' '); }).join('   ');
          return nameCol + perCol + '   ' + t.total;
        }).join('\n');
        requests.push({ insertText: { objectId: prBoxId, text: header + '\n' + '─'.repeat(60) + '\n' + rows, insertionIndex: 0 } });
        requests.push({ updateTextStyle: { objectId: prBoxId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: 14, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: BRAND.charcoal } }, fontFamily: 'Roboto Mono' }, fields: 'fontSize,foregroundColor,fontFamily' } });
        requests.push({ updateTextStyle: { objectId: prBoxId, textRange: { type: 'FIXED_RANGE', startIndex: 0, endIndex: header.length }, style: { bold: true, foregroundColor: { opaqueColor: { rgbColor: BRAND.blue } } }, fields: 'bold,foregroundColor' } });
        requests.push({ updateParagraphStyle: { objectId: prBoxId, textRange: { type: 'ALL' }, style: { lineSpacing: 130 }, fields: 'lineSpacing' } });
      }

      // ============== SLIDE FOOTER on every slide ==============
      // (Skipping footer to keep deck simple for now; could add later)

      await _api('POST', 'https://slides.googleapis.com/v1/presentations/' + presId + ':batchUpdate', { requests: requests });
      window.open('https://docs.google.com/presentation/d/' + presId + '/edit', '_blank');
      if (btn) { btn.disabled = false; btn.textContent = 'Opened in Slides!'; }
      setTimeout(function(){ if (btn) btn.textContent = 'Export to Slides'; }, 4000);
    } catch (err) {
      alert('Export failed:\n' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Export to Slides'; }
    }
  }
})();
