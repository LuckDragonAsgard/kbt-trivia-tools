// slides-export.js - KBT Google Slides leaderboard export
// Requires GIS: <script src="https://accounts.google.com/gsi/client" async defer></script>
(function() {
  var GCID = '342815819710-sugohi5jr60hs2mfv1vgi4apfp3p2bjc.apps.googleusercontent.com';
  var _tc = null, _tok = null;
  function getTC() {
    if (_tc) return _tc;
    if (typeof google === 'undefined' || !google.accounts) { alert('GIS not loaded'); return null; }
    _tc = google.accounts.oauth2.initTokenClient({
      client_id: GCID, scope: 'https://www.googleapis.com/auth/presentations',
      callback: async function(resp) {
        var btn = document.getElementById('btn-export-slides');
        if (resp.error) { alert('Sign-in failed: ' + resp.error); if(btn){btn.disabled=false;btn.textContent='Export to Slides';} return; }
        _tok = resp.access_token; await _doExport(_tok);
      }
    });
    return _tc;
  }
  window.exportLeaderboardToSlides = async function() {
    var btn = document.getElementById('btn-export-slides');
    if (btn) { btn.disabled=true; btn.textContent='Exporting...'; }
    var tc = getTC(); if (!tc) { if(btn){btn.disabled=false;btn.textContent='Export to Slides';} return; }
    if (_tok) { await _doExport(_tok); } else { tc.requestAccessToken(); }
  };
  async function _api(m, url, body) {
    var res = await fetch(url, { method:m, headers:{'Authorization':'Bearer '+_tok,'Content-Type':'application/json'}, body:body?JSON.stringify(body):undefined });
    var d = await res.json(); if(!res.ok) throw new Error('Slides API '+res.status+': '+JSON.stringify(d)); return d;
  }
  async function _doExport(tok) {
    var btn = document.getElementById('btn-export-slides'); _tok = tok;
    try {
      var code = (window._kbtHostEventCode)||(window.kbtData&&window.kbtData.TARGET_EVENT_CODE)||'KBT';
      var lb = await window.kbtData.getLeaderboard(code);
      if (!lb||!lb.length){alert('No scores yet.');if(btn){btn.disabled=false;btn.textContent='Export to Slides';}return;}
      var dateStr = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
      var pres = await _api('POST','https://slides.googleapis.com/v1/presentations',{title:'KBT Results - '+dateStr});
      var presId=pres.presentationId,s0=pres.slides[0],s0Id=s0.objectId,el=s0.pageElements||[];
      var tEl=el.find(function(e){return e.shape&&e.shape.placeholder&&['CENTERED_TITLE','TITLE'].includes(e.shape.placeholder.type);}),
          sEl=el.find(function(e){return e.shape&&e.shape.placeholder&&e.shape.placeholder.type==='SUBTITLE';});
      var r=[];
      if(tEl){r.push({insertText:{objectId:tEl.objectId,text:'Know Brainer Trivia',insertionIndex:0}});r.push({updateTextStyle:{objectId:tEl.objectId,textRange:{type:'ALL'},style:{bold:true,fontSize:{magnitude:40,unit:'PT'}},fields:'bold,fontSize'}});}
      if(sEl) r.push({insertText:{objectId:sEl.objectId,text:dateStr+' - '+code,insertionIndex:0}});
      r.push({updatePageProperties:{objectId:s0Id,pageProperties:{pageBackgroundFill:{solidFill:{color:{rgbColor:{red:0.07,green:0.07,blue:0.14}}}}},fields:'pageBackgroundFill'}});
      if(tEl) r.push({updateTextStyle:{objectId:tEl.objectId,textRange:{type:'ALL'},style:{foregroundColor:{opaqueColor:{rgbColor:{red:1,green:1,blue:1}}}},fields:'foregroundColor'}});
      if(sEl) r.push({updateTextStyle:{objectId:sEl.objectId,textRange:{type:'ALL'},style:{foregroundColor:{opaqueColor:{rgbColor:{red:.8,green:.8,blue:.9}}}},fields:'foregroundColor'}});
      var lbSId='slide_lb_'+Date.now(),lbBId='lb_box_'+Date.now();
      r.push({insertSlide:{insertionIndex:1,objectId:lbSId,slideLayoutReference:{predefinedLayout:'BLANK'}}});
      r.push({updatePageProperties:{objectId:lbSId,pageProperties:{pageBackgroundFill:{solidFill:{color:{rgbColor:{red:0.07,green:0.07,blue:0.14}}}}},fields:'pageBackgroundFill'}});
      r.push({createShape:{objectId:lbBId,shapeType:'TEXT_BOX',elementProperties:{pageObjectId:lbSId,size:{height:{magnitude:310,unit:'PT'},width:{magnitude:620,unit:'PT'}},transform:{scaleX:1,scaleY:1,translateX:50,translateY:60,unit:'PT'}}}});
      var lbText='Trophy  Final Leaderboard

'+lb.map(function(t,i){return(i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'.')+' '+t.team_name+' - '+t.total+' pts';}).join('
');
      r.push({insertText:{objectId:lbBId,text:lbText,insertionIndex:0}});
      r.push({updateTextStyle:{objectId:lbBId,textRange:{type:'FIXED_RANGE',startIndex:0,endIndex:20},style:{bold:true,fontSize:{magnitude:30,unit:'PT'},foregroundColor:{opaqueColor:{rgbColor:{red:1,green:.85,blue:.2}}}},fields:'bold,fontSize,foregroundColor'}});
      r.push({updateTextStyle:{objectId:lbBId,textRange:{type:'FROM_START_INDEX',startIndex:22},style:{fontSize:{magnitude:22,unit:'PT'},foregroundColor:{opaqueColor:{rgbColor:{red:1,green:1,blue:1}}}},fields:'fontSize,foregroundColor'}});
      r.push({updateParagraphStyle:{objectId:lbBId,textRange:{type:'ALL'},style:{lineSpacing:140},fields:'lineSpacing'}});
      await _api('POST','https://slides.googleapis.com/v1/presentations/'+presId+':batchUpdate',{requests:r});
      window.open('https://docs.google.com/presentation/d/'+presId+'/edit','_blank');
      if(btn){btn.disabled=false;btn.textContent='Opened in Slides!';}
      setTimeout(function(){if(btn)btn.textContent='Export to Slides';},4000);
    } catch(err){alert('Export failed:
'+err.message);if(btn){btn.disabled=false;btn.textContent='Export to Slides';}}
  }
})();
