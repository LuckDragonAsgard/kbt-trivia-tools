// KBT Trial â shared data layer
// Abstracts over Supabase (live) and localStorage (offline demo).
// Usage: drop this <script> into any page BEFORE the page's own code.

(function(){
  const SUPABASE_URL  = 'https://huvfgenbcaiicatvtxak.supabase.co';
  const REAL_ANON     = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9','eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmZnZW5iY2FpaWNhdHZ0eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTczNjIsImV4cCI6MjA5MTE5MzM2Mn0','uTgzTKYjJnkFlRUIhGfW4ODKyV24xOdKaX7lxpDuMfc'].join('.');
  const TARGET_EVENT_CODE = localStorage.getItem('kbt_event_code') || 'TEST-001';

  const MODE_KEY = 'kbtDataMode';
  function getMode(){
    const m = localStorage.getItem(MODE_KEY);
    return (m === 'offline') ? 'offline' : 'live';
  }
  function setMode(m){ localStorage.setItem(MODE_KEY, m); }

  const HEADERS = {
    apikey: REAL_ANON,
    Authorization: 'Bearer ' + REAL_ANON,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  async function pgGet(path, params){
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) throw new Error('Supabase GET ' + path + ' -> ' + res.status);
    return res.json();
  }

  async function pgPost(path, body, prefer){
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: prefer || 'return=representation' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Supabase POST ' + path + ' -> ' + res.status + ': ' + text);
    }
    return res.json();
  }

  const live = {
    async getEvents(){
      return pgGet('kbt_event', {
        select: 'id,event_code,event_description,event_date,event_status,event_location_id',
        order: 'event_date.desc'
      });
    },
    async getEventByCode(code){
      const rows = await pgGet('kbt_event', {
        select: 'id,event_code,event_description,event_date,event_status,event_location_id',
        event_code: 'eq.' + code,
        limit: 1
      });
      return rows[0] || null;
    },
    async getEventLocation(locId){
      if (!locId) return null;
      const rows = await pgGet('kbt_loc', {
        select: 'id,loc_fullname,loc_nickname,loc_suburb,loc_town,loc_dow,loc_time,prize_1st,prize_2nd,prize_bonus',
        id: 'eq.' + locId,
        limit: 1
      });
      return rows[0] || null;
    },
    async getQuizItems(eventId){
      return pgGet('kbt_quiz', {
        select: 'id,quiz_item_round,quiz_item_number,quiz_item_order,quiz_points,quiz_qtype,kbt_question:quiz_question_id(id,question_question_text,question_answer_text,question_question_supporttext,question_fun_fact,question_category_group,question_type,question_image_url,question_audio_url)',
        quiz_event_id: 'eq.' + eventId,
        order: 'quiz_item_round.asc,quiz_item_order.asc,quiz_item_number.asc'
      });
    },
    async getRegisteredTeams(eventId){
      const [official, trial] = await Promise.all([
        pgGet('kbt_sess', {
          select: 'id,display_name,created_at,team:team_id(id,team_code,team_name,is_active)',
          event_id: 'eq.' + eventId,
          order: 'created_at.asc'
        }).catch(() => []),
        pgGet('kbt_teams', {
          select: 'id,event_code,team_name,display_name,team_color,team_emoji,team_captain,team_code,created_at',
          event_code: 'eq.' + TARGET_EVENT_CODE,
          order: 'created_at.asc'
        }).catch(() => [])
      ]);
      const trialShaped = trial.map(t => ({
        id: t.id,
        display_name: t.display_name || t.team_name,
        created_at: t.created_at,
        team: {
          id: t.id,
          team_code: t.team_code || t.team_name,
          team_name: t.team_name,
          is_active: true
        },
        team_color: t.team_color,
        team_emoji: t.team_emoji,
        team_captain: t.team_captain,
        team_code: t.team_code,
        _trial: true
      }));
      return [...official, ...trialShaped];
    },
    async registerTeam(eventCode, teamName, displayName, color, emoji, captain){
      const rows = await pgPost('kbt_teams', {
        event_code: eventCode || TARGET_EVENT_CODE,
        team_name: teamName,
        display_name: displayName || teamName,
        team_color: color || null,
        team_emoji: emoji || null,
        team_captain: captain || null
      });
      return rows[0] || null;
    },
    async getAnswersForEvent(eventId){
      return pgGet('kbt_scores', {
        select: 'id,team_id,question_id,answer_text,round,points_value,created_at',
        event_id: 'eq.' + eventId
      });
    },
    async getRoundScores(code){
      return pgGet('trial_scores', {
        select: 'team_name,round,points',
        event_code: 'eq.' + (code || TARGET_EVENT_CODE),
        question_number: 'eq.0'
      });
    },
    async submitRoundScore(eventCode, teamName, round, points, questionNumber){
      const rows = await pgPost(
        'trial_scores?on_conflict=event_code,team_name,round,question_number',
        {
          event_code: eventCode || TARGET_EVENT_CODE,
          team_name: teamName,
          round: round,
          question_number: (typeof questionNumber === 'number' ? questionNumber : 0),
          points: parseInt(points) || 0
        },
        'resolution=merge-duplicates,return=representation'
      );
      return rows[0] || null;
    },
    async getAllScores(eventCode){
      return pgGet('trial_scores', {
        select: 'team_name,round,question_number,points',
        event_code: 'eq.' + (eventCode || TARGET_EVENT_CODE)
      }).catch(() => []);
    },
    async getLeaderboard(eventCode){
      const scores = await pgGet('trial_scores', {
        select: 'team_name,round,points',
        event_code: 'eq.' + (eventCode || TARGET_EVENT_CODE),
        question_number: 'eq.0'
      });
      const totals = {};
      scores.forEach(function(s){ totals[s.team_name] = (totals[s.team_name] || 0) + (s.points || 0); });
      return Object.entries(totals)
        .map(function([team_name, total]){ return { team_name: team_name, total: total }; })
        .sort(function(a, b){ return b.total - a.total; });
    },
    async getTeamMembers(eventCode){
      return pgGet('kbt_team_member', {
        select: 'id,team_id,team_code,player_name,player_code,is_captain,created_at',
        event_code: 'eq.' + (eventCode || TARGET_EVENT_CODE),
        order: 'is_captain.desc,created_at.asc'
      }).catch(() => []);
    },
    async submitWager(eventCode, teamName, round, questionNumber, wagerAmount, wasCorrect){
      return pgPost('kbt_wager', {
        event_code: eventCode || TARGET_EVENT_CODE,
        team_name: teamName,
        round: round,
        question_number: questionNumber,
        wager_amount: wagerAmount || 0,
        was_correct: typeof wasCorrect === 'boolean' ? wasCorrect : null
      }, 'resolution=merge-duplicates,return=representation');
    },
    async submitPlayerAnswer(eventCode, teamName, round, questionNumber, answerText){
      // Player-side text answer submission. Writes selected_option (answer text) and
      // leaves is_correct null until the host grades it.
      return pgPost('kbt_live_answers', {
        event_code: eventCode || TARGET_EVENT_CODE,
        team_name: teamName,
        round: round,
        question_number: questionNumber,
        selected_option: String(answerText || '').slice(0, 500),
        is_correct: null,
        points_awarded: 0
      }, 'return=representation').catch(function(e){
        console.warn('[kbt] player answer write failed:', e && e.message);
        return null;
      });
    },
    async getLiveAnswers(eventCode){
      // Host-side: pull all submitted player answers for the event, newest first
      return pgGet('kbt_live_answers', {
        select: 'id,team_name,round,question_number,selected_option,is_correct,points_awarded,submitted_at',
        event_code: 'eq.' + (eventCode || TARGET_EVENT_CODE),
        order: 'submitted_at.desc'
      }).catch(function(){ return []; });
    },
    async gradeLiveAnswer(answerId, isCorrect, pointsAwarded){
      // Host-side: grade an incoming player answer
      var url = SUPABASE_URL + '/rest/v1/kbt_live_answers?id=eq.' + encodeURIComponent(answerId);
      return fetch(url, {
        method: 'PATCH',
        headers: { ...HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify({ is_correct: !!isCorrect, points_awarded: parseInt(pointsAwarded) || 0 })
      }).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
    },
    async submitLiveAnswer(eventCode, teamName, round, questionNumber, isCorrect, pointsAwarded){
      // Dual-write companion to submitRoundScore — captures host's per-question marks in the
      // canonical kbt_live_answers table (extended schema added in v7). Best-effort: never
      // blocks the UX if the write fails.
      return pgPost('kbt_live_answers', {
        event_code: eventCode || TARGET_EVENT_CODE,
        team_name: teamName,
        round: round,
        question_number: questionNumber,
        is_correct: !!isCorrect,
        points_awarded: parseInt(pointsAwarded) || 0
      }, 'resolution=merge-duplicates,return=representation').catch(function(e){
        console.warn('[kbt] kbt_live_answers write failed:', e && e.message);
        return null;
      });
    }
  };

  const offline = {
    async getEvents(){
      return [{
        id: 'offline-event',
        event_code: 'OFFLINE-DEMO',
        event_description: 'Offline Demo Night',
        event_date: new Date().toISOString().slice(0,10),
        event_status: 'active',
        event_location_id: null
      }];
    },
    async getEventByCode(){ return (await offline.getEvents())[0]; },
    async getEventLocation(){ return { loc_fullname: 'Offline Pub', loc_nickname: 'Offline', loc_suburb: 'Demo' }; },
    async getQuizItems(){ return []; },
    async getRegisteredTeams(){
      let teams = [];
      try { teams = JSON.parse(localStorage.getItem('kbtTeams') || '[]'); } catch(e){}
      return teams.map(t => ({
        id: 'offline-' + t.code,
        display_name: t.name,
        team: { id: 'offline-t-' + t.code, team_code: t.code, team_name: t.name, is_active: true }
      }));
    },
    async registerTeam(eventCode, teamName, displayName, color, emoji, captain){
      let teams = [];
      try { teams = JSON.parse(localStorage.getItem('kbtTeams') || '[]'); } catch(e){}
      const entry = { code: teamName, name: displayName || teamName, color, emoji, captain: captain || null, eventCode };
      teams.push(entry);
      localStorage.setItem('kbtTeams', JSON.stringify(teams));
      return entry;
    },
    async getAnswersForEvent(){ return []; },
    async getRoundScores(code){ return []; },
    async getAllScores(){ return []; },
    async submitRoundScore(eventCode, teamName, round, points, questionNumber){
      let scores = {};
      try { scores = JSON.parse(localStorage.getItem('kbtScores') || '{}'); } catch(e){}
      if (!scores[teamName]) scores[teamName] = {};
      scores[teamName]['R' + round] = parseInt(points) || 0;
      localStorage.setItem('kbtScores', JSON.stringify(scores));
      return { team_name: teamName, round: round, points: parseInt(points) || 0 };
    },
    async getTeamMembers(){ return []; },
    async submitWager(){ return null; },
        async getLeaderboard(){
      let scores = {};
      try { scores = JSON.parse(localStorage.getItem('kbtScores') || '{}'); } catch(e){}
      return Object.entries(scores)
        .map(function([name, rounds]){ return { team_name: name, total: Object.values(rounds).reduce(function(s,v){ return s+(v||0); }, 0) }; })
        .sort(function(a, b){ return b.total - a.total; });
    }
  };

  const api = {
    mode: getMode,
    setMode,
    TARGET_EVENT_CODE,
    SUPABASE_URL,
    async ready(){ return true; },
    async getEvents(){ return (getMode()==='live' ? live : offline).getEvents(); },
    async getEventByCode(c){ return (getMode()==='live' ? live : offline).getEventByCode(c); },
    async getEventLocation(id){ return (getMode()==='live' ? live : offline).getEventLocation(id); },
    async getQuizItems(eid){ return (getMode()==='live' ? live : offline).getQuizItems(eid); },
    async getRegisteredTeams(eid){ return (getMode()==='live' ? live : offline).getRegisteredTeams(eid); },
    async registerTeam(code, name, display, color, emoji, captain){
      return (getMode()==='live' ? live : offline).registerTeam(code, name, display, color, emoji, captain);
    },
    async getRoundScores(code){
      return (getMode()==='live' ? live : offline).getRoundScores(code);
    },
    async submitRoundScore(code, name, round, points, questionNumber){
      return (getMode()==='live' ? live : offline).submitRoundScore(code, name, round, points, questionNumber);
    },
    async getAllScores(code){
      return (getMode()==='live' ? live : offline).getAllScores(code);
    },
    async getLeaderboard(code){
      return (getMode()==='live' ? live : offline).getLeaderboard(code);
    },
    async getAnswersForEvent(eid){ return (getMode()==='live' ? live : offline).getAnswersForEvent(eid); },
    async getTeamMembers(code){ return (getMode()==='live' ? live : offline).getTeamMembers(code); },
    async submitWager(code, teamName, round, qNum, amount, wasCorrect){
      return (getMode()==='live' ? live : offline).submitWager(code, teamName, round, qNum, amount, wasCorrect);
    },
    async submitPlayerAnswer(code, teamName, round, questionNumber, answerText){
      if (getMode() !== 'live') return null;
      return live.submitPlayerAnswer(code, teamName, round, questionNumber, answerText);
    },
    async getLiveAnswers(code){
      if (getMode() !== 'live') return [];
      return live.getLiveAnswers ? live.getLiveAnswers(code) : [];
    },
    async gradeLiveAnswer(id, isCorrect, points){
      if (getMode() !== 'live') return null;
      return live.gradeLiveAnswer ? live.gradeLiveAnswer(id, isCorrect, points) : null;
    },

    shapeQuestion(row){
      const q = row.kbt_question || {};
      return {
        id: row.id,
        round: row.quiz_item_round,
        number: row.quiz_item_number,
        order: row.quiz_item_order,
        points: row.quiz_points || 1,
        qtype: row.quiz_qtype || 'GENERAL',
        text: q.question_question_text || '',
        answer: q.question_answer_text || '',
        support: q.question_question_supporttext || '',
        funFact: q.question_fun_fact || '',
        category: q.question_category_group || q.question_type || '',
        imageUrl: q.question_image_url || null,
        audioUrl: q.question_audio_url || null
      };
    }
  };

  window.kbtData = api;
})();
