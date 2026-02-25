/**
 * BKIG Terminal — Meeting Intelligence (Call Report style notes)
 * 노트 목록, 작성/편집, PDF 내보내기, Save to Server.
 */
(function () {
  'use strict';

  var currentMeetingNoteId = null;

  function getMeetingIntelFormData() {
    var tickerEl = document.getElementById('mi-ticker');
    var meetingTypeEl = document.getElementById('mi-meeting-type');
    var sentimentEl = document.getElementById('mi-sentiment');
    var attendeesEl = document.getElementById('mi-attendees');
    var summaryEl = document.getElementById('mi-executive-summary');
    var discussionEl = document.getElementById('mi-main-discussion');
    var listEl = document.getElementById('mi-next-actions-list');
    var actions = [];
    if (listEl) {
      listEl.querySelectorAll('.mi-next-action-row').forEach(function (row) {
        var assignee = row.querySelector('.mi-action-assignee');
        var deadline = row.querySelector('.mi-action-deadline');
        actions.push({
          assignee: (assignee && assignee.value) ? assignee.value.trim() : '',
          deadline: (deadline && deadline.value) ? deadline.value.trim() : ''
        });
      });
    }
    return {
      ticker: (tickerEl && tickerEl.value) ? tickerEl.value.trim() : '',
      meetingType: (meetingTypeEl && meetingTypeEl.value) ? meetingTypeEl.value : 'IC',
      sentiment: (sentimentEl && sentimentEl.value) ? sentimentEl.value : 'Neutral',
      attendees: (attendeesEl && attendeesEl.value) ? attendeesEl.value.trim() : '',
      executiveSummary: (summaryEl && summaryEl.value) ? summaryEl.value.trim() : '',
      mainDiscussion: (discussionEl && discussionEl.value) ? discussionEl.value.trim() : '',
      nextActions: actions
    };
  }

  function escapeHtmlPdf(s) {
    if (s == null || s === '') return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  function buildMeetingIntelPdfHtml(data) {
    var actionsHtml = '';
    if (data.nextActions && data.nextActions.length) {
      actionsHtml = '<div style="margin-bottom:12px;"><div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:10px;text-transform:uppercase;">Next Actions</div><ul style="margin:0;padding-left:18px;color:#1e293b;">';
      data.nextActions.forEach(function (a) {
        var line = (a.assignee || '—') + (a.deadline ? ' · Due ' + a.deadline : '');
        actionsHtml += '<li style="margin-bottom:4px;">' + escapeHtmlPdf(line) + '</li>';
      });
      actionsHtml += '</ul></div>';
    }
    return '<div style="text-align:center;font-size:14px;font-weight:700;color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:16px;">BKIG INTERNAL INTELLIGENCE</div>' +
      '<div style="margin-bottom:12px;"><div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:10px;text-transform:uppercase;">Overview</div>' +
      '<div style="display:flex;gap:24px;margin-bottom:8px;flex-wrap:wrap;"><span style="font-size:10px;color:#1e293b;"><strong style="color:#475569;">Ticker:</strong> ' + escapeHtmlPdf(data.ticker || '—') + '</span>' +
      '<span style="font-size:10px;color:#1e293b;"><strong style="color:#475569;">Meeting Type:</strong> ' + escapeHtmlPdf(data.meetingType) + '</span>' +
      '<span style="font-size:10px;color:#1e293b;"><strong style="color:#475569;">Sentiment:</strong> ' + escapeHtmlPdf(data.sentiment) + '</span></div>' +
      '<div style="font-size:10px;color:#1e293b;"><strong style="color:#475569;">Attendees:</strong> ' + escapeHtmlPdf(data.attendees || '—') + '</div></div>' +
      '<div style="margin-bottom:12px;"><div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:10px;text-transform:uppercase;">Executive Summary</div><p style="margin:0 0 8px 0;color:#1e293b;">' + escapeHtmlPdf(data.executiveSummary || '—') + '</p></div>' +
      '<div style="margin-bottom:12px;"><div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:10px;text-transform:uppercase;">Main Discussion</div><p style="margin:0 0 8px 0;white-space:pre-wrap;color:#1e293b;">' + escapeHtmlPdf(data.mainDiscussion || '—') + '</p></div>' +
      actionsHtml;
  }

  function escapeHtmlForList(s) {
    if (s == null || s === '') return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** PDF 생성 전: hidden 제거 후 화면에 그려지게 해 html2canvas가 캡처할 수 있게 함 */
  function preparePdfSource(el) {
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '210mm';
    el.style.minHeight = '297mm';
    el.style.zIndex = '99999';
    el.style.opacity = '0.02';
    el.style.pointerEvents = 'none';
    el.style.visibility = 'visible';
  }

  /** 브라우저가 한 번 그린 뒤에 콜백 실행 (html2canvas 캡처 전용) */
  function afterPaint(callback) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(callback, 50);
      });
    });
  }

  /** PDF 생성 후: 다시 숨김 처리 */
  function restorePdfSource(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.minHeight = '';
    el.style.zIndex = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    el.style.visibility = '';
  }

  function loadMeetingNotesList() {
    var listContainer = document.getElementById('meeting-intel-notes-list');
    var emptyEl = document.getElementById('meeting-intel-notes-empty');
    if (!listContainer) return;
    if (emptyEl) emptyEl.style.display = '';
    listContainer.querySelectorAll('.meeting-intel-note-row').forEach(function (row) { row.remove(); });
    fetch('/api/meeting-notes', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('' + res.status)); })
      .then(function (data) {
        var notes = (data && data.notes) || [];
        if (emptyEl) emptyEl.style.display = notes.length ? 'none' : '';
        notes.forEach(function (n) {
          var li = document.createElement('li');
          li.className = 'meeting-intel-note-row flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-700/40 transition-colors cursor-pointer border-b border-slate-700/50 last:border-b-0';
          li.setAttribute('data-note-id', n.id);
          var dateStr = (n.created_at || '').slice(0, 10);
          var title = (n.ticker ? n.ticker + ' — ' : '') + dateStr;
          li.innerHTML = '<span class="text-slate-300 text-sm truncate flex-1 min-w-0">' + escapeHtmlForList(title) + '</span><span class="text-slate-500 text-xs tabular-nums shrink-0">' + escapeHtmlForList(dateStr) + '</span>';
          li.addEventListener('click', function () {
            var id = parseInt(li.getAttribute('data-note-id'), 10);
            if (!id) return;
            fetch('/api/meeting-notes/' + id, { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
              .then(function (note) {
                currentMeetingNoteId = note.id;
                fillFormWithNote(note);
                var formTitle = document.getElementById('meeting-intel-form-title');
                if (formTitle) formTitle.textContent = (note.ticker || 'Note') + ' — ' + (dateStr || '');
                var formCard = document.getElementById('meeting-intel-form-card');
                if (formCard) formCard.classList.remove('hidden');
              })
              .catch(function () {});
          });
          listContainer.appendChild(li);
        });
      })
      .catch(function () {
        if (emptyEl) emptyEl.style.display = '';
        emptyEl.innerHTML = 'Failed to load notes.';
      });
  }

  function fillFormWithNote(note) {
    var tickerEl = document.getElementById('mi-ticker');
    var meetingTypeEl = document.getElementById('mi-meeting-type');
    var sentimentEl = document.getElementById('mi-sentiment');
    var attendeesEl = document.getElementById('mi-attendees');
    var summaryEl = document.getElementById('mi-executive-summary');
    var discussionEl = document.getElementById('mi-main-discussion');
    var listEl = document.getElementById('mi-next-actions-list');
    if (tickerEl) tickerEl.value = note.ticker || '';
    if (meetingTypeEl) meetingTypeEl.value = note.meeting_type || 'IC';
    if (sentimentEl) sentimentEl.value = note.sentiment || 'Neutral';
    if (attendeesEl) attendeesEl.value = note.attendees || '';
    if (summaryEl) summaryEl.value = note.executive_summary || '';
    if (discussionEl) discussionEl.value = note.main_discussion || '';
    if (listEl) {
      listEl.innerHTML = '';
      var actions = (note.next_actions && Array.isArray(note.next_actions)) ? note.next_actions : [];
      actions.forEach(function (a) {
        var row = document.createElement('li');
        row.className = 'mi-next-action-row flex flex-wrap items-center gap-2';
        row.innerHTML =
          '<input type="text" class="mi-input mi-action-assignee flex-1 min-w-[120px] px-2 py-1.5 rounded-none bg-slate-900/90 border border-slate-600 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" placeholder="Assignee" value="' + escapeHtmlForList((a && a.assignee) || '') + '">' +
          '<input type="date" class="mi-input mi-action-deadline px-2 py-1.5 rounded-none bg-slate-900/90 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60" value="' + escapeHtmlForList((a && a.deadline) || '') + '">' +
          '<button type="button" class="mi-remove-action text-slate-500 hover:text-red-400 text-xs px-1.5 py-1 rounded-none border border-slate-600 hover:border-red-500/50 transition-colors">Remove</button>';
        listEl.appendChild(row);
        row.querySelector('.mi-remove-action').addEventListener('click', function () { row.remove(); });
      });
    }
  }

  function initMeetingIntelForm() {
    var newBtn = document.getElementById('meeting-intel-new-note-btn');
    var addActionBtn = document.getElementById('mi-add-next-action');
    var listEl = document.getElementById('mi-next-actions-list');
    var exportPdfBtn = document.getElementById('meeting-intel-export-pdf');
    var saveServerBtn = document.getElementById('meeting-intel-save-server');
    var saveNoteBtn = document.getElementById('meeting-intel-save-note');

    function resetForm() {
      var ids = ['mi-ticker', 'mi-attendees', 'mi-executive-summary', 'mi-main-discussion'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      var mt = document.getElementById('mi-meeting-type');
      var sent = document.getElementById('mi-sentiment');
      if (mt) mt.value = 'IC';
      if (sent) sent.value = 'Neutral';
      if (listEl) listEl.innerHTML = '';
      currentMeetingNoteId = null;
      var formTitle = document.getElementById('meeting-intel-form-title');
      if (formTitle) formTitle.textContent = 'New note';
      var formCard = document.getElementById('meeting-intel-form-card');
      if (formCard) formCard.classList.remove('hidden');
    }

    if (newBtn) newBtn.addEventListener('click', resetForm);

    function addNextActionRow() {
      if (!listEl) return;
      var row = document.createElement('li');
      row.className = 'mi-next-action-row flex flex-wrap items-center gap-2';
      row.innerHTML =
        '<input type="text" class="mi-input mi-action-assignee flex-1 min-w-[120px] px-2 py-1.5 rounded-none bg-slate-900/90 border border-slate-600 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" placeholder="Assignee">' +
        '<input type="date" class="mi-input mi-action-deadline px-2 py-1.5 rounded-none bg-slate-900/90 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60">' +
        '<button type="button" class="mi-remove-action text-slate-500 hover:text-red-400 text-xs px-1.5 py-1 rounded-none border border-slate-600 hover:border-red-500/50 transition-colors">Remove</button>';
      listEl.appendChild(row);
      row.querySelector('.mi-remove-action').addEventListener('click', function () { row.remove(); });
    }

    if (addActionBtn) addActionBtn.addEventListener('click', addNextActionRow);

    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', function () {
        var data = getMeetingIntelFormData();
        var url = '/api/meeting-notes';
        var method = 'POST';
        if (currentMeetingNoteId) {
          url = '/api/meeting-notes/' + currentMeetingNoteId;
          method = 'PUT';
        }
        var payload = {
          ticker: data.ticker,
          meeting_type: data.meetingType,
          sentiment: data.sentiment,
          attendees: data.attendees,
          executive_summary: data.executiveSummary,
          main_discussion: data.mainDiscussion,
          next_actions: data.nextActions
        };
        saveNoteBtn.disabled = true;
        fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin'
        })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
            return res.json();
          })
          .then(function (note) {
            saveNoteBtn.disabled = false;
            if (typeof window.loadMeetingNotesList === 'function') window.loadMeetingNotesList();
            if (method === 'POST') {
              resetForm();
            } else {
              currentMeetingNoteId = note.id;
              var formTitle = document.getElementById('meeting-intel-form-title');
              var dateStr = (note.created_at || '').slice(0, 10);
              if (formTitle) formTitle.textContent = (note.ticker || 'Note') + ' — ' + dateStr;
            }
          })
          .catch(function (err) {
            saveNoteBtn.disabled = false;
            alert((err && err.message) || 'Save failed.');
          });
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', function () {
        var data = getMeetingIntelFormData();
        var sourceEl = document.getElementById('meeting-intel-pdf-source');
        if (!sourceEl || typeof html2pdf === 'undefined') {
          alert('PDF library not loaded.');
          return;
        }
        sourceEl.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:48px;font-weight:700;color:rgba(15,23,42,0.08);white-space:nowrap;pointer-events:none;">BKIG INTERNAL INTELLIGENCE</div>' + buildMeetingIntelPdfHtml(data);
        sourceEl.style.background = '#fff';
        sourceEl.style.padding = '20mm';
        sourceEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
        sourceEl.style.fontSize = '11px';
        sourceEl.style.color = '#1e293b';
        preparePdfSource(sourceEl);
        var opt = {
          margin: 10,
          filename: 'BKIG_Meeting_Note_' + (data.ticker || 'Note').replace(/^\$/, '') + '_' + new Date().toISOString().slice(0, 10) + '.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        afterPaint(function () {
          html2pdf().set(opt).from(sourceEl).save()
            .then(function () { restorePdfSource(sourceEl); })
            .catch(function () { restorePdfSource(sourceEl); });
        });
      });
    }

    if (saveServerBtn) {
      saveServerBtn.addEventListener('click', function () {
        var data = getMeetingIntelFormData();
        var sourceEl = document.getElementById('meeting-intel-pdf-source');
        var user = (typeof window.TERMINAL_CURRENT_USER !== 'undefined' && window.TERMINAL_CURRENT_USER) ? window.TERMINAL_CURRENT_USER : {};
        var author = (user.name || '').trim() || 'BKIG User';
        var title = (data.ticker ? data.ticker + ' — ' : '') + 'Meeting Note ' + new Date().toISOString().slice(0, 10);
        if (!sourceEl || typeof html2pdf === 'undefined') {
          alert('PDF library not loaded. Cannot save to server.');
          return;
        }
        sourceEl.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:48px;font-weight:700;color:rgba(15,23,42,0.08);white-space:nowrap;pointer-events:none;">BKIG INTERNAL INTELLIGENCE</div>' + buildMeetingIntelPdfHtml(data);
        sourceEl.style.background = '#fff';
        sourceEl.style.padding = '20mm';
        sourceEl.style.fontFamily = "Georgia, 'Times New Roman', serif";
        sourceEl.style.fontSize = '11px';
        sourceEl.style.color = '#1e293b';
        preparePdfSource(sourceEl);

        var opt = {
          margin: 10,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        saveServerBtn.disabled = true;
        var safeFilename = 'BKIG_Meeting_Note_' + (data.ticker || 'Note').replace(/^\$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
        afterPaint(function () {
          html2pdf().set(opt).from(sourceEl).outputPdf('blob')
            .then(function (blob) {
              restorePdfSource(sourceEl);
              var pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
              var fd = new FormData();
              fd.append('document_title', title);
              fd.append('category', 'meeting_note');
              fd.append('author', author);
              fd.append('tickers', (data.ticker || '').replace(/^\$/, '').trim());
              fd.append('file', pdfBlob, safeFilename);
              return fetch('/api/internal-research', { method: 'POST', body: fd, credentials: 'same-origin' });
            })
            .then(function (res) {
              saveServerBtn.disabled = false;
              if (res.ok) {
                if (typeof window.loadInternalResearchList === 'function') window.loadInternalResearchList();
                alert('Meeting note saved to Internal Research (Meeting Note).');
                return;
              }
              restorePdfSource(document.getElementById('meeting-intel-pdf-source'));
              return res.json().then(function (body) {
                alert(body.message || body.error || 'Save failed.');
              }).catch(function () {
                alert('Save failed. ' + (res.status ? 'Status: ' + res.status : ''));
              });
            })
            .catch(function (err) {
              saveServerBtn.disabled = false;
              restorePdfSource(document.getElementById('meeting-intel-pdf-source'));
              alert('Failed to generate PDF or save. ' + (err && err.message ? err.message : ''));
            });
        });
      });
    }
  }

  window.loadMeetingNotesList = loadMeetingNotesList;
  window.initMeetingIntelForm = initMeetingIntelForm;
})();
