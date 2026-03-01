/**
 * BKIG Terminal — SPA 탭 전환 및 Admin API 연동
 */
(function () {
  'use strict';

  const VIEW_ATTR = 'data-view';
  const ACTIVE_NAV_CLASSES = ['bg-slate-700/40', 'text-white'];

  /** Internal Research: 원본 데이터 (API에서 한 번 불러온 뒤 검색/필터는 이걸 기반으로 클라이언트 필터링) */
  let internalResearchData = [];

  // -------------------------------------------------------------------------
  // 탭 전환: 클릭한 메뉴 외 모든 section hidden, 해당 섹션만 표시
  // -------------------------------------------------------------------------
  var MOBILE_VIEW_TITLES = {
    'view-dashboard': 'Dashboard',
    'view-comms': 'Comms',
    'view-financial-tools': 'Financial Tools',
    'view-dart': 'DART 공시',
    'view-portfolio': 'Portfolio',
    'view-ranking': 'Ranking',
    'view-watchlist': 'Watchlist',
    'view-calendar': 'Earnings & Macro',
    'view-internal-research': 'Research',
    'view-meeting-intelligence': 'Meeting Intel',
    'view-network': 'Network & Career',
    'view-profile': 'Profile',
    'view-admin': 'Admin'
  };

  var GRADUATED_ALLOWED_VIEWS = ['view-profile', 'view-network'];

  function showView(viewId) {
    var user = window.TERMINAL_CURRENT_USER;
    if (user && user.graduated === true && GRADUATED_ALLOWED_VIEWS.indexOf(viewId) === -1) {
      viewId = 'view-profile';
    }
    if (viewId === 'view-dart') {
      if (!user || user.role !== 'super_admin') {
        if (typeof alert === 'function') alert('DART 공시는 Super Admin만 이용할 수 있습니다.');
        return;
      }
    }
    const sections = document.querySelectorAll('main section[id^="view-"]');
    sections.forEach(function (section) {
      section.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.bkig-nav-item').forEach(function (btn) {
      btn.classList.remove.apply(btn.classList, ACTIVE_NAV_CLASSES);
      if (btn.getAttribute(VIEW_ATTR) === viewId) {
        btn.classList.add.apply(btn.classList, ACTIVE_NAV_CLASSES);
      }
    });

    /* 모바일: 메뉴 닫기, 타이틀·하단 탭 활성 갱신 */
    document.body.classList.remove('mobile-menu-open');
    var titleEl = document.getElementById('mobile-view-title');
    if (titleEl) titleEl.textContent = MOBILE_VIEW_TITLES[viewId] || viewId.replace('view-', '');
    document.querySelectorAll('.bkig-bottom-nav-item').forEach(function (btn) {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    if (viewId === 'view-admin') {
      loadAdminUsers();
      if (typeof loadAdminApplications === 'function') loadAdminApplications();
      if (typeof loadAdminDonations === 'function') loadAdminDonations();
      if (typeof loadAdminInquiries === 'function') loadAdminInquiries();
    }
    if (viewId === 'view-dashboard') {
      loadMarketData();
      loadDashboardTasks();
      loadDashboardMeetings();
    }
    if (viewId === 'view-portfolio') loadPortfolioView();
    if (viewId === 'view-ranking') loadRankingView();
    if (viewId === 'view-watchlist') {
      if (typeof renderWatchlistWidget === 'function') renderWatchlistWidget();
      if (typeof renderSectorHeatmap === 'function') renderSectorHeatmap();
      if (typeof renderKospiSectorHeatmap === 'function') renderKospiSectorHeatmap();
    }
    if (viewId === 'view-calendar') {
      if (typeof renderCalendarEventsWidget === 'function') renderCalendarEventsWidget();
    }
    if (viewId === 'view-internal-research') {
      if (typeof loadInternalResearchList === 'function') loadInternalResearchList();
    }
    if (viewId === 'view-dart') {
      if (typeof initDartView === 'function') initDartView();
    }
    if (viewId === 'view-meeting-intelligence') {
      if (typeof window.loadMeetingNotesList === 'function') window.loadMeetingNotesList();
    }
    if (viewId === 'view-network') {
      if (typeof window.initNetworkView === 'function') window.initNetworkView();
    }
    if (viewId === 'view-profile') loadProfileView();
    if (viewId === 'view-comms') {
      if (typeof loadCommsRooms === 'function') loadCommsRooms();
    }
  }

  function initTabRouting() {
    var user = window.TERMINAL_CURRENT_USER;
    if (user && user.graduated === true) {
      document.querySelectorAll('.bkig-lnb nav ul li').forEach(function (li) {
        if (li.getAttribute('data-allowed-when-graduated') !== 'true') {
          li.style.display = 'none';
        }
      });
      var visibleSection = document.querySelector('main section[id^="view-"]:not(.hidden)');
      var visibleId = visibleSection ? visibleSection.id : null;
      if (visibleId && GRADUATED_ALLOWED_VIEWS.indexOf(visibleId) === -1) {
        showView('view-profile');
      }
    }
    document.querySelectorAll('.bkig-nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const viewId = btn.getAttribute(VIEW_ATTR);
        if (!viewId) return;
        if (btn.getAttribute('data-requires-super-admin') === 'true') {
          var u = window.TERMINAL_CURRENT_USER;
          if (!u || u.role !== 'super_admin') {
            if (typeof alert === 'function') alert('DART 공시는 Super Admin만 이용할 수 있습니다.');
            return;
          }
        }
        showView(viewId);
      });
    });
    // 초기: Dashboard 활성 (graduated면 showView('view-profile')가 이미 호출됐을 수 있음)
    var firstNav = document.querySelector('.bkig-nav-item');
    if (firstNav && (!user || !user.graduated)) {
      firstNav.classList.add.apply(firstNav.classList, ACTIVE_NAV_CLASSES);
    }
    // 최초 로드 시 Dashboard가 보이면 데이터 로드 (Loading 해제)
    var dashboardSection = document.getElementById('view-dashboard');
    if (dashboardSection && !dashboardSection.classList.contains('hidden')) {
      loadMarketData();
      loadDashboardTasks();
      loadDashboardMeetings();
    }
  }

  function initMobileNav() {
    var body = document.body;
    var menuBtn = document.getElementById('mobile-menu-btn');
    var backdrop = document.getElementById('mobile-menu-backdrop');
    var moreBtn = document.getElementById('mobile-more-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        body.classList.toggle('mobile-menu-open');
        menuBtn.setAttribute('aria-expanded', body.classList.contains('mobile-menu-open'));
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        body.classList.remove('mobile-menu-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      });
    }
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        body.classList.toggle('mobile-menu-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', body.classList.contains('mobile-menu-open'));
      });
    }
    document.querySelectorAll('.bkig-bottom-nav-item[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var viewId = btn.getAttribute('data-view');
        if (viewId) showView(viewId);
      });
    });
  }

  // -------------------------------------------------------------------------
  // Comms: 3-pane rooms, IRC-style chat, members, invite (RBAC)
  // -------------------------------------------------------------------------
  var commsRoomsData = { executive: [], division: [], team: [] };
  var commsActiveRoomId = null;
  var commsActiveRoom = null;

  function renderCommsRoomRow(room) {
    var active = commsActiveRoomId === room.id ? ' bg-slate-700/50 text-white' : ' text-slate-400 hover:bg-slate-700/30 hover:text-slate-200';
    var hasAccess = room.has_access === true;
    var indicatorColor = hasAccess ? '#22c55e' : '#ef4444';
    var indicatorGlow = hasAccess ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
    var indicatorHtml = '<span class="comms-room-access-dot shrink-0 inline-block w-2 h-2 rounded-full border border-slate-500/50" style="background-color:' + indicatorColor + '; box-shadow: 0 0 6px ' + indicatorGlow + ';" title="' + (hasAccess ? 'Access granted' : 'No access') + '" aria-hidden="true"></span>';
    return '<li><button type="button" class="comms-room-btn w-full text-left px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2' + active + '" data-room-id="' + room.id + '">' + indicatorHtml + '<span class="min-w-0 truncate">' + escapeHtml(room.name) + '</span></button></li>';
  }

  function loadCommsRooms() {
    var execList = document.getElementById('comms-rooms-executive');
    var divList = document.getElementById('comms-rooms-division');
    var teamList = document.getElementById('comms-rooms-team');
    if (!execList || !divList || !teamList) return;
    execList.innerHTML = '';
    divList.innerHTML = '';
    teamList.innerHTML = '';
    fetch('/api/comms/rooms')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        commsRoomsData = {
          executive: data.executive || [],
          division: data.division || [],
          team: data.team || []
        };
        commsRoomsData.executive.forEach(function (r) { execList.insertAdjacentHTML('beforeend', renderCommsRoomRow(r)); });
        commsRoomsData.division.forEach(function (r) { divList.insertAdjacentHTML('beforeend', renderCommsRoomRow(r)); });
        commsRoomsData.team.forEach(function (r) { teamList.insertAdjacentHTML('beforeend', renderCommsRoomRow(r)); });
        document.querySelectorAll('.comms-room-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var roomId = parseInt(btn.getAttribute('data-room-id'), 10);
            selectCommsRoom(roomId);
          });
        });
        initCommsAccordion();
      })
      .catch(function () {
        execList.innerHTML = '<li class="px-3 py-1.5 text-xs text-slate-500">Failed to load</li>';
      });
  }

  function initCommsAccordion() {
    document.querySelectorAll('.comms-accordion-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var group = trigger.getAttribute('data-group');
        var panel = document.querySelector('.comms-accordion-panel[data-group="' + group + '"]');
        var expanded = trigger.getAttribute('aria-expanded') !== 'true';
        trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (panel) panel.classList.toggle('hidden', !expanded);
        var chevron = trigger.querySelector('.comms-accordion-chevron');
        if (chevron) chevron.style.transform = expanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      });
    });
  }

  function selectCommsRoom(roomId) {
    commsActiveRoomId = roomId;
    var allRooms = commsRoomsData.executive.concat(commsRoomsData.division, commsRoomsData.team);
    commsActiveRoom = allRooms.find(function (r) { return r.id === roomId; }) || null;
    document.querySelectorAll('.comms-room-btn').forEach(function (btn) {
      var id = parseInt(btn.getAttribute('data-room-id'), 10);
      if (id === roomId) {
        btn.classList.add('bg-slate-700/50', 'text-white');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('bg-slate-700/50', 'text-white');
        btn.classList.add('text-slate-400');
      }
    });
    var titleEl = document.getElementById('comms-room-title');
    if (titleEl) titleEl.textContent = commsActiveRoom ? commsActiveRoom.name : 'Select a room';
    var placeholder = document.getElementById('comms-messages-placeholder');
    var accessDeniedEl = document.getElementById('comms-messages-access-denied');
    var listEl = document.getElementById('comms-messages-list');
    if (placeholder) placeholder.classList.toggle('hidden', !!commsActiveRoom);
    if (accessDeniedEl) accessDeniedEl.classList.add('hidden');
    if (listEl) listEl.classList.add('hidden');
    var inputEl = document.getElementById('comms-message-input');
    if (inputEl) inputEl.disabled = true;
    if (commsActiveRoom) {
      loadCommsRoomMessages(roomId);
    }
    var inviteBtn = document.getElementById('comms-invite-btn');
    if (inviteBtn) {
      if (commsActiveRoom && commsActiveRoom.can_invite) {
        inviteBtn.classList.remove('hidden');
      } else {
        inviteBtn.classList.add('hidden');
      }
    }
    loadCommsRoomMembers(roomId);
  }

  function formatCommsTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    } catch (e) {
      return '';
    }
  }

  function loadCommsRoomMessages(roomId) {
    var placeholder = document.getElementById('comms-messages-placeholder');
    var accessDeniedEl = document.getElementById('comms-messages-access-denied');
    var listEl = document.getElementById('comms-messages-list');
    var inputEl = document.getElementById('comms-message-input');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-slate-500 py-2">Loading…</div>';
    listEl.classList.remove('hidden');
    if (accessDeniedEl) accessDeniedEl.classList.add('hidden');
    if (inputEl) inputEl.disabled = true;
    fetch('/api/comms/rooms/' + roomId + '/messages')
      .then(function (res) {
        if (res.status === 403) {
          listEl.classList.add('hidden');
          listEl.innerHTML = '';
          if (accessDeniedEl) {
            accessDeniedEl.classList.remove('hidden');
          }
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (data === null) return;
        var messages = data.messages || [];
        listEl.innerHTML = '';
        if (messages.length === 0) {
          listEl.insertAdjacentHTML('beforeend', '<div class="text-slate-500 py-2">No messages yet.</div>');
        } else {
          messages.forEach(function (m) {
            var ts = formatCommsTime(m.created_at);
            var row = '<div class="py-0.5">[<span class="text-slate-500">' + escapeHtml(ts) + '</span>] <span class="text-slate-400">' + escapeHtml(m.username || '') + '</span>: ' + escapeHtml(m.body || '') + '</div>';
            listEl.insertAdjacentHTML('beforeend', row);
          });
        }
        listEl.scrollTop = listEl.scrollHeight;
        if (inputEl) inputEl.disabled = false;
      })
      .catch(function () {
        listEl.innerHTML = '<div class="text-slate-500 py-2">Failed to load messages.</div>';
      });
  }

  function sendCommsMessage() {
    var inputEl = document.getElementById('comms-message-input');
    if (!inputEl || !commsActiveRoomId) return;
    var body = (inputEl.value || '').trim();
    if (!body) return;
    inputEl.disabled = true;
    fetch('/api/comms/rooms/' + commsActiveRoomId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body })
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (result) {
        if (result.status === 403) {
          var accessDeniedEl = document.getElementById('comms-messages-access-denied');
          var listEl = document.getElementById('comms-messages-list');
          if (listEl) listEl.classList.add('hidden');
          if (accessDeniedEl) accessDeniedEl.classList.remove('hidden');
          return;
        }
        if (result.status === 201 && result.data) {
          inputEl.value = '';
          var listEl = document.getElementById('comms-messages-list');
          if (listEl) {
            var m = result.data;
            var ts = formatCommsTime(m.created_at);
            var row = '<div class="py-0.5">[<span class="text-slate-500">' + escapeHtml(ts) + '</span>] <span class="text-slate-400">' + escapeHtml(m.username || '') + '</span>: ' + escapeHtml(m.body || '') + '</div>';
            listEl.insertAdjacentHTML('beforeend', row);
            listEl.scrollTop = listEl.scrollHeight;
          }
        } else {
          alert(result.data.message || result.data.error || 'Send failed.');
        }
      })
      .catch(function () {
        alert('Network error.');
      })
      .finally(function () {
        inputEl.disabled = false;
      });
  }

  function loadCommsRoomMembers(roomId) {
    var placeholder = document.getElementById('comms-members-placeholder');
    var listEl = document.getElementById('comms-members-list');
    if (!listEl) return;
    var singleLi = listEl.querySelector('li:not(#comms-members-placeholder)');
    if (singleLi) singleLi.remove();
    listEl.innerHTML = '';
    if (!roomId) {
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.textContent = 'Select a room.';
        listEl.appendChild(placeholder);
      }
      return;
    }
    if (placeholder) placeholder.classList.add('hidden');
    listEl.innerHTML = '<li class="text-slate-500 text-xs py-2">Loading…</li>';
    fetch('/api/comms/rooms/' + roomId + '/members')
      .then(function (res) {
        if (res.status === 403) {
          listEl.innerHTML = '<li class="text-amber-400/90 text-xs py-2 font-medium">엑세스가 없습니다.</li>';
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (data === null) return;
        var members = data.members || [];
        listEl.innerHTML = '';
        if (members.length === 0) {
          listEl.insertAdjacentHTML('beforeend', '<li class="text-slate-500 text-xs py-2">No members</li>');
        } else {
          members.forEach(function (m) {
            listEl.insertAdjacentHTML('beforeend', '<li class="py-1.5 px-2 rounded text-xs text-slate-300">' + escapeHtml(m.name) + ' <span class="text-slate-500">' + escapeHtml(m.role || '') + '</span></li>');
          });
        }
      })
      .catch(function () {
        listEl.innerHTML = '<li class="text-slate-500 text-xs py-2">Failed to load</li>';
      });
  }

  function openCommsInviteModal() {
    if (!commsActiveRoomId || !commsActiveRoom) return;
    var modal = document.getElementById('comms-invite-modal');
    var roomNameEl = document.getElementById('comms-invite-room-name');
    var selectEl = document.getElementById('comms-invite-select');
    if (!modal || !selectEl) return;
    if (roomNameEl) roomNameEl.textContent = 'Room: ' + (commsActiveRoom.name || '');
    selectEl.innerHTML = '<option value="">Choose a user…</option>';
    fetch('/api/comms/rooms/' + commsActiveRoomId + '/invite-options')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var users = data.users || [];
        users.forEach(function (u) {
          selectEl.insertAdjacentHTML('beforeend', '<option value="' + u.id + '">' + escapeHtml(u.name) + (u.email ? ' (' + escapeHtml(u.email) + ')' : '') + '</option>');
        });
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
      })
      .catch(function () {
        selectEl.innerHTML = '<option value="">Failed to load users</option>';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
      });
  }

  function closeCommsInviteModal() {
    var modal = document.getElementById('comms-invite-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function submitCommsInvite() {
    var selectEl = document.getElementById('comms-invite-select');
    var userId = selectEl && selectEl.value ? parseInt(selectEl.value, 10) : null;
    if (!userId || !commsActiveRoomId) return;
    fetch('/api/comms/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: commsActiveRoomId, user_id: userId })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok) {
          closeCommsInviteModal();
          loadCommsRoomMembers(commsActiveRoomId);
        } else {
          alert(result.data.message || result.data.error || 'Invite failed.');
        }
      })
      .catch(function () {
        alert('Network error.');
      });
  }

  (function bindCommsInvite() {
    var inviteBtn = document.getElementById('comms-invite-btn');
    var modal = document.getElementById('comms-invite-modal');
    var closeBtn = document.getElementById('comms-invite-modal-close');
    var submitBtn = document.getElementById('comms-invite-submit');
    if (inviteBtn) inviteBtn.addEventListener('click', openCommsInviteModal);
    if (closeBtn) closeBtn.addEventListener('click', closeCommsInviteModal);
    if (submitBtn) submitBtn.addEventListener('click', submitCommsInvite);
    document.querySelectorAll('[data-comms-invite-close]').forEach(function (el) {
      el.addEventListener('click', closeCommsInviteModal);
    });
    var msgInput = document.getElementById('comms-message-input');
    if (msgInput) {
      msgInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendCommsMessage();
        }
      });
    }
  })();

  // -------------------------------------------------------------------------
  // Dashboard: Live Market Ticker
  // -------------------------------------------------------------------------
  async function loadMarketData() {
    var container = document.getElementById('market-ticker');
    if (!container) return;
    try {
      var res = await fetch('/api/market-data');
      var data = await res.json().catch(function () { return { indices: [] }; });
      var indices = (data && data.indices) ? data.indices : [];
      if (!indices.length) {
        container.innerHTML = '<span class="text-slate-500">No market data</span>';
        return;
      }
      container.innerHTML = indices.map(function (idx) {
        var pct = idx.change_percent;
        var colorClass = pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-rose-400' : 'text-slate-400';
        var sign = pct > 0 ? '+' : '';
        return (
          '<span class="flex items-center gap-2">' +
          '<span class="text-slate-300 font-medium">' + escapeHtml(idx.name) + '</span>' +
          '<span class="text-slate-200">' + (idx.price ? Number(idx.price).toLocaleString() : '—') + '</span>' +
          '<span class="' + colorClass + '">' + sign + (pct != null ? pct.toFixed(2) : '0') + '%</span>' +
          '</span>'
        );
      }).join('');
    } catch (e) {
      container.innerHTML = '<span class="text-slate-500">No market data</span>';
    }
  }

  async function loadWatchlist() {
    var inputs = [1, 2, 3, 4, 5, 6].map(function (i) { return document.getElementById('watchlist-symbol-' + i); });
    if (inputs.some(function (el) { return !el; })) return;
    try {
      var res = await fetch('/api/watchlist');
      var data = await res.json().catch(function () { return { symbols: [] }; });
      var sym = (data && data.symbols) ? data.symbols : [];
      inputs.forEach(function (el, i) { el.value = sym[i] || ''; });
    } catch (e) {
      inputs.forEach(function (el) { el.value = ''; });
    }
  }

  async function openWatchlistModal() {
    try {
      var res = await fetch('/api/watchlist');
      var data = await res.json().catch(function () { return {}; });
      if (data && data.has_faccting_token === true) {
        var modal = document.getElementById('watchlist-modal');
        if (modal) {
          var sym = (data && data.symbols) ? data.symbols : [];
          var inputs = [1, 2, 3, 4, 5, 6].map(function (i) { return document.getElementById('watchlist-symbol-' + i); });
          inputs.forEach(function (el, i) { if (el) el.value = sym[i] || ''; });
          modal.classList.remove('hidden');
          modal.setAttribute('aria-hidden', 'false');
        }
      } else {
        showFacctingRequiredModal();
      }
    } catch (e) {
      showFacctingRequiredModal();
    }
  }

  function showFacctingRequiredModal() {
    var modal = document.getElementById('faccting-required-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function hideFacctingRequiredModal() {
    var modal = document.getElementById('faccting-required-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function closeWatchlistModal() {
    var modal = document.getElementById('watchlist-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function saveWatchlist() {
    var inputs = [1, 2, 3, 4, 5, 6].map(function (i) { return document.getElementById('watchlist-symbol-' + i); });
    if (inputs.some(function (el) { return !el; })) return;
    var symbols = inputs.map(function (el) { return (el.value || '').trim().toUpperCase(); }).filter(Boolean);
    try {
      var res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbols }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok) {
        closeWatchlistModal();
        loadMarketData();
        if (typeof renderWatchlistWidget === 'function') renderWatchlistWidget();
      } else {
        if (res.status === 403 && (data.error === 'FACCTing required' || (data.message && data.message.indexOf('FACCTing') !== -1))) {
          closeWatchlistModal();
          showFacctingRequiredModal();
        } else {
          alert(data.message || data.error || '저장에 실패했습니다.');
        }
      }
    } catch (e) {
      alert('네트워크 오류. 다시 시도해 주세요.');
    }
  }

  function _watchlistEsc(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _watchlistFormatVol(v) {
    if (v == null || isNaN(v) || v === 0) return '—';
    var n = Number(v);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }
  function _watchlist52wPct(hist, currentPrice) {
    if (!hist || !hist.length || currentPrice == null || isNaN(currentPrice)) return null;
    var lows = hist.map(function (d) { return d.low != null ? Number(d.low) : null; }).filter(function (v) { return v != null; });
    var highs = hist.map(function (d) { return d.high != null ? Number(d.high) : null; }).filter(function (v) { return v != null; });
    if (!lows.length || !highs.length) return null;
    var low52 = Math.min.apply(null, lows);
    var high52 = Math.max.apply(null, highs);
    if (high52 <= low52) return 50;
    var pct = ((currentPrice - low52) / (high52 - low52)) * 100;
    return Math.max(0, Math.min(100, pct));
  }
  async function renderWatchlistWidget() {
    var tbody = document.getElementById('watchlist-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr class="border-b border-slate-700/50"><td colspan="6" class="py-2 px-2 text-center text-slate-500 text-xs">로딩 중…</td></tr>';
    var symbols = [];
    try {
      var res = await fetch('/api/watchlist');
      var data = await res.json().catch(function () { return { symbols: [] }; });
      symbols = (data && data.symbols) ? data.symbols : [];
    } catch (e) {}
    if (!symbols.length) {
      tbody.innerHTML = '<tr class="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors"><td colspan="6" class="py-3 px-2 text-center text-slate-500 text-xs">관심 종목이 없습니다. <button type="button" class="text-cyan-400 hover:underline ml-1">편집</button>을 클릭해 종목을 추가하세요.</td></tr>';
      var btn = tbody.querySelector('button');
      if (btn) btn.addEventListener('click', openWatchlistModal);
      return;
    }
    var rows = [];
    var fetches = symbols.map(function (ticker) {
      return fetch('/api/tools/profile/' + encodeURIComponent(ticker) + '?period=1Y').then(function (r) { return r.json(); }).then(function (json) {
        var profile = (json && json.profile) ? json.profile : {};
        var hist = (json && json.historical) ? json.historical : [];
        var companyName = profile.companyName || profile.company_name || profile.name || '';
        var last = profile.price != null ? Number(profile.price) : null;
        if (last == null && hist.length > 0) {
          var lastCandle = hist[hist.length - 1];
          last = lastCandle.close != null ? Number(lastCandle.close) : lastCandle.price != null ? Number(lastCandle.price) : null;
        }
        var chgPct = profile.changesPercentage != null ? Number(profile.changesPercentage) : null;
        if (chgPct == null && hist.length >= 2 && last != null) {
          var prev = hist[hist.length - 2];
          var prevClose = prev.close != null ? Number(prev.close) : prev.price != null ? Number(prev.price) : null;
          if (prevClose != null && prevClose !== 0) chgPct = ((last - prevClose) / prevClose) * 100;
        }
        var chg = profile.change != null ? Number(profile.change) : null;
        if (chg == null && last != null && chgPct != null) chg = (last * chgPct) / 100;
        var vol = null;
        if (hist.length > 0 && hist[hist.length - 1].volume != null) vol = hist[hist.length - 1].volume;
        if (vol == null && profile.vol != null) vol = profile.vol;
        if (vol == null && profile.volume != null) vol = profile.volume;
        var pct52 = _watchlist52wPct(hist, last);
        return { ticker: ticker, companyName: companyName, last: last, chg: chg, chgPct: chgPct, vol: vol, pct52: pct52 };
      }).catch(function () {
        return { ticker: ticker, companyName: '', last: null, chg: null, chgPct: null, vol: null, pct52: null };
      });
    });
    try {
      rows = await Promise.all(fetches);
    } catch (e) {}
    var html = '';
    var isUp = function (v) { return v != null && Number(v) >= 0; };
    var chgClass = function (v) { return v != null && Number(v) >= 0 ? 'text-[#00FF41]' : 'text-[#FF3333]'; };
    var chgSym = function (v) { return v != null && Number(v) >= 0 ? '▲' : '▼'; };
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tickerDisplay = _watchlistEsc((r.ticker || '').toUpperCase());
      var nameDisplay = _watchlistEsc(r.companyName);
      var lastStr = r.last != null && !isNaN(r.last) ? '$' + Number(r.last).toFixed(2) : '—';
      var chgStr = r.chg != null && !isNaN(r.chg) ? (r.chg >= 0 ? '+' : '') + Number(r.chg).toFixed(2) : '—';
      var chgPctStr = r.chgPct != null && !isNaN(r.chgPct) ? (r.chgPct >= 0 ? '+' : '') + Number(r.chgPct).toFixed(2) + '%' : '—';
      var volStr = _watchlistFormatVol(r.vol);
      var pct52 = r.pct52 != null ? Math.round(r.pct52) : null;
      var barHtml = pct52 != null
        ? '<div class="h-1 w-full min-w-[60px] bg-slate-700 rounded-full overflow-hidden"><div class="h-full rounded-full ' + (isUp(r.chgPct) ? 'bg-[#00FF41]' : 'bg-[#FF3333]') + '" style="width:' + pct52 + '%"></div></div>'
        : '<span class="text-slate-500">—</span>';
      html += '<tr class="watchlist-row border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors cursor-pointer" data-ticker="' + tickerDisplay + '">' +
        '<td class="py-1 px-2 align-top">' +
          '<div class="font-bold text-slate-200 hover:text-cyan-400" style="font-size: 12px;">' + tickerDisplay + '</div>' +
          (nameDisplay ? '<div class="text-slate-500 truncate max-w-[140px]" style="font-size: 11px; line-height: 1.2;">' + nameDisplay + '</div>' : '') +
        '</td>' +
        '<td class="py-1 px-2 text-right tabular-nums text-slate-200 font-mono" style="font-size: 12px;">' + lastStr + '</td>' +
        '<td class="py-1 px-2 text-right tabular-nums font-mono ' + chgClass(r.chg) + '" style="font-size: 12px;">' + (r.chg != null ? chgSym(r.chg) + ' ' + chgStr : '—') + '</td>' +
        '<td class="py-1 px-2 text-right tabular-nums font-mono ' + chgClass(r.chgPct) + '" style="font-size: 12px;">' + (r.chgPct != null ? chgSym(r.chgPct) + ' ' + chgPctStr : '—') + '</td>' +
        '<td class="py-1 px-2 text-right tabular-nums text-slate-400 font-mono" style="font-size: 12px;">' + volStr + '</td>' +
        '<td class="py-1 px-2 align-middle" style="min-width: 80px;">' + barHtml + '</td>' +
      '</tr>';
    }
    tbody.innerHTML = html;
    tbody.querySelectorAll('.watchlist-row').forEach(function (tr) {
      var t = tr.getAttribute('data-ticker');
      if (!t) return;
      tr.addEventListener('click', function () {
        if (typeof switchToFinancialTools === 'function') switchToFinancialTools(t);
      });
    });
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function truncateLabel(str, maxLen) {
    if (str == null) return '';
    var s = String(str).trim();
    if (s.length <= maxLen) return s;
    return s.substring(0, maxLen) + '\u2026';
  }
  var calendarCurrentYear = null;
  var calendarCurrentMonth = null;
  function getCalendarState() {
    var now = new Date();
    if (calendarCurrentYear == null) calendarCurrentYear = now.getFullYear();
    if (calendarCurrentMonth == null) calendarCurrentMonth = now.getMonth() + 1;
    return { year: calendarCurrentYear, month: calendarCurrentMonth };
  }
  var MAX_EVENTS_PER_DAY = 3;
  function formatTimeForModal(str) {
    if (!str || !String(str).trim()) return '—';
    var s = String(str).trim();
    if (s.indexOf('T') !== -1) s = s.split('T')[1].substring(0, 5);
    var parts = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!parts) return s;
    var h = parseInt(parts[1], 10);
    var m = parts[2];
    if (h === 0) return '12:' + m + ' AM';
    if (h < 12) return h + ':' + m + ' AM';
    if (h === 12) return '12:' + m + ' PM';
    return (h - 12) + ':' + m + ' PM';
  }
  function formatDateForModal(iso) {
    if (!iso || iso.length < 10) return iso || '—';
    var d = new Date(iso + 'T12:00:00');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function eventDetailHtml(ev) {
    var html = '<div class="py-2 border-b border-slate-700/50 last:border-b-0">';
    if (ev.type === 'earnings') {
      html += '<div class="font-medium text-violet-300">' + escapeHtml(ev.ticker || ev.name || '') + '</div>';
      html += '<div class="text-slate-400 text-xs mt-0.5">Earnings</div>';
      html += '<dl class="mt-2 space-y-1 text-xs">';
      html += '<div><dt class="text-slate-500 inline">Date: </dt><dd class="inline text-slate-300">' + escapeHtml(formatDateForModal(ev.date)) + '</dd></div>';
      var whenLabel = ev.marketTime === 'bmo' ? 'Before Market Open' : ev.marketTime === 'amc' ? 'After Market Close' : (ev.time ? formatTimeForModal(ev.time) : '—');
      html += '<div><dt class="text-slate-500 inline">Time: </dt><dd class="inline text-slate-300">' + escapeHtml(whenLabel) + '</dd></div>';
      html += '</dl>';
    } else {
      html += '<div class="font-medium text-slate-200">' + escapeHtml(ev.name || 'Event') + '</div>';
      html += '<div class="text-slate-400 text-xs mt-0.5">Macro · ' + escapeHtml((ev.impact || 'medium') + (ev.is_fed ? ' · Fed' : '')) + '</div>';
      html += '<dl class="mt-2 space-y-1 text-xs">';
      html += '<div><dt class="text-slate-500 inline">Date: </dt><dd class="inline text-slate-300">' + escapeHtml(formatDateForModal(ev.date)) + '</dd></div>';
      html += '<div><dt class="text-slate-500 inline">Time: </dt><dd class="inline text-slate-300">' + (ev.time ? escapeHtml(formatTimeForModal(ev.time)) : '—') + '</dd></div>';
      html += '</dl>';
    }
    html += '</div>';
    return html;
  }
  function openCalendarEventModal(title, bodyHtml) {
    var modal = document.getElementById('calendar-event-modal');
    var titleEl = document.getElementById('calendar-event-modal-title');
    var bodyEl = document.getElementById('calendar-event-modal-body');
    if (!modal || !bodyEl) return;
    if (titleEl) titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeCalendarEventModal() {
    var modal = document.getElementById('calendar-event-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  function renderCalendarEventPill(ev, dataEventAttr) {
    var isHighImpact = ev.type === 'macro' && (ev.impact || '').toLowerCase() === 'high';
    var wrap = '<span class="calendar-event-pill cursor-pointer hover:opacity-90 transition-opacity inline-flex items-center gap-0.5 max-w-full min-h-[20px] md:min-h-0" ' + dataEventAttr + '>';
    var inner = '';
    if (ev.type === 'earnings') {
      var icon = ev.marketTime === 'bmo' ? '&#9728;' : ev.marketTime === 'amc' ? '&#9789;' : '';
      var label = escapeHtml(ev.ticker || ev.name || '');
      inner = '<span class="calendar-pill calendar-pill-earnings inline-flex items-center gap-0.5 px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium bg-violet-500/25 text-violet-300 border border-violet-500/50 truncate max-w-full">' + (icon ? '<span class="shrink-0 text-[8px] md:text-[10px]">' + icon + '</span>' : '') + ' <span class="truncate">' + label + '</span></span>';
    } else if (ev.type === 'macro') {
      var name = truncateLabel(ev.name || 'Event', 18);
      if (ev.is_fed) {
        inner = '<span class="calendar-pill calendar-pill-fed inline-block px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-semibold bg-rose-900/50 text-rose-300 border border-rose-600/50 truncate max-w-full">Fed</span>';
      } else if (isHighImpact) {
        inner = '<span class="calendar-pill calendar-pill-macro inline-block px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium bg-red-500/25 text-red-400 border border-red-500/50 truncate max-w-full">' + escapeHtml(name) + '</span>';
      } else {
        inner = '<span class="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-slate-500 shrink-0"></span>';
      }
    }
    return wrap + inner + '</span>';
  }
  async function renderCalendarEventsWidget() {
    var loadingEl = document.getElementById('calendar-events-loading');
    var emptyEl = document.getElementById('calendar-events-empty');
    var contentEl = document.getElementById('calendar-events-content');
    var monthLabelEl = document.getElementById('calendar-month-label');
    if (!contentEl) return;
    var state = getCalendarState();
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    contentEl.innerHTML = '';
    try {
      var res = await fetch('/api/calendar?year=' + state.year + '&month=' + state.month);
      var data = await res.json().catch(function () { return {}; });
      if (loadingEl) loadingEl.classList.add('hidden');
      var weekDayLabels = data.weekDayLabels || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var weeks = data.weeks || [];
      var monthLabel = data.monthLabel || state.month + ' / ' + state.year;
      var hasFacctingToken = data.has_faccting_token === true;
      if (monthLabelEl) monthLabelEl.textContent = monthLabel;
      if (!weeks.length) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
      }
      var html = '<div class="calendar-grid w-full flex-1 min-h-[420px] md:min-h-[680px] grid grid-cols-7 border border-slate-700 rounded-lg overflow-hidden bg-slate-900/50">';
      html += '<div class="grid grid-cols-7 col-span-7 border-b border-slate-700 bg-slate-800/80 calendar-grid-header">';
      weekDayLabels.forEach(function (label) {
        html += '<div class="py-1 md:py-2 text-center text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider border-r border-slate-700 last:border-r-0">' + escapeHtml(label) + '</div>';
      });
      html += '</div>';
      weeks.forEach(function (week) {
        week.forEach(function (day) {
          var isCurrentMonth = day.isCurrentMonth !== false;
          var isToday = day.isToday === true;
          var dayNum = day.dayNum != null ? day.dayNum : '';
          var cellClass = 'border-r border-b border-slate-700 bg-slate-800/30 min-h-[64px] md:min-h-[100px] flex flex-col overflow-hidden calendar-cell ' + (isToday ? 'ring-1 ring-inset ring-cyan-500/50 bg-cyan-500/10' : '');
          if (!isCurrentMonth) cellClass += ' opacity-60';
          html += '<div class="' + cellClass + ' last:border-r-0">';
          html += '<div class="shrink-0 flex justify-end px-0.5 md:px-1.5 py-0.5 md:py-1">';
          html += '<span class="text-[10px] md:text-xs font-medium tabular-nums ' + (isCurrentMonth ? 'text-slate-300' : 'text-slate-500') + '">' + escapeHtml(String(dayNum)) + '</span>';
          html += '</div>';
          html += '<div class="flex-1 min-h-0 overflow-y-auto bkig-scroll px-0.5 md:px-1.5 pb-0.5 md:pb-1.5 space-y-0.5 md:space-y-1">';
          var dayEvents = day.events || [];
          var visible = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
          visible.forEach(function (ev) {
            var dataJson = JSON.stringify(ev).replace(/"/g, '&quot;');
            html += '<div class="flex items-center">' + renderCalendarEventPill(ev, 'data-event="' + dataJson + '"') + '</div>';
          });
          if (dayEvents.length > MAX_EVENTS_PER_DAY) {
            var moreData = JSON.stringify({ iso: day.iso, dateLabel: formatDateForModal(day.iso), events: dayEvents }).replace(/"/g, '&quot;');
            html += '<div class="flex items-center"><span class="calendar-event-more cursor-pointer px-1 md:px-1.5 py-0.5 min-h-[20px] md:min-h-0 inline-flex items-center text-slate-500 hover:text-slate-300 text-[10px] md:text-xs" data-more-events="' + moreData + '" title="' + escapeHtml(dayEvents.length - MAX_EVENTS_PER_DAY + ' more') + '">&#8230;</span></div>';
          }
          html += '</div></div>';
        });
      });
      html += '</div>';
      if (!hasFacctingToken) {
        html = '<div class="calendar-faccting-wrap">' + html +
          '<div class="calendar-faccting-overlay" role="button" tabindex="0" title="FACCTing 연결 필요">' +
          '<div class="calendar-faccting-overlay-inner">' +
          '<p class="calendar-faccting-overlay-text">FACCTing 연결이 필요합니다</p>' +
          '<p class="calendar-faccting-overlay-sub">캘린더를 보려면 FACCTing에 가입 후 프로필에서 API 토큰을 연동해 주세요.</p>' +
          '</div></div></div>';
      }
      contentEl.innerHTML = html;
      contentEl.classList.remove('hidden');
      if (!hasFacctingToken && contentEl.querySelector('.calendar-faccting-overlay')) {
        contentEl.querySelector('.calendar-faccting-overlay').addEventListener('click', function () { showFacctingRequiredModal(); });
      }
    } catch (e) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (emptyEl) {
        emptyEl.textContent = 'No calendar data.';
        emptyEl.classList.remove('hidden');
      }
    }
  }
  function calendarGoPrevMonth() {
    var state = getCalendarState();
    calendarCurrentMonth = state.month - 1;
    if (calendarCurrentMonth < 1) {
      calendarCurrentMonth = 12;
      calendarCurrentYear = state.year - 1;
    } else {
      calendarCurrentYear = state.year;
    }
    renderCalendarEventsWidget();
  }
  function calendarGoNextMonth() {
    var state = getCalendarState();
    calendarCurrentMonth = state.month + 1;
    if (calendarCurrentMonth > 12) {
      calendarCurrentMonth = 1;
      calendarCurrentYear = state.year + 1;
    } else {
      calendarCurrentYear = state.year;
    }
    renderCalendarEventsWidget();
  }
  function initCalendarNav() {
    var prevBtn = document.getElementById('calendar-prev-month');
    var nextBtn = document.getElementById('calendar-next-month');
    if (prevBtn) prevBtn.addEventListener('click', calendarGoPrevMonth);
    if (nextBtn) nextBtn.addEventListener('click', calendarGoNextMonth);
    var contentEl = document.getElementById('calendar-events-content');
    if (contentEl) {
      contentEl.addEventListener('click', function (e) {
        if (e.target.closest('.calendar-faccting-overlay')) {
          showFacctingRequiredModal();
          return;
        }
        var pill = e.target.closest('.calendar-event-pill');
        var more = e.target.closest('.calendar-event-more');
        if (pill && pill.getAttribute('data-event')) {
          try {
            var raw = pill.getAttribute('data-event');
            var ev = JSON.parse(raw.replace(/&quot;/g, '"'));
            var title = ev.type === 'earnings' ? (ev.ticker || ev.name || 'Earnings') : (ev.name || 'Event');
            openCalendarEventModal(title, eventDetailHtml(ev));
          } catch (err) {}
        } else if (more && more.getAttribute('data-more-events')) {
          try {
            var rawMore = more.getAttribute('data-more-events');
            var payload = JSON.parse(rawMore.replace(/&quot;/g, '"'));
            var title = 'Events on ' + (payload.dateLabel || payload.iso || '');
            var body = (payload.events || []).map(function (ev) { return eventDetailHtml(ev); }).join('');
            openCalendarEventModal(title, body || '<p class="text-slate-500">No events.</p>');
          } catch (err) {}
        }
      });
    }
    var modalClose = document.getElementById('calendar-event-modal-close');
    var modalBackdrop = document.getElementById('calendar-event-modal-backdrop');
    if (modalClose) modalClose.addEventListener('click', closeCalendarEventModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeCalendarEventModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = document.getElementById('calendar-event-modal');
        if (m && !m.classList.contains('hidden')) closeCalendarEventModal();
      }
    });
  }

  // -------------------------------------------------------------------------
  // S&P 500 Sector Heatmap (SPDR ETF 프록시, 트리맵 + 색상 코딩)
  // -------------------------------------------------------------------------
  var SECTOR_HEATMAP_MOCK_DATA = [
    { ticker: 'XLK', name: 'Technology', short: 'Tech', weight: 27, changePct: 1.85 },
    { ticker: 'XLF', name: 'Financials', short: 'Fin', weight: 15, changePct: -0.92 },
    { ticker: 'XLV', name: 'Healthcare', short: 'Health', weight: 12, changePct: 0.44 },
    { ticker: 'XLC', name: 'Communication Services', short: 'Comm', weight: 10, changePct: 2.12 },
    { ticker: 'XLY', name: 'Consumer Discretionary', short: 'Disc', weight: 10, changePct: -1.33 },
    { ticker: 'XLI', name: 'Industrials', short: 'Indust', weight: 8, changePct: 0.08 },
    { ticker: 'XLP', name: 'Consumer Staples', short: 'Staples', weight: 6, changePct: -0.55 },
    { ticker: 'XLE', name: 'Energy', short: 'Energy', weight: 4, changePct: -2.45 },
    { ticker: 'XLU', name: 'Utilities', short: 'Util', weight: 3, changePct: 0.72 },
    { ticker: 'XLRE', name: 'Real Estate', short: 'RE', weight: 3, changePct: -1.88 },
    { ticker: 'XLB', name: 'Materials', short: 'Mater', weight: 2, changePct: 0.21 }
  ];

  function getSectorHeatmapColor(changePct) {
    if (changePct == null || isNaN(changePct)) return '#334155';
    if (changePct > 2) return '#00FF00';
    if (changePct > 0) return '#0d6b0d';
    if (changePct === 0) return '#1e293b';
    if (changePct >= -2) return '#6b0d0d';
    return '#FF0000';
  }

  function getSectorWatchlistPlaceholder() {
    var fallback = '해당 섹터 내 BKIG Watchlist 종목: —';
    try {
      var tbody = document.getElementById('watchlist-tbody');
      if (!tbody) return fallback;
      var rows = tbody.querySelectorAll('tr.watchlist-row[data-ticker]');
      var symbols = [].map.call(rows, function (tr) { return tr.getAttribute('data-ticker') || ''; }).filter(Boolean);
      if (symbols.length > 0) return '해당 섹터 내 BKIG Watchlist 종목: ' + symbols.slice(0, 5).join(', ');
    } catch (e) {}
    return fallback;
  }

  function renderSectorHeatmap() {
    var container = document.getElementById('sector-heatmap-container');
    var tooltipEl = document.getElementById('sector-heatmap-tooltip');
    if (!container) return;
    var totalWeight = SECTOR_HEATMAP_MOCK_DATA.reduce(function (sum, d) { return sum + d.weight; }, 0) || 1;
    container.innerHTML = '';
    SECTOR_HEATMAP_MOCK_DATA.forEach(function (sector) {
      var flexGrow = (sector.weight / totalWeight) * 100;
      var bg = getSectorHeatmapColor(sector.changePct);
      var chgStr = sector.changePct != null && !isNaN(sector.changePct)
        ? (sector.changePct >= 0 ? '+' : '') + Number(sector.changePct).toFixed(2) + '%'
        : '—';
      var tile = document.createElement('div');
      tile.className = 'sector-heatmap-tile flex flex-col items-center justify-center rounded-sm cursor-default select-none';
      tile.setAttribute('data-ticker', sector.ticker);
      tile.setAttribute('data-name', sector.name);
      tile.setAttribute('data-chg', chgStr);
      tile.style.cssText = 'flex: ' + flexGrow + ' 1 0; min-width: 70px; min-height: 52px; background: ' + bg + '; font-size: 12px; color: #f1f5f9;';
      tile.innerHTML = '<span class="font-semibold truncate w-full text-center px-0.5">' + (sector.short || sector.name) + '</span><span class="tabular-nums text-[11px] opacity-95">' + chgStr + '</span>';
      container.appendChild(tile);
      tile.addEventListener('mouseenter', function (e) {
        if (!tooltipEl) return;
        var placeholder = getSectorWatchlistPlaceholder();
        tooltipEl.innerHTML = '<div class="font-semibold text-cyan-300">' + sector.ticker + ' · ' + sector.name + '</div><div class="mt-0.5 text-slate-400">' + placeholder + '</div>';
        tooltipEl.classList.remove('hidden');
        tooltipEl.style.left = (e.clientX + 12) + 'px';
        tooltipEl.style.top = (e.clientY + 8) + 'px';
      });
      tile.addEventListener('mousemove', function (e) {
        if (tooltipEl && !tooltipEl.classList.contains('hidden')) {
          tooltipEl.style.left = (e.clientX + 12) + 'px';
          tooltipEl.style.top = (e.clientY + 8) + 'px';
        }
      });
      tile.addEventListener('mouseleave', function () {
        if (tooltipEl) tooltipEl.classList.add('hidden');
      });
    });
  }

  // -------------------------------------------------------------------------
  // KOSPI Sector Heatmap (동일 방식: Mock 트리맵 + 색상 코딩)
  // -------------------------------------------------------------------------
  var KOSPI_SECTOR_HEATMAP_MOCK_DATA = [
    { ticker: 'KR_ELEC', name: '전기·전자', short: '전기전자', weight: 28, changePct: 1.42 },
    { ticker: 'KR_AUTO', name: '자동차', short: '자동차', weight: 12, changePct: -0.88 },
    { ticker: 'KR_FIN', name: '금융', short: '금융', weight: 11, changePct: 0.35 },
    { ticker: 'KR_CHEM', name: '화학', short: '화학', weight: 10, changePct: -1.55 },
    { ticker: 'KR_STL', name: '철강·금속', short: '철강', weight: 8, changePct: 0.12 },
    { ticker: 'KR_MACH', name: '기계', short: '기계', weight: 7, changePct: 2.01 },
    { ticker: 'KR_DIST', name: '유통', short: '유통', weight: 6, changePct: -0.42 },
    { ticker: 'KR_BUILD', name: '건설', short: '건설', weight: 5, changePct: 1.18 },
    { ticker: 'KR_COMM', name: '통신서비스', short: '통신', weight: 5, changePct: -2.12 },
    { ticker: 'KR_PHARM', name: '의약품', short: '의약', weight: 4, changePct: 0.67 },
    { ticker: 'KR_ETC', name: '기타', short: '기타', weight: 4, changePct: -0.95 }
  ];

  function renderKospiSectorHeatmap() {
    var container = document.getElementById('kospi-heatmap-container');
    var tooltipEl = document.getElementById('kospi-heatmap-tooltip');
    if (!container) return;
    var totalWeight = KOSPI_SECTOR_HEATMAP_MOCK_DATA.reduce(function (sum, d) { return sum + d.weight; }, 0) || 1;
    container.innerHTML = '';
    KOSPI_SECTOR_HEATMAP_MOCK_DATA.forEach(function (sector) {
      var flexGrow = (sector.weight / totalWeight) * 100;
      var bg = getSectorHeatmapColor(sector.changePct);
      var chgStr = sector.changePct != null && !isNaN(sector.changePct)
        ? (sector.changePct >= 0 ? '+' : '') + Number(sector.changePct).toFixed(2) + '%'
        : '—';
      var tile = document.createElement('div');
      tile.className = 'sector-heatmap-tile flex flex-col items-center justify-center rounded-sm cursor-default select-none';
      tile.setAttribute('data-ticker', sector.ticker);
      tile.setAttribute('data-name', sector.name);
      tile.setAttribute('data-chg', chgStr);
      tile.style.cssText = 'flex: ' + flexGrow + ' 1 0; min-width: 70px; min-height: 52px; background: ' + bg + '; font-size: 12px; color: #f1f5f9;';
      tile.innerHTML = '<span class="font-semibold truncate w-full text-center px-0.5">' + (sector.short || sector.name) + '</span><span class="tabular-nums text-[11px] opacity-95">' + chgStr + '</span>';
      container.appendChild(tile);
      tile.addEventListener('mouseenter', function (e) {
        if (!tooltipEl) return;
        var placeholder = getSectorWatchlistPlaceholder();
        tooltipEl.innerHTML = '<div class="font-semibold text-cyan-300">' + sector.ticker + ' · ' + sector.name + '</div><div class="mt-0.5 text-slate-400">' + placeholder + '</div>';
        tooltipEl.classList.remove('hidden');
        tooltipEl.style.left = (e.clientX + 12) + 'px';
        tooltipEl.style.top = (e.clientY + 8) + 'px';
      });
      tile.addEventListener('mousemove', function (e) {
        if (tooltipEl && !tooltipEl.classList.contains('hidden')) {
          tooltipEl.style.left = (e.clientX + 12) + 'px';
          tooltipEl.style.top = (e.clientY + 8) + 'px';
        }
      });
      tile.addEventListener('mouseleave', function () {
        if (tooltipEl) tooltipEl.classList.add('hidden');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Portfolio: FACCTing API, Auth, Dashboard, Trading Panel, Journal
  // -------------------------------------------------------------------------
  var PORTFOLIO_API = '/api/v1/terminal';
  var portfolioState = {
    isConnected: false,
    token: '',
    portfolioData: null,
    journalData: [],
    isLoading: false,
    tradingAllowed: true,
    facctingNickname: null
  };

  function facctingTokenStorageKey() {
    var user = typeof window.TERMINAL_CURRENT_USER !== 'undefined' ? window.TERMINAL_CURRENT_USER : null;
    var userId = user && (user.id != null ? String(user.id) : (user.email ? String(user.email) : ''));
    return 'faccting_portfolio_token' + (userId ? '_' + userId : '');
  }

  function getPortfolioToken() {
    try {
      var key = facctingTokenStorageKey();
      var val = (localStorage.getItem(key) || '').trim();
      // 한 번만: 예전 단일 키에만 토큰이 있으면 계정별 키로 이전
      if (!val && key !== 'faccting_portfolio_token') {
        var legacy = (localStorage.getItem('faccting_portfolio_token') || '').trim();
        if (legacy) {
          localStorage.setItem(key, legacy);
          localStorage.removeItem('faccting_portfolio_token');
          val = legacy;
        }
      }
      return val;
    } catch (e) {
      return '';
    }
  }
  function setPortfolioToken(val) {
    try {
      var key = facctingTokenStorageKey();
      if (val) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    } catch (e) {}
  }

  function portfolioHeaders() {
    var t = portfolioState.token || getPortfolioToken();
    var h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  /** Sync FACCTing token to server so user appears in Analyst Ranking (FACCTing-connected only). */
  function syncFacctingTokenToServer(token) {
    var payload = { token: token || '' };
    fetch(PORTFOLIO_API + '/faccting-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () {});
  }

  /** Normalize FACCTing API response to internal shape. Handles { status, data } wrapper and field names. */
  function normalizePortfolioResponse(json) {
    if (!json) return null;
    var d = (json.status === 'success' && json.data) ? json.data : json;
    var summary = d.account_summary || d.summary || {};
    var comp = d.competition_status || {};
    var rawHoldings = d.holdings || d.positions || [];
    return {
      account_summary: {
        cash: summary.cash_balance != null ? summary.cash_balance : summary.cash,
        total_value: summary.total_asset_value != null ? summary.total_asset_value : summary.total_value,
        balance: summary.cash_balance != null ? summary.cash_balance : summary.balance,
        total: summary.total_asset_value != null ? summary.total_asset_value : summary.total
      },
      competition_status: {
        is_active: comp.contest_mode === true || comp.is_active === true,
        contest_mode: comp.contest_mode,
        contest_status: comp.contest_status
      },
      trading_allowed: comp.contest_mode === false ? true : (d.trading_allowed !== false),
      holdings: rawHoldings.map(function (h) {
        return {
          symbol: h.ticker != null ? h.ticker : h.symbol,
          ticker: h.ticker,
          shares: h.shares,
          quantity: h.quantity,
          price: h.current_price != null ? h.current_price : h.price,
          last_price: h.current_price,
          market_value: h.total_value != null ? h.total_value : h.market_value,
          value: h.total_value,
          avg_price: h.avg_price,
          return_percent: h.return_percent
        };
      }),
      nickname: d.nickname,
      user: d.user
    };
  }

  async function fetchPortfolioApi() {
    var res = await fetch(PORTFOLIO_API + '/portfolio', { headers: portfolioHeaders() });
    var data = await res.json().catch(function () { return null; });
    if (!res.ok) return { error: data && (data.message || data.error) ? (data.message || data.error) : 'Unauthorized', data: null };
    return { error: null, data: normalizePortfolioResponse(data) };
  }

  /** FIFO로 매도 건 실현 손익 계산. API에 profit_loss가 없을 때 프론트에서 표시용으로 사용. */
  function enrichJournalWithPnl(entries) {
    if (!entries || !entries.length) return entries;
    var indices = entries.map(function (_, i) { return i; });
    indices.sort(function (a, b) {
      var da = new Date(entries[a].date || entries[a].timestamp || entries[a].created_at || 0);
      var db = new Date(entries[b].date || entries[b].timestamp || entries[b].created_at || 0);
      return da - db;
    });
    var lots = {};
    var pnlByIndex = {};
    for (var i = 0; i < indices.length; i++) {
      var idx = indices[i];
      var e = entries[idx];
      var ticker = (e.ticker || e.symbol || '').toUpperCase();
      var action = (e.action || e.side || 'BUY').toUpperCase();
      var shares = e.shares != null ? Number(e.shares) : (e.quantity != null ? Number(e.quantity) : 0);
      var price = e.price != null ? Number(e.price) : (e.execution_price != null ? Number(e.execution_price) : 0);
      if (action === 'BUY' && ticker && shares > 0) {
        if (!lots[ticker]) lots[ticker] = [];
        lots[ticker].push({ shares: shares, price: price });
      } else if (action === 'SELL' && ticker && lots[ticker] && lots[ticker].length > 0 && shares > 0) {
        var remaining = shares;
        var costTotal = 0;
        var realizedTotal = 0;
        while (remaining > 0 && lots[ticker].length > 0) {
          var lot = lots[ticker][0];
          var take = Math.min(remaining, lot.shares);
          costTotal += take * lot.price;
          realizedTotal += take * price;
          lot.shares -= take;
          remaining -= take;
          if (lot.shares <= 0) lots[ticker].shift();
        }
        var profitLoss = realizedTotal - costTotal;
        var profitLossPct = costTotal > 0 ? (profitLoss / costTotal) * 100 : 0;
        pnlByIndex[idx] = { profit_loss: profitLoss, profit_loss_percent: profitLossPct };
      }
    }
    return entries.map(function (e, i) {
      if (pnlByIndex[i]) {
        var o = {};
        for (var k in e) if (e.hasOwnProperty(k)) o[k] = e[k];
        o.profit_loss = pnlByIndex[i].profit_loss;
        o.profit_loss_percent = pnlByIndex[i].profit_loss_percent;
        return o;
      }
      return e;
    });
  }

  /** Normalize FACCTing journal API response. Handles { status, data } or { data: { trades: [] } } etc. */
  function normalizeJournalResponse(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    var inner = json.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === 'object') {
      var list = inner.trades || inner.entries || inner.journal || inner.list;
      if (Array.isArray(list)) return list;
    }
    var list = json.entries || json.journal || json.trades || json.list;
    return Array.isArray(list) ? list : [];
  }

  async function fetchJournalApi() {
    var res = await fetch(PORTFOLIO_API + '/journal', { headers: portfolioHeaders() });
    var data = await res.json().catch(function () { return []; });
    if (!res.ok) return [];
    return normalizeJournalResponse(data);
  }

  async function fetchFacctingMe() {
    var res = await fetch(PORTFOLIO_API + '/me', { headers: portfolioHeaders() });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      portfolioState.facctingNickname = null;
      updateSidebarFacctingNickname();
      return null;
    }
    var nick = (data.nickname != null && data.nickname !== '') ? String(data.nickname).trim() : (data.user && data.user.nickname) ? String(data.user.nickname).trim() : null;
    if (!nick) nick = null;
    portfolioState.facctingNickname = nick;
    return nick;
  }

  function updateSidebarFacctingNickname() {
    var el = document.getElementById('sidebar-faccting-nickname');
    if (!el) return;
    var nick = portfolioState.facctingNickname || (portfolioState.portfolioData && (portfolioState.portfolioData.nickname || (portfolioState.portfolioData.user && portfolioState.portfolioData.user.nickname)));
    if (nick) {
      el.textContent = ' (@' + nick + ')';
      el.style.display = '';
    } else {
      el.textContent = '';
    }
  }

  async function submitTradeApi(payload) {
    var res = await fetch(PORTFOLIO_API + '/trade', {
      method: 'POST',
      headers: portfolioHeaders(),
      body: JSON.stringify(payload)
    });
    var data = await res.json().catch(function () { return {}; });
    return { ok: res.ok, data: data };
  }

  function renderPortfolioAuth() {
    var root = document.getElementById('portfolio-root');
    if (!root) return;
    root.innerHTML =
      '<div class="portfolio-auth-wrapper max-w-md mx-auto mt-16">' +
      '<div class="portfolio-auth-box border border-slate-600 p-6 mb-6" style="border-radius:0; background:#0d1220;">' +
      '<div class="text-slate-400 text-xs uppercase tracking-wider mb-4">[ FACCTING API AUTHORIZATION REQUIRED ]</div>' +
      '<label class="block text-slate-400 text-xs mb-2">Token</label>' +
      '<input type="password" id="portfolio-token-input" placeholder="Paste FACCTing API token" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm mb-4" style="border-radius:0;">' +
      '<button type="button" id="portfolio-connect-btn" class="w-full py-2 border border-slate-500 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors font-mono text-sm" style="border-radius:0;">[ CONNECT ACCOUNT ]</button>' +
      '</div>' +
      '<div class="portfolio-auth-guide border border-slate-600/80 p-6 font-mono text-sm" style="border-radius:0; background:rgba(15,23,42,0.6);">' +
      '<div class="text-slate-300 text-xs uppercase tracking-wider mb-4 pb-2 border-b border-slate-600/60">How to Access my Portfolio?</div>' +
      '<ol class="space-y-3 text-slate-400 text-xs leading-relaxed">' +
      '<li class="flex gap-3"><span class="text-cyan-400/90 font-semibold shrink-0">1.</span><span>Sign up at <a href="https://faccting.com" target="_blank" rel="noopener noreferrer" class="text-cyan-400/90 hover:text-cyan-300 underline">FACCTing.com</a>.</span></li>' +
      '<li class="flex gap-3"><span class="text-cyan-400/90 font-semibold shrink-0">2.</span><span>Go to <strong class="text-slate-300">Profile</strong> → <strong class="text-slate-300">Edit Profile</strong> and generate an API key.</span></li>' +
      '<li class="flex gap-3"><span class="text-cyan-400/90 font-semibold shrink-0">3.</span><span>Paste the API key in the field above and click <strong class="text-slate-300">[ CONNECT ACCOUNT ]</strong>.</span></li>' +
      '</ol>' +
      '</div>' +
      '</div>';
    var btn = document.getElementById('portfolio-connect-btn');
    var input = document.getElementById('portfolio-token-input');
    if (btn && input) {
      btn.addEventListener('click', function () {
        var token = (input.value || '').trim();
        if (!token) { alert('Enter a token.'); return; }
        setPortfolioToken(token);
        portfolioState.token = token;
        syncFacctingTokenToServer(token);
        portfolioState.isConnected = false;
        loadPortfolioView();
      });
    }
  }

  function renderPortfolioDashboard() {
    var root = document.getElementById('portfolio-root');
    if (!root) return;
    var d = portfolioState.portfolioData || {};
    var nick = d.nickname || (d.user && d.user.nickname);
    if (nick) portfolioState.facctingNickname = nick;
    updateSidebarFacctingNickname();
    var comp = d.competition_status || {};
    var isLock = comp.is_active === true && d.trading_allowed === false;
    portfolioState.tradingAllowed = d.trading_allowed !== false;

    var summary = d.account_summary || d.summary || {};
    var cash = summary.cash != null ? Number(summary.cash) : summary.balance != null ? Number(summary.balance) : 0;
    var total = summary.total_value != null ? Number(summary.total_value) : summary.total != null ? Number(summary.total) : cash;
    var holdings = d.holdings || d.positions || [];

    var warningBanner = '';
    if (isLock) {
      warningBanner =
        '<div class="portfolio-warning-banner border-2 p-3 mb-4 font-mono text-sm" style="border-color:#FF3333; color:#FF3333; border-radius:0;">' +
        '[ SYSTEM LOCK: TRADING DISABLED ] Active participation in Mock Investment Competition detected. Execution of trades via BKIG terminal is currently restricted.' +
        '</div>';
    }

    var summaryHtml =
      '<div class="portfolio-summary grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">' +
      '<div class="portfolio-panel portfolio-summary-box">' +
      '<span class="portfolio-label">Cash</span><span class="portfolio-num-emphasis">$' + Number(cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '</div>' +
      '<div class="portfolio-panel portfolio-summary-box">' +
      '<span class="portfolio-label">Total Value</span><span class="portfolio-num-emphasis">$' + Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '</div>' +
      '</div>';

    var holdingsRows = holdings.map(function (h) {
      var sym = h.symbol || h.ticker || '—';
      var qty = h.shares != null ? h.shares : h.quantity != null ? h.quantity : '—';
      var price = h.price != null ? Number(h.price).toFixed(2) : (h.last_price != null ? Number(h.last_price).toFixed(2) : '—');
      var val = (h.market_value != null ? h.market_value : h.value != null ? h.value : (typeof qty === 'number' && (h.price || h.last_price) ? qty * (h.price || h.last_price) : null));
      var valStr = val != null ? '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
      var retPct = h.return_percent != null ? Number(h.return_percent) : null;
      var retStr = retPct != null ? (retPct >= 0 ? '+' : '') + retPct.toFixed(2) + '%' : '—';
      var retColor = retPct != null ? (retPct >= 0 ? '#00FF41' : '#FF3333') : 'inherit';
      return '<tr class="portfolio-table-row">' +
        '<td class="portfolio-td portfolio-td-left text-slate-200">' + escapeHtml(sym) + '</td>' +
        '<td class="portfolio-td portfolio-td-num">' + qty + '</td>' +
        '<td class="portfolio-td portfolio-td-num">' + price + '</td>' +
        '<td class="portfolio-td portfolio-td-num" style="color:' + retColor + '">' + retStr + '</td>' +
        '<td class="portfolio-td portfolio-td-num text-slate-200">' + valStr + '</td></tr>';
    }).join('');
    var holdingsTable =
      '<div class="portfolio-panel portfolio-holdings-panel">' +
      '<div class="portfolio-panel-head">Holdings</div>' +
      '<table class="portfolio-table w-full"><thead><tr class="portfolio-thead-row">' +
      '<th class="portfolio-th portfolio-th-left">Symbol</th><th class="portfolio-th portfolio-th-num">Shares</th><th class="portfolio-th portfolio-th-num">Price</th><th class="portfolio-th portfolio-th-num">Return %</th><th class="portfolio-th portfolio-th-num">Value</th>' +
      '</tr></thead><tbody>' +
      (holdingsRows || '<tr><td colspan="5" class="portfolio-td text-slate-500 text-center py-6">No positions</td></tr>') +
      '</tbody></table></div>';

    var tradingLockClass = !portfolioState.tradingAllowed ? ' portfolio-trading-lock' : '';
    var tradingLockOverlay = !portfolioState.tradingAllowed
      ? '<div class="portfolio-trading-lock-overlay">[ TRADING DISABLED : COMPETITION IN PROGRESS ]</div>'
      : '';

    var panelHtml =
      '<div class="portfolio-panel portfolio-trading-panel relative' + tradingLockClass + '">' +
      tradingLockOverlay +
      '<div class="portfolio-panel-head">Trading Panel</div>' +
      '<label class="portfolio-label-block">Ticker</label>' +
      '<input type="text" id="portfolio-ticker" placeholder="AAPL" class="portfolio-input w-full font-mono uppercase mb-4" maxlength="10">' +
      '<label class="portfolio-label-block">Action</label>' +
      '<div class="flex gap-2 mb-4">' +
      '<button type="button" class="portfolio-action-btn portfolio-btn portfolio-action-buy" data-action="BUY">BUY</button>' +
      '<button type="button" class="portfolio-action-btn portfolio-btn px-4 py-2.5 border border-slate-600 text-slate-400 font-mono text-sm" data-action="SELL">SELL</button>' +
      '</div>' +
      '<label class="portfolio-label-block">Shares</label>' +
      '<input type="number" id="portfolio-shares" min="1" step="1" value="1" class="portfolio-input w-full font-mono mb-4">' +
      '<label class="portfolio-label-block">Rationale / Reason</label>' +
      '<textarea id="portfolio-rationale" rows="4" placeholder="매매 사유" class="portfolio-input portfolio-textarea w-full font-mono text-sm resize-y mb-4"></textarea>' +
      '<button type="button" id="portfolio-execute-btn" class="portfolio-btn portfolio-execute-btn w-full">[ EXECUTE TRADE ]</button>' +
      '</div>';

    var journalEntries = enrichJournalWithPnl(portfolioState.journalData || []);
    var journalItems = journalEntries.map(function (entry) {
      var ts = entry.timestamp || entry.date || entry.created_at || entry.executed_at || entry.trade_date || '';
      if (typeof ts === 'string' && ts.length > 10) ts = ts.replace('T', ' ').substring(0, 16);
      var action = (entry.action || entry.side || 'BUY').toUpperCase();
      var color = action === 'BUY' ? '#00FF41' : '#FF3333';
      var sym = entry.symbol || entry.ticker || '—';
      var qty = entry.shares != null ? entry.shares : entry.quantity != null ? entry.quantity : '—';
      var price = entry.price != null ? '$' + Number(entry.price).toFixed(2) : (entry.price_display || (entry.execution_price != null ? '$' + Number(entry.execution_price).toFixed(2) : '—'));
      var ratio = entry.rationale || entry.reason || entry.notes || entry.memo || '';
      var pnlAmount = entry.profit_loss != null ? entry.profit_loss : (entry.pnl != null ? entry.pnl : (entry.realized_pnl != null ? entry.realized_pnl : (entry.profit_loss_amount != null ? entry.profit_loss_amount : null)));
      var pnlPercent = entry.profit_loss_percent != null ? entry.profit_loss_percent : (entry.pnl_percent != null ? entry.pnl_percent : null);
      var pnlStr = '';
      if (pnlAmount != null || pnlPercent != null) {
        var amt = pnlAmount != null ? Number(pnlAmount) : null;
        var pct = pnlPercent != null ? Number(pnlPercent) : null;
        var pnlColor = (amt != null && amt >= 0) || (pct != null && pct >= 0) ? '#00FF41' : '#FF3333';
        var parts = [];
        if (amt != null) parts.push((amt >= 0 ? '+' : '') + '$' + amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        if (pct != null) parts.push((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%');
        pnlStr = '<span class="portfolio-journal-pnl" style="color:' + pnlColor + '"> 손익: ' + parts.join(' ') + '</span>';
      }
      return (
        '<div class="portfolio-journal-entry">' +
        '<div class="portfolio-journal-line">' +
        '<span class="portfolio-journal-ts">[' + escapeHtml(ts) + ']</span> ' +
        '<span class="portfolio-journal-sep">|</span> ' +
        '<span class="portfolio-journal-action" style="color:' + color + '">' + escapeHtml(action) + '</span> ' +
        '<span class="portfolio-journal-qty">' + qty + '</span> ' +
        '<span class="portfolio-journal-sym">' + escapeHtml(sym) + '</span> ' +
        '<span class="portfolio-journal-sep">@</span> ' +
        '<span class="portfolio-journal-price">' + price + '</span>' +
        (pnlStr ? ' ' + pnlStr : '') +
        '</div>' +
        (ratio ? '<div class="portfolio-journal-rationale">' + escapeHtml(ratio) + '</div>' : '') +
        '</div>'
      );
    }).join('');
    var journalHtml =
      '<div class="portfolio-panel portfolio-journal mt-5">' +
      '<div class="portfolio-panel-head">Trading Journal</div>' +
      '<div class="portfolio-journal-feed bkig-scroll">' +
      (journalItems || '<div class="portfolio-journal-empty">No entries</div>') +
      '</div></div>';

    root.innerHTML =
      warningBanner +
      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">' +
      '<div class="lg:col-span-8">' +
      summaryHtml +
      holdingsTable +
      '</div>' +
      '<div class="lg:col-span-4">' +
      panelHtml +
      '</div>' +
      '</div>' +
      journalHtml;

    var tickerEl = document.getElementById('portfolio-ticker');
    if (tickerEl) {
      tickerEl.addEventListener('input', function () { tickerEl.value = tickerEl.value.toUpperCase(); });
    }
    var actionBtns = root.querySelectorAll('.portfolio-action-btn');
    actionBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        actionBtns.forEach(function (b) {
          b.classList.remove('border-green-500', 'text-green-400', 'border-red-500', 'text-red-400');
          b.classList.add('border-slate-600', 'text-slate-400');
        });
        btn.classList.remove('border-slate-600', 'text-slate-400');
        if (action === 'BUY') { btn.classList.add('border-green-500', 'text-green-400'); }
        else { btn.classList.add('border-red-500', 'text-red-400'); }
      });
    });
    var firstBuy = root.querySelector('.portfolio-action-buy');
    if (firstBuy) { firstBuy.classList.add('border-green-500', 'text-green-400'); }

    var execBtn = document.getElementById('portfolio-execute-btn');
    if (execBtn) {
      execBtn.addEventListener('click', function () {
        if (!portfolioState.tradingAllowed) return;
        var tickerEl = document.getElementById('portfolio-ticker');
        var sharesEl = document.getElementById('portfolio-shares');
        var rationaleEl = document.getElementById('portfolio-rationale');
        var ticker = (tickerEl && tickerEl.value ? tickerEl.value : '').trim().toUpperCase();
        var sharesRaw = sharesEl && sharesEl.value ? sharesEl.value : '';
        var shares = parseInt(sharesRaw, 10);
        if (isNaN(shares) || shares < 1) shares = 0;
        var rationale = (rationaleEl && rationaleEl.value ? rationaleEl.value : '').trim();
        var actBtn = root.querySelector('.portfolio-action-btn.border-green-500, .portfolio-action-btn.border-red-500');
        var action = (actBtn && actBtn.getAttribute('data-action')) || 'BUY';
        if (!ticker || shares < 1) { alert('Ticker and Shares (1 or more) are required.'); return; }
        execBtn.disabled = true;
        submitTradeApi({ ticker: ticker, action: action, shares: shares, rationale: rationale }).then(function (r) {
          execBtn.disabled = false;
          if (r.ok) {
            fetchPortfolioAndJournal();
          } else {
            alert(r.data && (r.data.message || r.data.error) ? (r.data.message || r.data.error) : 'Trade failed.');
          }
        });
      });
    }
    if (!portfolioState.tradingAllowed) {
      var exec = document.getElementById('portfolio-execute-btn');
      if (exec) { exec.disabled = true; exec.classList.add('opacity-50', 'cursor-not-allowed'); }
    }
  }

  async function fetchPortfolioAndJournal() {
    portfolioState.isLoading = true;
    var root = document.getElementById('portfolio-root');
    if (root) root.innerHTML = '<p class="text-slate-500 p-4">Loading…</p>';
    var r = await fetchPortfolioApi();
    portfolioState.portfolioData = r.data;
    portfolioState.isConnected = !r.error;
    portfolioState.journalData = await fetchJournalApi();
    portfolioState.isLoading = false;
    if (r.error && portfolioState.token) {
      setPortfolioToken('');
      portfolioState.token = '';
      renderPortfolioAuth();
      return;
    }
    renderPortfolioDashboard();
  }

  function loadPortfolioView() {
    var root = document.getElementById('portfolio-root');
    if (!root) return;
    portfolioState.token = getPortfolioToken();
    if (!portfolioState.token) {
      renderPortfolioAuth();
      return;
    }
    portfolioState.isLoading = true;
    root.innerHTML = '<p class="text-slate-500 p-4">Connecting…</p>';
    fetchPortfolioApi().then(function (r) {
      portfolioState.portfolioData = r.data;
      portfolioState.isConnected = !r.error;
      portfolioState.isLoading = false;
      if (!r.error) {
        renderPortfolioDashboard();
        fetchJournalApi().then(function (entries) {
          portfolioState.journalData = entries;
          renderPortfolioDashboard();
        });
      } else {
        setPortfolioToken('');
        portfolioState.token = '';
        renderPortfolioAuth();
      }
    }).catch(function () {
      portfolioState.isLoading = false;
      root.innerHTML = '';
      renderPortfolioAuth();
    });
  }

  // -------------------------------------------------------------------------
  // Profile: 이름, FACCTing 닉네임/토큰 확인·변경
  // -------------------------------------------------------------------------
  function loadProfileView() {
    var root = document.getElementById('profile-root');
    if (!root) return;
    var user = typeof window.TERMINAL_CURRENT_USER !== 'undefined' ? window.TERMINAL_CURRENT_USER : {};
    var name = user.name || user.email || '—';
    var email = user.email || '—';
    var roleRaw = (user.role || '').trim();
    var roleDisplay = '—';
    if (roleRaw) {
      roleDisplay = roleRaw.split('_').map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }
    var token = getPortfolioToken();
    var nickname = portfolioState.facctingNickname || (portfolioState.portfolioData && (portfolioState.portfolioData.nickname || (portfolioState.portfolioData.user && portfolioState.portfolioData.user.nickname)));
    var inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500';
    root.innerHTML =
      '<div class="border border-slate-600 p-6" style="border-radius:0;">' +
      '<div class="text-slate-500 text-xs uppercase tracking-wider mb-4">Profile</div>' +
      '<div class="space-y-4">' +
      '<div><label class="block text-slate-500 text-xs mb-1">Name</label><input type="text" id="profile-name-input" value="' + escapeHtml(name === '—' ? '' : name) + '" placeholder="Your name" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Email</label><input type="email" id="profile-email-input" value="' + escapeHtml(email === '—' ? '' : email) + '" placeholder="you@example.com" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">비밀번호 변경</label><input type="password" id="profile-password-input" value="" placeholder="새 비밀번호 (변경 시에만 입력)" class="' + inputCls + '" style="border-radius:0;" autocomplete="new-password"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">직책</label><p class="text-slate-200 pt-2">' + escapeHtml(roleDisplay) + '</p></div>' +
      '<div class="flex gap-2 pt-2">' +
      '<button type="button" id="profile-save-btn" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm transition-colors" style="border-radius:0;">프로필 저장</button>' +
      '<span id="profile-save-message" class="py-2 text-slate-400 text-xs"></span></div>' +
      '<div id="profile-alumni-section" class="pt-4 mt-4 border-t border-slate-700">' +
      '<div class="text-slate-500 text-xs uppercase tracking-wider mb-3">My Alumni Info (Network &amp; Career)</div>' +
      '<p class="text-slate-400 text-xs mb-3">Alumni 디렉토리에 표시할 정보를 입력하세요. &quot;Alumni 디렉토리에 표시&quot;를 켜면 다른 멤버가 검색할 수 있습니다.</p>' +
      '<div class="space-y-3">' +
      '<div><label class="block text-slate-500 text-xs mb-1">Company</label><input type="text" id="profile-alumni-company" placeholder="e.g. Goldman Sachs" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Role</label><input type="text" id="profile-alumni-role" placeholder="e.g. Analyst, IB" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Industry</label><select id="profile-alumni-industry" class="' + inputCls + '" style="border-radius:0;"><option value="">—</option><option value="IB">IB</option><option value="PE">PE</option><option value="HF">HF</option><option value="Audit">Audit</option><option value="Tech">Tech</option><option value="__other__">Other (type below)</option></select><input type="text" id="profile-alumni-industry-other" placeholder="Industry" class="' + inputCls + ' mt-1 hidden" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Location</label><select id="profile-alumni-location" class="' + inputCls + '" style="border-radius:0;"><option value="">—</option><option value="NYC">NYC</option><option value="Seoul">Seoul</option><option value="HK">HK</option><option value="__other__">Other (type below)</option></select><input type="text" id="profile-alumni-location-other" placeholder="Location" class="' + inputCls + ' mt-1 hidden" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Status</label><select id="profile-alumni-status" class="' + inputCls + '" style="border-radius:0;"><option value="email_me">Email Me</option><option value="open_for_coffee">Open for Coffee Chat</option><option value="busy">Busy</option></select></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Tags (comma-separated)</label><input type="text" id="profile-alumni-tags" placeholder="e.g. M&amp;A, Quant, CPA" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">LinkedIn URL</label><input type="url" id="profile-alumni-linkedin" placeholder="https://linkedin.com/in/..." class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Email</label><input type="email" id="profile-alumni-email" placeholder="alumni@example.com" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">Graduation Year</label><input type="number" id="profile-alumni-year" placeholder="e.g. 2023" min="1990" max="2030" class="' + inputCls + '" style="border-radius:0;"></div>' +
      '<div><label class="block text-slate-500 text-xs mb-1">자기소개</label><textarea id="profile-alumni-bio" placeholder="Alumni 디렉토리와 Network &amp; Career에 표시됩니다." rows="3" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y min-h-[72px]" style="border-radius:0;"></textarea></div>' +
      '<label class="flex items-center gap-2 cursor-pointer pt-2">' +
      '<input type="checkbox" id="profile-alumni-show" class="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50">' +
      '<span class="text-slate-400 text-sm">Alumni 디렉토리에 표시</span></label>' +
      '<div class="flex gap-2 pt-2">' +
      '<button type="button" id="profile-alumni-save-btn" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm transition-colors" style="border-radius:0;">Alumni 정보 저장</button>' +
      '<span id="profile-alumni-save-message" class="py-2 text-slate-400 text-xs"></span></div>' +
      '</div></div>' +
      '<div id="profile-faccting-nickname-row" class="pt-4 mt-4 border-t border-slate-700"><label class="block text-slate-500 text-xs mb-1">FACCTing Nickname</label><p id="profile-faccting-nickname" class="text-slate-200">' + (nickname ? escapeHtml(nickname) : '—') + '</p></div>' +
      '<div class="mt-4"><label class="block text-slate-500 text-xs mb-1">FACCTing API Token</label>' +
      '<input type="password" id="profile-token-input" value="' + escapeHtml(token) + '" placeholder="Paste token (stored in browser only)" class="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm mt-1" style="border-radius:0;">' +
      '<p class="text-slate-500 text-xs mt-1">Used for Portfolio / FACCTing. Stored in this device only.</p></div>' +
      '<div class="flex gap-2 pt-2">' +
      '<button type="button" id="profile-token-save" class="px-4 py-2 border border-slate-500 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors font-mono text-sm" style="border-radius:0;">Save Token</button>' +
      '<button type="button" id="profile-token-toggle" class="px-4 py-2 border border-slate-500 text-slate-300 hover:border-slate-400 transition-colors font-mono text-sm" style="border-radius:0;">Show / Hide</button>' +
      '</div>' +
      '</div></div>';
    var profileSaveBtn = document.getElementById('profile-save-btn');
    var profileSaveMsg = document.getElementById('profile-save-message');
    if (profileSaveBtn) {
      profileSaveBtn.addEventListener('click', function () {
        var nameEl = document.getElementById('profile-name-input');
        var emailEl = document.getElementById('profile-email-input');
        var passwordEl = document.getElementById('profile-password-input');
        var name = nameEl ? (nameEl.value || '').trim() : '';
        var email = emailEl ? (emailEl.value || '').trim() : '';
        var password = passwordEl ? (passwordEl.value || '').trim() : '';
        if (!email) {
          if (profileSaveMsg) profileSaveMsg.textContent = '이메일을 입력하세요.';
          return;
        }
        if (profileSaveMsg) profileSaveMsg.textContent = '저장 중…';
        var payload = { name: name || undefined, email: email };
        if (password) payload.password = password;
        fetch('/api/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          return res.json().then(function (data) {
            if (res.ok) {
              if (data.user) window.TERMINAL_CURRENT_USER = data.user;
              var nameDisplay = document.getElementById('sidebar-user-name');
              var pEl = document.getElementById('sidebar-user-p');
              if (nameDisplay && data.user) nameDisplay.textContent = data.user.name || data.user.email || '';
              if (pEl && data.user) pEl.setAttribute('title', data.user.email || '');
              if (profileSaveMsg) profileSaveMsg.textContent = '저장되었습니다.';
              if (passwordEl) passwordEl.value = '';
              setTimeout(function () { if (profileSaveMsg) profileSaveMsg.textContent = ''; }, 2500);
            } else {
              if (profileSaveMsg) profileSaveMsg.textContent = (data && data.message) ? data.message : '저장 실패';
            }
          }).catch(function () {
            if (profileSaveMsg) profileSaveMsg.textContent = '저장 실패';
          });
        }).catch(function () {
          if (profileSaveMsg) profileSaveMsg.textContent = '네트워크 오류';
        });
      });
    }
    var input = document.getElementById('profile-token-input');
    var saveBtn = document.getElementById('profile-token-save');
    var toggleBtn = document.getElementById('profile-token-toggle');
    if (saveBtn && input) {
      saveBtn.addEventListener('click', function () {
        var val = (input.value || '').trim();
        setPortfolioToken(val);
        portfolioState.token = val;
        syncFacctingTokenToServer(val);
        saveBtn.textContent = 'Saved';
        setTimeout(function () { saveBtn.textContent = 'Save Token'; }, 1500);
      });
    }
    if (toggleBtn && input) {
      toggleBtn.addEventListener('click', function () {
        if (input.type === 'password') {
          input.type = 'text';
          toggleBtn.textContent = 'Hide';
        } else {
          input.type = 'password';
          toggleBtn.textContent = 'Show / Hide';
        }
      });
    }
    if (token) {
      fetchFacctingMe().then(function (nick) {
        updateSidebarFacctingNickname();
        var nickEl = document.getElementById('profile-faccting-nickname');
        if (nickEl && nick) nickEl.textContent = nick;
      });
    }
    // My Alumni: load and save
    fetch('/api/network/my-alumni', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) {
        var a = data.alumni;
        if (!a) return;
        var set = function (id, val) {
          var el = document.getElementById(id);
          if (el && val != null && val !== '') el.value = val;
        };
        var setCheck = function (id, val) {
          var el = document.getElementById(id);
          if (el) el.checked = !!val;
        };
        set('profile-alumni-company', a.company);
        set('profile-alumni-role', a.role);
        var industryOpts = ['', 'IB', 'PE', 'HF', 'Audit', 'Tech'];
        if (a.industry && industryOpts.indexOf(a.industry) >= 0) {
          set('profile-alumni-industry', a.industry);
          var io = document.getElementById('profile-alumni-industry-other');
          if (io) { io.classList.add('hidden'); io.value = ''; }
        } else if (a.industry) {
          set('profile-alumni-industry', '__other__');
          set('profile-alumni-industry-other', a.industry);
          var io = document.getElementById('profile-alumni-industry-other');
          if (io) io.classList.remove('hidden');
        }
        var locationOpts = ['', 'NYC', 'Seoul', 'HK'];
        if (a.location && locationOpts.indexOf(a.location) >= 0) {
          set('profile-alumni-location', a.location);
          var lo = document.getElementById('profile-alumni-location-other');
          if (lo) { lo.classList.add('hidden'); lo.value = ''; }
        } else if (a.location) {
          set('profile-alumni-location', '__other__');
          set('profile-alumni-location-other', a.location);
          var lo = document.getElementById('profile-alumni-location-other');
          if (lo) lo.classList.remove('hidden');
        }
        set('profile-alumni-status', a.status || 'email_me');
        set('profile-alumni-tags', Array.isArray(a.tags) ? a.tags.join(', ') : (a.tags || ''));
        set('profile-alumni-linkedin', a.linkedin);
        set('profile-alumni-email', a.email);
        set('profile-alumni-year', a.graduation_year);
        set('profile-alumni-bio', a.bio || '');
        setCheck('profile-alumni-show', a.show_in_directory);
      })
      .catch(function () {});
    function toggleIndustryOther(show) {
      var el = document.getElementById('profile-alumni-industry-other');
      if (el) { el.classList.toggle('hidden', !show); if (!show) el.value = ''; }
    }
    function toggleLocationOther(show) {
      var el = document.getElementById('profile-alumni-location-other');
      if (el) { el.classList.toggle('hidden', !show); if (!show) el.value = ''; }
    }
    var industrySelect = document.getElementById('profile-alumni-industry');
    if (industrySelect) industrySelect.addEventListener('change', function () { toggleIndustryOther(industrySelect.value === '__other__'); });
    var locationSelect = document.getElementById('profile-alumni-location');
    if (locationSelect) locationSelect.addEventListener('change', function () { toggleLocationOther(locationSelect.value === '__other__'); });
    var alumniSaveBtn = document.getElementById('profile-alumni-save-btn');
    var alumniSaveMsg = document.getElementById('profile-alumni-save-message');
    if (alumniSaveBtn) {
      alumniSaveBtn.addEventListener('click', function () {
        var industrySel = document.getElementById('profile-alumni-industry');
        var industryOther = document.getElementById('profile-alumni-industry-other');
        var industryVal = industrySel && industrySel.value === '__other__' && industryOther ? (industryOther.value || '').trim() : (industrySel && industrySel.value && industrySel.value !== '__other__' ? industrySel.value.trim() : '');
        var locationSel = document.getElementById('profile-alumni-location');
        var locationOther = document.getElementById('profile-alumni-location-other');
        var locationVal = locationSel && locationSel.value === '__other__' && locationOther ? (locationOther.value || '').trim() : (locationSel && locationSel.value && locationSel.value !== '__other__' ? locationSel.value.trim() : '');
        var payload = {
          company: (document.getElementById('profile-alumni-company') && document.getElementById('profile-alumni-company').value) ? document.getElementById('profile-alumni-company').value.trim() : '',
          role: (document.getElementById('profile-alumni-role') && document.getElementById('profile-alumni-role').value) ? document.getElementById('profile-alumni-role').value.trim() : '',
          industry: industryVal,
          location: locationVal,
          status: (document.getElementById('profile-alumni-status') && document.getElementById('profile-alumni-status').value) ? document.getElementById('profile-alumni-status').value : 'email_me',
          tags: (document.getElementById('profile-alumni-tags') && document.getElementById('profile-alumni-tags').value) ? document.getElementById('profile-alumni-tags').value.trim().split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [],
          linkedin: (document.getElementById('profile-alumni-linkedin') && document.getElementById('profile-alumni-linkedin').value) ? document.getElementById('profile-alumni-linkedin').value.trim() : '',
          email: (document.getElementById('profile-alumni-email') && document.getElementById('profile-alumni-email').value) ? document.getElementById('profile-alumni-email').value.trim() : '',
          graduation_year: (document.getElementById('profile-alumni-year') && document.getElementById('profile-alumni-year').value) ? parseInt(document.getElementById('profile-alumni-year').value, 10) : null,
          bio: (document.getElementById('profile-alumni-bio') && document.getElementById('profile-alumni-bio').value) ? document.getElementById('profile-alumni-bio').value.trim() : '',
          show_in_directory: !!(document.getElementById('profile-alumni-show') && document.getElementById('profile-alumni-show').checked)
        };
        if (alumniSaveMsg) alumniSaveMsg.textContent = '저장 중…';
        fetch('/api/network/my-alumni', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin'
        }).then(function (res) {
          return res.json().then(function (data) {
            if (res.ok) {
              if (alumniSaveMsg) alumniSaveMsg.textContent = '저장되었습니다.';
              setTimeout(function () { if (alumniSaveMsg) alumniSaveMsg.textContent = ''; }, 2500);
            } else {
              if (alumniSaveMsg) alumniSaveMsg.textContent = (data && data.message) ? data.message : '저장 실패';
            }
          }).catch(function () { if (alumniSaveMsg) alumniSaveMsg.textContent = '저장 실패'; });
        }).catch(function () { if (alumniSaveMsg) alumniSaveMsg.textContent = '네트워크 오류'; });
      });
    }
  }

  // -------------------------------------------------------------------------
  // Ranking: Analyst ranking by Portfolio Total Value (FACCTing-connected only)
  // -------------------------------------------------------------------------
  async function loadRankingView() {
    var tbody = document.getElementById('ranking-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">Loading…</td></tr>';
    var refreshBtn = document.getElementById('ranking-refresh-btn');
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      var res = await fetch(PORTFOLIO_API + '/ranking', { headers: { 'Content-Type': 'application/json' } });
      var data = await res.json().catch(function () { return { ranking: [] }; });
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">Unable to load ranking.</td></tr>';
        return;
      }
      var list = data.ranking || [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">No FACCTing-connected analysts yet. Link your FACCTing API token in Profile to appear here.</td></tr>';
        return;
      }
      var rows = list.map(function (row) {
        var rankCellClass = 'py-2.5 px-4 text-left font-mono tabular-nums text-slate-400';
        var rankIcon = '';
        if (row.rank === 1) {
          rankCellClass = 'py-2.5 px-4 text-left font-semibold font-mono tabular-nums text-yellow-400';
          rankIcon = '<span class="inline-flex items-center justify-center w-4 h-4 mr-1.5 text-yellow-400" aria-hidden="true"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>';
        } else if (row.rank === 2) {
          rankCellClass = 'py-2.5 px-4 text-left font-semibold font-mono tabular-nums text-slate-300';
          rankIcon = '<span class="inline-flex items-center justify-center w-4 h-4 mr-1.5 text-slate-300" aria-hidden="true"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>';
        } else if (row.rank === 3) {
          rankCellClass = 'py-2.5 px-4 text-left font-semibold font-mono tabular-nums text-amber-600';
          rankIcon = '<span class="inline-flex items-center justify-center w-4 h-4 mr-1.5 text-amber-600" aria-hidden="true"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>';
        }
        var valueStr = '$' + Number(row.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var returnStr = row.average_return_pct != null
          ? (row.average_return_pct >= 0 ? '+' : '') + Number(row.average_return_pct).toFixed(2) + '%'
          : '—';
        var returnCellClass = 'py-2.5 px-4 pr-6 text-right font-mono tabular-nums ';
        if (row.average_return_pct != null) {
          returnCellClass += row.average_return_pct >= 0
            ? 'text-emerald-400 bg-emerald-500/10 rounded-r'
            : 'text-rose-400 bg-rose-500/10 rounded-r';
        } else {
          returnCellClass += 'text-slate-500';
        }
        return '<tr class="group border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer ranking-tr-clickable transition-colors" data-user-id="' + escapeHtml(String(row.user_id)) + '" data-user-name="' + escapeHtml(row.name || '') + '">' +
          '<td class="' + rankCellClass + '">' + rankIcon + '<span>' + escapeHtml(String(row.rank)) + '</span></td>' +
          '<td class="py-2.5 px-4 text-left font-sans text-slate-200">' + escapeHtml(row.name || '—') + '</td>' +
          '<td class="py-2.5 px-4 text-right font-mono tabular-nums text-slate-200 font-medium">' + escapeHtml(valueStr) + '</td>' +
          '<td class="' + returnCellClass + '">' + escapeHtml(returnStr) + '</td>' +
          '<td class="py-2.5 px-4 text-right"><span class="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">View Portfolio →</span></td></tr>';
      }).join('');
      tbody.innerHTML = rows;
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">Failed to load ranking.</td></tr>';
    }
    if (refreshBtn) refreshBtn.disabled = false;
  }

  function openRankingPortfolioModal(userId, userName) {
    var modal = document.getElementById('ranking-portfolio-modal');
    var loading = document.getElementById('ranking-portfolio-modal-loading');
    var dataEl = document.getElementById('ranking-portfolio-modal-data');
    var errorEl = document.getElementById('ranking-portfolio-modal-error');
    var titleEl = document.getElementById('ranking-portfolio-modal-title');
    if (!modal || !loading || !dataEl || !errorEl) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (titleEl) titleEl.textContent = (userName || 'Analyst') + ' — Portfolio';
    loading.classList.remove('hidden');
    dataEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    fetch(PORTFOLIO_API + '/ranking/' + encodeURIComponent(userId) + '/portfolio', { headers: { 'Content-Type': 'application/json' } })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        loading.classList.add('hidden');
        if (!result.ok) {
          errorEl.textContent = (result.data && result.data.message) || 'Failed to load portfolio.';
          errorEl.classList.remove('hidden');
          return;
        }
        var d = result.data;
        var summary = d.account_summary || d.summary || {};
        var cash = summary.cash_balance != null ? summary.cash_balance : summary.cash;
        var total = summary.total_asset_value != null ? summary.total_asset_value : summary.total_value || summary.total;
        if (cash == null) cash = summary.balance;
        var cashStr = cash != null ? '$' + Number(cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        var totalStr = total != null ? '$' + Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        var summaryHtml = '<div class="ranking-portfolio-summary-grid">' +
          '<span class="ranking-portfolio-summary-label">Cash</span><span class="ranking-portfolio-summary-val">' + escapeHtml(cashStr) + '</span>' +
          '<span class="ranking-portfolio-summary-label">Total Value</span><span class="ranking-portfolio-summary-val">' + escapeHtml(totalStr) + '</span>' +
          '</div>';
        document.getElementById('ranking-portfolio-summary').innerHTML = summaryHtml;
        var holdings = d.holdings || d.positions || [];
        var tbody = document.getElementById('ranking-portfolio-tbody');
        if (tbody) {
          tbody.innerHTML = (holdings.length ? holdings.map(function (h) {
            var sym = h.symbol || h.ticker || '—';
            var qty = h.shares != null ? h.shares : (h.quantity != null ? h.quantity : '—');
            var price = (h.current_price != null ? h.current_price : h.price) != null ? Number(h.current_price || h.price).toFixed(2) : '—';
            var retPct = h.return_percent != null ? h.return_percent : (h.return_percent_pct != null ? h.return_percent_pct : (h.returnPercent != null ? h.returnPercent : null));
            var retStr = retPct != null ? (Number(retPct) >= 0 ? '+' : '') + Number(retPct).toFixed(2) + '%' : '—';
            var val = h.total_value != null ? h.total_value : (h.market_value != null ? h.market_value : (h.value != null ? h.value : null));
            var valStr = val != null ? '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
            var retColor = retPct != null ? (Number(retPct) >= 0 ? '#22c55e' : '#ef4444') : 'inherit';
            return '<tr class="ranking-portfolio-tr">' +
              '<td class="ranking-portfolio-td">' + escapeHtml(sym) + '</td>' +
              '<td class="ranking-portfolio-td ranking-portfolio-td-num">' + qty + '</td>' +
              '<td class="ranking-portfolio-td ranking-portfolio-td-num">' + price + '</td>' +
              '<td class="ranking-portfolio-td ranking-portfolio-td-num" style="color:' + retColor + '">' + escapeHtml(retStr) + '</td>' +
              '<td class="ranking-portfolio-td ranking-portfolio-td-num">' + escapeHtml(valStr) + '</td></tr>';
          }).join('') : '<tr><td colspan="5" class="ranking-portfolio-empty">No positions</td></tr>');
        }
        dataEl.classList.remove('hidden');
      })
      .catch(function () {
        loading.classList.add('hidden');
        errorEl.textContent = 'Failed to load portfolio.';
        errorEl.classList.remove('hidden');
      });
  }

  function closeRankingPortfolioModal() {
    var modal = document.getElementById('ranking-portfolio-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function initRankingRefresh() {
    var btn = document.getElementById('ranking-refresh-btn');
    if (btn) btn.addEventListener('click', loadRankingView);
    var wrap = document.getElementById('ranking-root');
    if (wrap) {
      wrap.addEventListener('click', function (e) {
        var tr = e.target && e.target.closest && e.target.closest('tr.ranking-tr-clickable');
        if (tr && tr.dataset.userId) {
          openRankingPortfolioModal(tr.dataset.userId, tr.dataset.userName || '');
        }
      });
    }
    var closeBtn = document.getElementById('ranking-portfolio-modal-close');
    var backdrop = document.getElementById('ranking-portfolio-modal-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeRankingPortfolioModal);
    if (backdrop) backdrop.addEventListener('click', closeRankingPortfolioModal);
  }

  // -------------------------------------------------------------------------
  // Dashboard: My Tasks
  // -------------------------------------------------------------------------
  async function loadDashboardTasks() {
    var tbody = document.getElementById('dashboard-tasks-tbody');
    if (!tbody) return;
    try {
      var res = await fetch('/api/tasks');
      var data = await res.json().catch(function () { return { tasks: [] }; });
      var tasks = data.tasks || [];
      tbody.innerHTML = tasks.length
        ? tasks.map(function (t) {
            var statusClass = t.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400' : t.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600 text-slate-300';
            return (
              '<tr class="hover:bg-slate-700/20">' +
              '<td class="py-3 pr-4 text-slate-200">' + escapeHtml(t.title) + '</td>' +
              '<td class="py-3 pr-4 text-slate-400">' + escapeHtml(t.assigned_by_name || '') + '</td>' +
              '<td class="py-3 pr-4 text-slate-400">' + (t.due_date || '—') + '</td>' +
              '<td class="py-3"><span class="px-2 py-0.5 rounded text-xs font-medium ' + statusClass + '">' + escapeHtml(t.status) + '</span></td>' +
              '</tr>'
            );
          }).join('')
        : '<tr><td colspan="4" class="py-4 text-slate-500 text-center">No tasks.</td></tr>';
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-red-400 text-center">Failed to load.</td></tr>';
    }
  }

  // -------------------------------------------------------------------------
  // Dashboard: Upcoming Meetings
  // -------------------------------------------------------------------------
  async function loadDashboardMeetings() {
    var list = document.getElementById('dashboard-meetings-list');
    if (!list) return;
    try {
      var res = await fetch('/api/meetings');
      var data = await res.json().catch(function () { return { meetings: [] }; });
      var meetings = data.meetings || [];
      list.innerHTML = meetings.length
        ? meetings.map(function (m) {
            var zoom = m.zoom_link
              ? '<a href="' + escapeHtml(m.zoom_link) + '" target="_blank" rel="noopener noreferrer" class="ml-2 text-blue-400 hover:text-blue-300 text-xs">Join Zoom</a>'
              : '';
            return (
              '<li class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-700/50 last:border-0">' +
              '<div><span class="text-slate-300 font-medium">' + escapeHtml(m.title) + '</span><span class="text-slate-500 text-xs ml-2">' + escapeHtml(m.date) + (m.time ? ' ' + escapeHtml(m.time) : '') + '</span></div>' +
              zoom +
              '</li>'
            );
          }).join('')
        : '<li class="text-slate-500 text-sm">No upcoming meetings.</li>';
    } catch (e) {
      list.innerHTML = '<li class="text-red-400 text-sm">Failed to load.</li>';
    }
  }

  // -------------------------------------------------------------------------
  // Dashboard: Assign Task / Schedule Modal
  // -------------------------------------------------------------------------
  var assignTaskModal = document.getElementById('dashboard-assign-task-modal');
  var assignTaskBtn = document.getElementById('dashboard-assign-task-btn');
  var assignTaskBackdrop = document.getElementById('assign-task-modal-backdrop');
  var assignTaskCancel = document.getElementById('assign-task-modal-cancel');
  var scheduleModal = document.getElementById('dashboard-schedule-modal');
  var scheduleBtn = document.getElementById('dashboard-schedule-btn');
  var scheduleBackdrop = document.getElementById('schedule-modal-backdrop');
  var scheduleCancel = document.getElementById('schedule-modal-cancel');

  function openAssignTaskModal() {
    if (assignTaskModal) assignTaskModal.classList.remove('hidden');
    loadUserOptionsForAssign();
  }
  function closeAssignTaskModal() {
    if (assignTaskModal) assignTaskModal.classList.add('hidden');
  }
  function openScheduleModal() {
    if (scheduleModal) scheduleModal.classList.remove('hidden');
  }
  function closeScheduleModal() {
    if (scheduleModal) scheduleModal.classList.add('hidden');
  }

  function openAnnouncementNewModal() {
    var modal = document.getElementById('announcement-new-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }
  function closeAnnouncementNewModal() {
    var modal = document.getElementById('announcement-new-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
  async function submitAnnouncementNew() {
    var bodyEl = document.getElementById('announcement-body');
    var authorNameEl = document.getElementById('announcement-author-name');
    var authorTitleEl = document.getElementById('announcement-author-title');
    if (!bodyEl) return;
    var body = (bodyEl.value || '').trim();
    if (!body) {
      alert('Content is required.');
      return;
    }
    var payload = {
      body: body,
      author_name: (authorNameEl && authorNameEl.value) ? authorNameEl.value.trim() : '',
      author_title: (authorTitleEl && authorTitleEl.value) ? authorTitleEl.value.trim() : null,
    };
    try {
      var res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok) {
        closeAnnouncementNewModal();
        if (bodyEl) bodyEl.value = '';
        if (authorTitleEl) authorTitleEl.value = '';
        window.location.reload();
      } else {
        alert(data.message || data.error || 'Failed to post announcement.');
      }
    } catch (e) {
      alert('Network error. Please try again.');
    }
  }

  async function loadUserOptionsForAssign() {
    var select = document.querySelector('#dashboard-assign-task-form select[name="assigned_to_id"]');
    if (!select) return;
    try {
      var res = await fetch('/api/users/options');
      var data = await res.json().catch(function () { return { users: [] }; });
      var users = data.users || [];
      select.innerHTML = '<option value="">Select user</option>' + users.map(function (u) {
        return '<option value="' + escapeHtml(String(u.id)) + '">' + escapeHtml(u.name) + '</option>';
      }).join('');
    } catch (e) {}
  }

  function initDashboardModals() {
    if (assignTaskBtn) assignTaskBtn.addEventListener('click', openAssignTaskModal);
    if (assignTaskBackdrop) assignTaskBackdrop.addEventListener('click', closeAssignTaskModal);
    if (assignTaskCancel) assignTaskCancel.addEventListener('click', closeAssignTaskModal);
    if (scheduleBtn) scheduleBtn.addEventListener('click', openScheduleModal);
    if (scheduleBackdrop) scheduleBackdrop.addEventListener('click', closeScheduleModal);
    if (scheduleCancel) scheduleCancel.addEventListener('click', closeScheduleModal);

    var watchlistEditBtn = document.getElementById('watchlist-edit-btn');
    var watchlistWidgetEditBtn = document.getElementById('watchlist-widget-edit-btn');
    var watchlistBackdrop = document.getElementById('watchlist-modal-backdrop');
    var watchlistCancel = document.getElementById('watchlist-modal-cancel');
    var watchlistSave = document.getElementById('watchlist-modal-save');
    if (watchlistEditBtn) watchlistEditBtn.addEventListener('click', openWatchlistModal);
    if (watchlistWidgetEditBtn) watchlistWidgetEditBtn.addEventListener('click', openWatchlistModal);
    if (watchlistBackdrop) watchlistBackdrop.addEventListener('click', closeWatchlistModal);
    if (watchlistCancel) watchlistCancel.addEventListener('click', closeWatchlistModal);
    if (watchlistSave) watchlistSave.addEventListener('click', saveWatchlist);

    var facctingRequiredClose = document.getElementById('faccting-required-modal-close');
    var facctingRequiredBackdrop = document.getElementById('faccting-required-modal-backdrop');
    if (facctingRequiredClose) facctingRequiredClose.addEventListener('click', hideFacctingRequiredModal);
    if (facctingRequiredBackdrop) facctingRequiredBackdrop.addEventListener('click', hideFacctingRequiredModal);

    // -------------------------------------------------------------------------
    // Internal Research: Upload Document — 슬라이드 오버 열기/닫기, 카테고리, 티커 pill, 드롭존
    // -------------------------------------------------------------------------
    var uploadDrawer = document.getElementById('upload-drawer');
    var uploadDrawerBackdrop = document.getElementById('upload-drawer-backdrop');
    var uploadDrawerPanel = document.getElementById('upload-drawer-panel');
    var uploadDrawerClose = document.getElementById('upload-drawer-close');
    var uploadDrawerCancel = document.getElementById('upload-drawer-cancel');
    var uploadDrawerForm = document.getElementById('upload-drawer-form');
    var uploadTickerWrap = document.getElementById('upload-ticker-wrap');
    var uploadTickerPills = document.getElementById('upload-ticker-pills');
    var uploadTickerInput = document.getElementById('upload-ticker-input');
    var uploadDocCategory = document.getElementById('upload-doc-category');
    var uploadFileInput = document.getElementById('upload-file-input');
    var uploadDropZone = document.getElementById('upload-drop-zone');

    function openUploadDrawer() {
      if (uploadDrawer) {
        uploadDrawer.classList.add('upload-drawer-open');
        uploadDrawer.setAttribute('aria-hidden', 'false');
      }
    }
    function closeUploadDrawer() {
      if (uploadDrawer) {
        uploadDrawer.classList.remove('upload-drawer-open');
        uploadDrawer.setAttribute('aria-hidden', 'true');
      }
      if (uploadDrawerForm && uploadDrawerForm.reset) {
        uploadDrawerForm.reset();
        uploadTickerList = [];
        renderUploadTickerPills();
        document.querySelectorAll('.upload-drawer-category').forEach(function (b) { b.classList.remove('is-active'); });
        if (uploadDocCategory) uploadDocCategory.value = '';
        if (typeof updateUploadFileLabel === 'function') updateUploadFileLabel();
      }
    }

    var uploadTickerList = [];
    function renderUploadTickerPills() {
      if (!uploadTickerPills) return;
      uploadTickerPills.innerHTML = uploadTickerList.map(function (ticker) {
        return '<span class="upload-ticker-pill">' + escapeHtml(ticker) +
          '<button type="button" class="upload-ticker-pill-remove" data-ticker="' + escapeHtml(ticker) + '" aria-label="Remove ' + escapeHtml(ticker) + '">×</button></span>';
      }).join('');
      uploadTickerPills.querySelectorAll('.upload-ticker-pill-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var t = btn.getAttribute('data-ticker');
          uploadTickerList = uploadTickerList.filter(function (x) { return x !== t; });
          renderUploadTickerPills();
        });
      });
    }
    function escapeHtml(s) {
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    var internalResearchLoadRetryCount = 0;
    var INTERNAL_RESEARCH_RETRY_MAX = 1;

    function loadInternalResearchList(isRetry, preload) {
      var section = document.getElementById('view-internal-research');
      if (!preload && section && section.classList.contains('hidden')) return;
      if (!isRetry) internalResearchLoadRetryCount = 0;

      var tbody = document.getElementById('internal-research-tbody');
      var emptyRow = document.getElementById('internal-research-empty-row');
      if (tbody && emptyRow) {
        emptyRow.style.display = '';
        emptyRow.innerHTML = '<td colspan="7" class="py-6 px-2 text-center text-slate-500 text-xs">Loading…</td>';
      }

      var category = 'all';
      var widget = document.getElementById('internal-research-widget');
      if (widget) {
        var activeFilter = widget.querySelector('.internal-research-filter.is-active');
        if (activeFilter) category = activeFilter.getAttribute('data-filter') || 'all';
      }
      var searchEl = document.getElementById('internal-research-search');
      var q = (searchEl && searchEl.value) ? String(searchEl.value).trim() : '';
      var params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (q) params.set('q', q);
      var url = '/api/internal-research' + (params.toString() ? '?' + params.toString() : '');
      var listTbody = document.getElementById('internal-research-tbody');
      var listEmptyRow = document.getElementById('internal-research-empty-row');
      var hadNoFilter = !params.has('category') && !params.has('q');

      function applyListResult(data) {
        if (!listTbody) return;
        var docs = (data && data.documents) || [];
        if (docs.length === 0) {
          if (hadNoFilter && !isRetry && internalResearchLoadRetryCount < INTERNAL_RESEARCH_RETRY_MAX) {
            internalResearchLoadRetryCount += 1;
            setTimeout(function () { loadInternalResearchList(true); }, 200);
            return;
          }
          if (listEmptyRow) {
            listEmptyRow.style.display = '';
            var emptyMsg = q ? 'No documents match your search.' : 'No documents yet. Upload one to get started.';
            listEmptyRow.innerHTML = '<td colspan="7" class="py-6 px-2 text-center text-slate-500 text-xs">' + emptyMsg + '</td>';
          }
          listTbody.querySelectorAll('.internal-research-row').forEach(function (tr) { tr.remove(); });
          return;
        }
        internalResearchLoadRetryCount = 0;
        if (listEmptyRow) listEmptyRow.style.display = 'none';
        listTbody.querySelectorAll('.internal-research-row').forEach(function (tr) { tr.remove(); });
        var escapeHtml = function (s) {
          var div = document.createElement('div');
          div.textContent = s;
          return div.innerHTML;
        };
        var fmtClass = { xlsx: 'xlsx', pdf: 'pdf', csv: 'csv', zip: 'zip' };
        docs.forEach(function (d) {
          var dateStr = (d.created_at || '').slice(0, 10);
          var cat = (d.category || '').toLowerCase();
          var tickerDisplay = (d.tickers || '').trim() || '—';
          var tickerHtml = tickerDisplay === '—' ? '—' : '<a href="#" class="text-cyan-400 hover:text-cyan-300 hover:underline">' + escapeHtml(tickerDisplay) + '</a>';
          var fmt = (d.file_format || '').toLowerCase();
          var fmtCls = fmtClass[fmt] || 'zip';
          var downloadUrl = '/api/internal-research/' + d.id + '/download';
          var canDelete = d.can_delete === true;
          var actionHtml = '<a href="' + escapeHtml(downloadUrl) + '" class="internal-research-download text-slate-500 hover:text-cyan-400 transition-colors p-0.5 inline-block" title="Download" aria-label="Download">↓</a>';
          if (canDelete) {
            actionHtml += ' <button type="button" class="internal-research-delete ml-1 text-slate-500 hover:text-red-400 transition-colors p-0.5 inline-block" title="Delete" aria-label="Delete" data-doc-id="' + d.id + '">✕</button>';
          }
          var tr = document.createElement('tr');
          tr.className = 'internal-research-row border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors';
          tr.setAttribute('data-category', cat);
          tr.innerHTML =
            '<td class="py-1.5 px-2 tabular-nums text-slate-300" style="font-size: 12px;">' + escapeHtml(dateStr) + '</td>' +
            '<td class="py-1.5 px-2"><span class="internal-research-badge internal-research-badge-' + escapeHtml(cat) + '">' + escapeHtml((d.category || '').charAt(0).toUpperCase() + (d.category || '').slice(1)) + '</span></td>' +
            '<td class="py-1.5 px-2">' + tickerHtml + '</td>' +
            '<td class="py-1.5 px-2 text-slate-200">' + escapeHtml(d.document_title || '') + '</td>' +
            '<td class="py-1.5 px-2 text-slate-400">' + escapeHtml(d.author || '') + '</td>' +
            '<td class="py-1.5 px-2"><span class="internal-research-format internal-research-format-' + fmtCls + '">' + escapeHtml((d.file_format || '').toUpperCase()) + '</span></td>' +
            '<td class="py-1.5 px-2">' + actionHtml + '</td>';
          listTbody.appendChild(tr);
        });
      }

      fetch(url, { credentials: 'same-origin', cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) return Promise.reject(new Error('' + res.status));
          return res.json();
        })
        .then(function (data) {
          applyListResult(data);
        })
        .catch(function () {
          if (hadNoFilter && !isRetry && internalResearchLoadRetryCount < INTERNAL_RESEARCH_RETRY_MAX) {
            internalResearchLoadRetryCount += 1;
            setTimeout(function () { loadInternalResearchList(true); }, 200);
            return;
          }
          internalResearchLoadRetryCount = 0;
          if (listTbody && listEmptyRow) {
            listEmptyRow.style.display = '';
            listEmptyRow.innerHTML = '<td colspan="7" class="py-6 px-2 text-center text-slate-500 text-xs">Failed to load documents.</td>';
          }
        });
    }
    window.loadInternalResearchList = loadInternalResearchList;

    document.querySelectorAll('#internal-research-widget .internal-research-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#internal-research-widget .internal-research-filter').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        if (typeof loadInternalResearchList === 'function') loadInternalResearchList();
      });
    });
    var searchInput = document.getElementById('internal-research-search');
    if (searchInput) {
      var searchTimeout;
      searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          if (typeof loadInternalResearchList === 'function') loadInternalResearchList();
        }, 300);
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(searchTimeout);
          if (typeof loadInternalResearchList === 'function') loadInternalResearchList();
        }
      });
    }

    var internalResearchTbody = document.getElementById('internal-research-tbody');
    if (internalResearchTbody) {
      internalResearchTbody.addEventListener('click', function (e) {
        var delBtn = e.target.closest('.internal-research-delete');
        if (!delBtn) return;
        e.preventDefault();
        var docId = delBtn.getAttribute('data-doc-id');
        if (!docId || !confirm('Delete this document? This cannot be undone.')) return;
        fetch('/api/internal-research/' + docId, { method: 'DELETE', credentials: 'same-origin' })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (result.ok && typeof loadInternalResearchList === 'function') loadInternalResearchList();
            else if (!result.ok) alert(result.data.message || result.data.error || 'Delete failed.');
          })
          .catch(function () { alert('Network error.'); });
      });
    }
    if (document.getElementById('internal-research-upload-btn')) {
      document.getElementById('internal-research-upload-btn').addEventListener('click', openUploadDrawer);
    }
    if (uploadDrawerClose) uploadDrawerClose.addEventListener('click', closeUploadDrawer);
    if (uploadDrawerCancel) uploadDrawerCancel.addEventListener('click', closeUploadDrawer);
    if (uploadDrawerBackdrop) uploadDrawerBackdrop.addEventListener('click', closeUploadDrawer);

    if (uploadDrawerForm) {
      uploadDrawerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var titleEl = document.getElementById('upload-doc-title');
        var authorEl = document.getElementById('upload-doc-author');
        var fileInput = document.getElementById('upload-file-input');
        if (!titleEl || !authorEl || !uploadDocCategory || !fileInput) return;
        var title = (titleEl.value || '').trim();
        var category = (uploadDocCategory.value || '').trim();
        var author = (authorEl.value || '').trim();
        var file = fileInput.files && fileInput.files[0];
        if (!title || !category || !author) {
          alert('Please fill Document Title, Category, and Author.');
          return;
        }
        if (!file) {
          alert('Please select a file (XLSX, PDF, CSV, or ZIP).');
          return;
        }
        var fd = new FormData();
        fd.append('document_title', title);
        fd.append('category', category);
        fd.append('author', author);
        fd.append('tickers', uploadTickerList.join(','));
        fd.append('file', file);
        fetch('/api/internal-research', { method: 'POST', body: fd, credentials: 'same-origin' })
          .then(function (res) {
            if (res.ok) {
              closeUploadDrawer();
              if (typeof loadInternalResearchList === 'function') loadInternalResearchList();
            } else {
              return res.json().then(function (data) {
                alert(data.message || data.error || 'Upload failed.');
              });
            }
          })
          .catch(function () { alert('Network error.'); });
      });
    }

    document.querySelectorAll('.upload-drawer-category').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.upload-drawer-category').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        if (uploadDocCategory) uploadDocCategory.value = btn.getAttribute('data-category') || '';
      });
    });

    if (uploadTickerInput) {
      uploadTickerInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var val = (uploadTickerInput.value || '').trim().toUpperCase();
          if (val && uploadTickerList.indexOf(val) === -1) {
            uploadTickerList.push(val);
            renderUploadTickerPills();
            uploadTickerInput.value = '';
          }
        } else if (e.key === 'Backspace' && !uploadTickerInput.value && uploadTickerList.length) {
          uploadTickerList.pop();
          renderUploadTickerPills();
        }
      });
    }

    function updateUploadFileLabel() {
      var defaultEl = document.getElementById('upload-drop-default');
      var selectedEl = document.getElementById('upload-drop-selected');
      var namesEl = document.getElementById('upload-file-names');
      if (!uploadFileInput || !defaultEl || !selectedEl || !namesEl) return;
      var files = uploadFileInput.files;
      if (files && files.length > 0) {
        var names = [];
        for (var i = 0; i < files.length; i++) names.push(files[i].name);
        namesEl.textContent = names.length === 1 ? names[0] : names.join(', ');
        defaultEl.classList.add('hidden');
        selectedEl.classList.remove('hidden');
      } else {
        namesEl.textContent = '';
        defaultEl.classList.remove('hidden');
        selectedEl.classList.add('hidden');
      }
    }

    if (uploadDropZone && uploadFileInput) {
      uploadDropZone.addEventListener('click', function (e) {
        if (e.target !== uploadFileInput) uploadFileInput.click();
      });
      uploadFileInput.addEventListener('change', updateUploadFileLabel);
      uploadDropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadDropZone.classList.add('border-cyan-500/50', 'bg-slate-800/60');
      });
      uploadDropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadDropZone.classList.remove('border-cyan-500/50', 'bg-slate-800/60');
      });
      uploadDropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadDropZone.classList.remove('border-cyan-500/50', 'bg-slate-800/60');
        if (e.dataTransfer.files.length) {
          uploadFileInput.files = e.dataTransfer.files;
          updateUploadFileLabel();
        }
      });
    }

    var announcementNewBtn = document.getElementById('announcement-new-post-btn');
    var announcementNewModal = document.getElementById('announcement-new-modal');
    var announcementNewBackdrop = document.getElementById('announcement-new-modal-backdrop');
    var announcementNewCancel = document.getElementById('announcement-new-modal-cancel');
    var announcementNewSubmit = document.getElementById('announcement-new-modal-submit');
    if (announcementNewBtn) announcementNewBtn.addEventListener('click', openAnnouncementNewModal);
    if (announcementNewBackdrop) announcementNewBackdrop.addEventListener('click', closeAnnouncementNewModal);
    if (announcementNewCancel) announcementNewCancel.addEventListener('click', closeAnnouncementNewModal);
    if (announcementNewSubmit) announcementNewSubmit.addEventListener('click', submitAnnouncementNew);

    var assignForm = document.getElementById('dashboard-assign-task-form');
    if (assignForm) {
      assignForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(assignForm);
        var payload = { title: fd.get('title') || '', assigned_to_id: fd.get('assigned_to_id') || '', due_date: fd.get('due_date') || null };
        if (!payload.title || !payload.assigned_to_id) return;
        try {
          var res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { closeAssignTaskModal(); assignForm.reset(); await loadDashboardTasks(); } else { alert('Failed to assign task.'); }
        } catch (err) { alert('Network error.'); }
      });
    }
    var scheduleForm = document.getElementById('dashboard-schedule-form');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(scheduleForm);
        var payload = { title: fd.get('title') || '', date: fd.get('date') || '', time: fd.get('time') || '', zoom_link: fd.get('zoom_link') || '' };
        if (!payload.title || !payload.date) return;
        try {
          var res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { closeScheduleModal(); scheduleForm.reset(); await loadDashboardMeetings(); } else { alert('Failed to schedule meeting.'); }
        } catch (err) { alert('Network error.'); }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Admin: 유저 목록 로드 및 테이블 렌더링
  // -------------------------------------------------------------------------
  async function fetchUsers() {
    const res = await fetch('/api/users', { method: 'GET' });
    if (!res.ok) throw new Error(res.status === 403 ? 'Forbidden' : 'Failed to load users');
    const data = await res.json();
    return data.users || [];
  }

  function roleDisplay(role) {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'division_lead') return 'Division Lead';
    if (role === 'team_lead') return 'Team Lead';
    return 'Analyst';
  }

  function renderUsersTable(users) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    const active = u => u.is_active !== false;
    const graduated = u => u.graduated === true;
    tbody.innerHTML = users.length
      ? users
          .map(function (u) {
            var statusHtml;
            if (graduated(u)) {
              statusHtml = '<span class="text-slate-400 text-xs font-medium">Graduated</span>';
            } else {
              statusHtml = active(u)
                ? '<span class="text-emerald-400/90 text-xs font-medium">Active</span>'
                : '<span class="text-amber-400/90 text-xs font-medium">Paused</span>';
            }
            const pauseLabel = active(u) ? 'Pause Account' : 'Resume Account';
            const pauseClass = active(u)
              ? 'admin-btn-pause text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              : 'admin-btn-resume text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10';
            const gradLabel = graduated(u) ? 'Unset Graduated' : 'Graduated';
            const gradClass = graduated(u)
              ? 'admin-btn-graduated text-slate-400 hover:text-slate-300 hover:bg-slate-600/50'
              : 'admin-btn-graduated text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10';
            var teamDisplay = (u.team != null && u.team !== '') ? escapeHtml(String(u.team)) : '—';
            var schoolDisplay = (u.school || '').trim() ? escapeHtml(u.school) : '—';
            return (
              '<tr class="hover:bg-slate-700/20" data-user-id="' + escapeHtml(String(u.id)) + '">' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(u.name) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(u.email) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + schoolDisplay + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(u.division) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + teamDisplay + '</td>' +
              '<td class="px-4 py-3"><span class="text-slate-400">' + escapeHtml(roleDisplay(u.role)) + '</span></td>' +
              '<td class="px-4 py-3">' + statusHtml + '</td>' +
              '<td class="px-4 py-3">' +
              '<button type="button" class="admin-btn-edit mr-2 px-2 py-1 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-600 transition-colors" data-user-id="' + escapeHtml(String(u.id)) + '">Edit</button>' +
              '<button type="button" class="admin-btn-pause-resume mr-2 px-2 py-1 rounded text-xs font-medium transition-colors ' + pauseClass + '" data-user-id="' + escapeHtml(String(u.id)) + '" data-active="' + (active(u) ? '1' : '0') + '">' + escapeHtml(pauseLabel) + '</button>' +
              '<button type="button" class="' + gradClass + ' mr-2 px-2 py-1 rounded text-xs font-medium transition-colors" data-user-id="' + escapeHtml(String(u.id)) + '" data-graduated="' + (graduated(u) ? '1' : '0') + '">' + escapeHtml(gradLabel) + '</button>' +
              '<button type="button" class="admin-btn-terminate px-2 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors" data-user-id="' + escapeHtml(String(u.id)) + '">Terminate Account</button>' +
              '</td>' +
              '</tr>'
            );
          })
          .join('')
      : '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-500">No users yet.</td></tr>';
  }

  async function pauseResumeUser(userId, setActive) {
    try {
      const res = await fetch('/api/users/' + userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: setActive }),
      });
      if (!res.ok) {
        const d = await res.json().catch(function () { return {}; });
        alert(d.message || d.error || 'Request failed');
        return;
      }
      await loadAdminUsers();
    } catch (e) {
      alert('Network error.');
    }
  }

  async function toggleGraduatedUser(userId, setGraduated) {
    try {
      const res = await fetch('/api/users/' + userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduated: setGraduated }),
      });
      if (!res.ok) {
        const d = await res.json().catch(function () { return {}; });
        alert(d.message || d.error || 'Request failed');
        return;
      }
      await loadAdminUsers();
    } catch (e) {
      alert('Network error.');
    }
  }

  async function terminateUser(userId) {
    if (!confirm('Permanently delete this account? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/users/' + userId, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(function () { return {}; });
        alert(d.message || d.error || 'Delete failed');
        return;
      }
      await loadAdminUsers();
    } catch (e) {
      alert('Network error.');
    }
  }

  function openEditModal(user) {
    if (!user) return;
    var modal = document.getElementById('admin-edit-modal');
    var idEl = document.getElementById('edit-user-id');
    var nameEl = document.getElementById('edit-name');
    var emailEl = document.getElementById('edit-email');
    var passEl = document.getElementById('edit-password');
    var divEl = document.getElementById('edit-division');
    var teamEl = document.getElementById('edit-team');
    var roleEl = document.getElementById('edit-role');
    if (!modal || !idEl) return;
    idEl.value = user.id;
    if (nameEl) nameEl.value = user.name || '';
    if (emailEl) emailEl.value = user.email || '';
    if (passEl) passEl.value = '';
    var schoolEl = document.getElementById('edit-school');
    if (divEl) divEl.value = (user.division || '').trim() || '';
    if (schoolEl) schoolEl.value = (user.school || '').trim() || '';
    if (teamEl) teamEl.value = (user.team != null && user.team !== '') ? String(user.team) : '';
    if (roleEl) roleEl.value = (user.role || 'analyst').trim() || 'analyst';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeEditModal() {
    var modal = document.getElementById('admin-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function initActionsDelegation() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      const editBtn = e.target.closest('.admin-btn-edit');
      if (editBtn) {
        e.preventDefault();
        const id = editBtn.getAttribute('data-user-id');
        if (id) {
          const user = adminUsersList.find(function (u) { return String(u.id) === String(id); });
          openEditModal(user);
        }
        return;
      }
      const btn = e.target.closest('.admin-btn-pause-resume');
      if (btn) {
        e.preventDefault();
        const id = btn.getAttribute('data-user-id');
        const active = btn.getAttribute('data-active') === '1';
        if (id) pauseResumeUser(id, !active);
        return;
      }
      const gradBtn = e.target.closest('.admin-btn-graduated');
      if (gradBtn) {
        e.preventDefault();
        const id = gradBtn.getAttribute('data-user-id');
        const graduated = gradBtn.getAttribute('data-graduated') === '1';
        if (id) toggleGraduatedUser(id, !graduated);
        return;
      }
      const termBtn = e.target.closest('.admin-btn-terminate');
      if (termBtn) {
        e.preventDefault();
        const id = termBtn.getAttribute('data-user-id');
        if (id) terminateUser(id);
      }
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var adminUsersList = [];
  var adminUsersPage = 1;
  var adminUsersSortKey = 'name';
  var adminUsersSortDir = 'asc';
  var adminApplicationsList = [];
  var adminApplicationsPage = 1;
  var adminApplicationsSortKey = 'date';
  var adminApplicationsSortDir = 'desc';
  var adminDonationsList = [];
  var adminDonationsPage = 1;
  var adminDonationsSortKey = 'date';
  var adminDonationsSortDir = 'desc';
  var adminInquiriesList = [];
  var adminInquiriesPage = 1;
  var adminInquiriesSortKey = 'date';
  var adminInquiriesSortDir = 'desc';
  var ADMIN_PAGE_SIZE = 5;
  var adminRoleChart = null;
  var adminDivisionChart = null;
  var adminSchoolChart = null;
  var adminGraduatedChart = null;
  var adminUsageSearchChart = null;
  var adminUsageSectionsChart = null;

  function sortList(list, getValue, key, dir) {
    if (!list || !list.length) return list;
    var arr = list.slice();
    var mult = dir === 'asc' ? 1 : -1;
    arr.sort(function (a, b) {
      var va = getValue(a, key);
      var vb = getValue(b, key);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return mult * (va - vb);
      return mult * String(va).localeCompare(String(vb), undefined, { numeric: true });
    });
    return arr;
  }

  function updateSortHeaders(prefix, sortKey, sortDir) {
    var table = document.querySelector('table[data-admin-table="' + prefix.replace('admin-', '') + '"]');
    if (!table) return;
    var ths = table.querySelectorAll('.admin-th-sort');
    ths.forEach(function (th) {
      var label = th.getAttribute('data-label') || '';
      var key = th.getAttribute('data-sort');
      var indicator = (key === sortKey) ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
      th.textContent = label + indicator;
    });
  }

  function filterListBySearch(list, query, getSearchText) {
    if (!list || !list.length) return [];
    var q = (query || '').trim().toLowerCase();
    if (!q) return list.slice();
    var matches = [];
    var rest = [];
    for (var i = 0; i < list.length; i++) {
      var text = (getSearchText(list[i]) || '').toLowerCase();
      if (text.indexOf(q) !== -1) matches.push(list[i]);
      else rest.push(list[i]);
    }
    return matches.concat(rest);
  }

  function updatePaginationUI(prefix, filteredLength, currentPage) {
    var totalPages = Math.max(1, Math.ceil(filteredLength / ADMIN_PAGE_SIZE));
    var paginationEl = document.getElementById(prefix + '-pagination');
    var infoEl = document.getElementById(prefix + '-page-info');
    var prevBtn = document.getElementById(prefix + '-prev');
    var nextBtn = document.getElementById(prefix + '-next');
    if (paginationEl) paginationEl.classList.toggle('hidden', filteredLength <= ADMIN_PAGE_SIZE);
    if (infoEl) infoEl.textContent = currentPage + ' / ' + totalPages;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  function downloadTableAsExcel(headers, rows, filename) {
    function escapeCsvCell(cell) {
      var s = cell == null ? '' : String(cell);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1)
        return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    var line = headers.map(escapeCsvCell).join(',');
    var csv = '\uFEFF' + line + '\n';
    for (var r = 0; r < rows.length; r++)
      csv += rows[r].map(escapeCsvCell).join(',') + '\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function applyAdminUsersView() {
    var query = (document.getElementById('admin-users-search') && document.getElementById('admin-users-search').value) || '';
    var filtered = filterListBySearch(adminUsersList, query, function (u) {
      return [u.name, u.email, u.school || '', u.division, u.team, roleDisplay(u.role), u.is_active !== false ? 'Active' : 'Paused'].join(' ');
    });
    function getUserValue(u, key) {
      if (key === 'name') return u.name;
      if (key === 'email') return u.email;
      if (key === 'school') return (u.school || '').trim();
      if (key === 'division') return u.division;
      if (key === 'team') return u.team != null && u.team !== '' ? Number(u.team) : null;
      if (key === 'role') return roleDisplay(u.role);
      if (key === 'status') return u.is_active !== false ? 'Active' : 'Paused';
      return '';
    }
    filtered = sortList(filtered, getUserValue, adminUsersSortKey, adminUsersSortDir);
    var totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (adminUsersPage > totalPages) adminUsersPage = totalPages;
    if (adminUsersPage < 1) adminUsersPage = 1;
    var start = (adminUsersPage - 1) * ADMIN_PAGE_SIZE;
    var slice = filtered.slice(start, start + ADMIN_PAGE_SIZE);
    renderUsersTable(slice);
    updatePaginationUI('admin-users', filtered.length, adminUsersPage);
    updateSortHeaders('admin-users', adminUsersSortKey, adminUsersSortDir);
  }

  function normalizeRoleKey(role) {
    var s = (role || '').trim().toLowerCase().replace(/\s+/g, '_') || 'analyst';
    if (s === 'super_admin' || s === 'superadmin') return 'super_admin';
    if (s === 'division_lead' || s === 'divisionlead') return 'division_lead';
    if (s === 'team_lead' || s === 'teamlead') return 'team_lead';
    return 'analyst';
  }

  function renderAdminCharts(users) {
    if (typeof Chart === 'undefined') return;
    var roleOrder = ['super_admin', 'division_lead', 'team_lead', 'analyst'];
    var roleLabels = { super_admin: 'Super Admin', division_lead: 'Division Lead', team_lead: 'Team Lead', analyst: 'Analyst' };
    var roleCounts = { super_admin: 0, division_lead: 0, team_lead: 0, analyst: 0 };
    var divisionOrder = ['Research', 'Investment', 'Case Study', 'PD/PR', 'Admin'];
    var divisionCounts = {};
    divisionOrder.forEach(function (d) { divisionCounts[d] = 0; });
    var schoolCounts = {};
    var graduatedCount = 0;
    var nonGraduatedCount = 0;
    (users || []).forEach(function (u) {
      var school = (u.school || '').trim();
      if (school) {
        schoolCounts[school] = (schoolCounts[school] || 0) + 1;
      }
      if (u.graduated === true) graduatedCount++; else nonGraduatedCount++;
      if (u.graduated === true) return; // graduated는 Role/Division 인원에서 제외
      var r = normalizeRoleKey(u.role);
      roleCounts[r]++;
      var div = (u.division || '').trim();
      if (div) {
        if (divisionCounts[div] != null) divisionCounts[div]++;
        else { divisionOrder.push(div); divisionCounts[div] = 1; }
      }
    });
    var schoolOrder = Object.keys(schoolCounts).sort();
    var schoolDataArr = schoolOrder.map(function (s) { return schoolCounts[s] || 0; });
    var roleLabelsArr = roleOrder.map(function (k) { return roleLabels[k]; });
    var roleDataArr = roleOrder.map(function (k) { return roleCounts[k] || 0; });
    var divisionDataArr = divisionOrder.map(function (d) { return divisionCounts[d] || 0; });
    var mutedColors = ['#475569', '#64748b', '#0ea5e9', '#f59e0b'];
    var divisionColors = ['#334155', '#475569', '#64748b', '#94a3b8', '#64748b', '#94a3b8'];

    var roleCanvas = document.getElementById('admin-role-chart');
    if (roleCanvas) {
      if (adminRoleChart) { adminRoleChart.destroy(); adminRoleChart = null; }
      var roleTotal = roleDataArr.reduce(function (a, b) { return a + b; }, 0);
      adminRoleChart = new Chart(roleCanvas, {
        type: 'doughnut',
        data: {
          labels: roleLabelsArr,
          datasets: [{ data: roleDataArr, backgroundColor: mutedColors, borderColor: '#0f172a', borderWidth: 2 }]
        },
        options: {
          cutout: '60%',
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1,
          layout: { padding: 8 },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: function (context) {
                  var value = context.parsed;
                  var pct = roleTotal ? ((value / roleTotal) * 100).toFixed(1) : '0';
                  return context.label + ': ' + value + '명 (' + pct + '%)';
                }
              }
            }
          }
        }
      });
    }

    var divisionCanvas = document.getElementById('admin-division-chart');
    if (divisionCanvas) {
      if (adminDivisionChart) { adminDivisionChart.destroy(); adminDivisionChart = null; }
      var divColors = divisionOrder.map(function (_, i) { return divisionColors[i % divisionColors.length]; });
      adminDivisionChart = new Chart(divisionCanvas, {
        type: 'bar',
        data: {
          labels: divisionOrder,
          datasets: [{
            data: divisionDataArr,
            backgroundColor: divColors,
            borderSkipped: false,
            borderRadius: 6,
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    var schoolCanvas = document.getElementById('admin-school-chart');
    if (schoolCanvas) {
      if (adminSchoolChart) { adminSchoolChart.destroy(); adminSchoolChart = null; }
      var schoolColors = ['#334155', '#475569', '#64748b', '#94a3b8', '#0ea5e9', '#f59e0b', '#10b981'];
      var sc = schoolOrder.map(function (_, i) { return schoolColors[i % schoolColors.length]; });
      adminSchoolChart = new Chart(schoolCanvas, {
        type: 'bar',
        data: {
          labels: schoolOrder.length ? schoolOrder : ['(없음)'],
          datasets: [{
            data: schoolOrder.length ? schoolDataArr : [0],
            backgroundColor: sc,
            borderSkipped: false,
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) { return (context.parsed.x || 0) + '명'; }
              }
            }
          }
        }
      });
    }

    var graduatedCanvas = document.getElementById('admin-graduated-chart');
    if (graduatedCanvas) {
      if (adminGraduatedChart) { adminGraduatedChart.destroy(); adminGraduatedChart = null; }
      var gradLabels = ['졸업하지 않은 사람', '졸업한 사람'];
      var gradData = [nonGraduatedCount, graduatedCount];
      var gradColors = ['#0ea5e9', '#64748b'];
      adminGraduatedChart = new Chart(graduatedCanvas, {
        type: 'doughnut',
        data: {
          labels: gradLabels,
          datasets: [{ data: gradData, backgroundColor: gradColors, borderColor: '#0f172a', borderWidth: 2 }]
        },
        options: {
          cutout: '60%',
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1,
          layout: { padding: 8 },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: function (context) {
                  var total = gradData[0] + gradData[1];
                  var pct = total ? ((context.parsed / total) * 100).toFixed(1) : '0';
                  return context.label + ': ' + context.parsed + '명 (' + pct + '%)';
                }
              }
            }
          }
        }
      });
    }

    requestAnimationFrame(function () {
      if (adminRoleChart) adminRoleChart.resize();
      if (adminDivisionChart) adminDivisionChart.resize();
      if (adminSchoolChart) adminSchoolChart.resize();
      if (adminGraduatedChart) adminGraduatedChart.resize();
    });
  }

  var USAGE_SECTION_LABELS = { search: 'Search', overview: 'Overview', chart: 'Chart', income: 'Income Statement', balance: 'Balance Sheet', cashflow: 'Cash Flow', ratios: 'Key Ratios', trend: 'Trend', comps: 'COMPS', ownership: 'OWNERSHIP', estimates: 'ESTIMATES', news: 'NEWS' };

  function renderAdminUsageCharts(usageStats) {
    if (typeof Chart === 'undefined' || !usageStats) return;
    var byUser = usageStats.by_user || [];
    var byAction = usageStats.by_action || {};
    var searchCanvas = document.getElementById('admin-usage-search-chart');
    if (searchCanvas) {
      if (adminUsageSearchChart) { adminUsageSearchChart.destroy(); adminUsageSearchChart = null; }
      var sorted = byUser.slice().sort(function (a, b) { return (b.search || 0) - (a.search || 0); });
      var names = sorted.map(function (u) { return u.name || u.email || 'User #' + u.user_id; });
      var counts = sorted.map(function (u) { return u.search || 0; });
      adminUsageSearchChart = new Chart(searchCanvas, {
        type: 'bar',
        data: {
          labels: names.length ? names : ['No data'],
          datasets: [{ label: 'Search count', data: counts.length ? counts : [0], backgroundColor: '#475569', borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0 } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
    var sectionsCanvas = document.getElementById('admin-usage-sections-chart');
    if (sectionsCanvas) {
      if (adminUsageSectionsChart) { adminUsageSectionsChart.destroy(); adminUsageSectionsChart = null; }
      var order = ['overview', 'chart', 'income', 'balance', 'cashflow', 'ratios', 'trend', 'comps', 'ownership', 'estimates', 'news'];
      var sectionLabels = order.map(function (k) { return USAGE_SECTION_LABELS[k] || k; });
      var sectionData = order.map(function (k) { return byAction[k] || 0; });
      adminUsageSectionsChart = new Chart(sectionsCanvas, {
        type: 'bar',
        data: {
          labels: sectionLabels,
          datasets: [{ label: 'Clicks', data: sectionData, backgroundColor: ['#334155', '#475569', '#64748b', '#94a3b8', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'], borderRadius: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } },
            y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', stepSize: 1 } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
    requestAnimationFrame(function () {
      if (adminUsageSearchChart) adminUsageSearchChart.resize();
      if (adminUsageSectionsChart) adminUsageSectionsChart.resize();
    });
  }

  async function loadAdminUsers() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    try {
      const users = await fetchUsers();
      adminUsersList = users || [];
      adminUsersPage = 1;
      applyAdminUsersView();
      var list = adminUsersList;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          renderAdminCharts(list);
        });
      });
      try {
        var usageRes = await fetch('/api/admin/usage-stats', { credentials: 'same-origin' });
        if (usageRes.ok) {
          var usageData = await usageRes.json();
          renderAdminUsageCharts(usageData);
        }
      } catch (err) {}
    } catch (e) {
      adminUsersList = [];
      tbody.innerHTML =
        '<tr><td colspan="8" class="px-4 py-8 text-center text-red-400">Failed to load users.</td></tr>';
    }
  }

  function exportUsersExcel() {
    var headers = ['Name', 'Email', 'School', 'Division', 'Team', 'Role', 'Status'];
    var rows = adminUsersList.map(function (u) {
      return [
        u.name || '',
        u.email || '',
        (u.school || '').trim() || '',
        u.division || '',
        (u.team != null && u.team !== '') ? String(u.team) : '',
        roleDisplay(u.role),
        u.is_active !== false ? 'Active' : 'Paused'
      ];
    });
    downloadTableAsExcel(headers, rows, 'users.csv');
  }

  // -------------------------------------------------------------------------
  // Admin: Applications (Join Us 신청 목록)
  // -------------------------------------------------------------------------
  async function fetchApplications() {
    const res = await fetch('/api/applications', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to fetch applications');
    const data = await res.json();
    return data.applications || [];
  }

  function divisionDisplay(division) {
    if (division === 'equity_research') return 'Equity Research';
    if (division === 'investment') return 'Investment';
    if (division === 'case_competition') return 'Case Competition';
    if (division === 'pd_pr') return 'PD/PR';
    return division || '—';
  }

  function renderApplicationsTable(applications) {
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;
    tbody.innerHTML = applications.length
      ? applications
          .map(function (a) {
            const dateStr = a.created_at ? a.created_at.slice(0, 10) : '—';
            const resumeHtml = a.resume_path
              ? '<a href="/api/applications/' + a.id + '/resume" class="text-cyan-400 hover:text-cyan-300 text-xs font-medium" target="_blank" rel="noopener">Download</a>'
              : '<span class="text-slate-500">—</span>';
            const approved = a.approved_user_id != null && a.approved_user_id !== '';
            const actionsHtml = approved
              ? '<span class="text-emerald-400/90 text-xs font-medium">Approved</span>'
              : '<button type="button" class="admin-btn-approve-app px-2 py-1 rounded text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors" data-application-id="' + a.id + '">Approve</button>';
            return (
              '<tr class="hover:bg-slate-700/20" data-application-id="' + a.id + '">' +
              '<td class="px-4 py-3 text-slate-400 text-xs">' + escapeHtml(dateStr) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(a.name) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(a.email) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(a.school) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + (a.major ? escapeHtml(a.major) : '—') + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + (a.grade ? escapeHtml(a.grade) : '—') + '</td>' +
              '<td class="px-4 py-3 text-slate-400">' + escapeHtml(divisionDisplay(a.division)) + '</td>' +
              '<td class="px-4 py-3">' + resumeHtml + '</td>' +
              '<td class="px-4 py-3">' + actionsHtml + '</td>' +
              '</tr>'
            );
          })
          .join('')
      : '<tr><td colspan="9" class="px-4 py-8 text-center text-slate-500">No applications yet.</td></tr>';
  }

  async function approveApplication(applicationId) {
    try {
      const res = await fetch('/api/applications/' + applicationId + '/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        alert(data.message || data.error || 'Approval failed.');
        return;
      }
      if (typeof loadAdminApplications === 'function') loadAdminApplications();
      if (typeof loadAdminUsers === 'function') loadAdminUsers();
    } catch (e) {
      alert('Network error.');
    }
  }

  function applyAdminApplicationsView() {
    var searchEl = document.getElementById('admin-applications-search');
    var query = (searchEl && searchEl.value) || '';
    var filtered = filterListBySearch(adminApplicationsList, query, function (a) {
      return [a.name, a.email, a.school, a.major, a.grade, divisionDisplay(a.division), a.created_at].join(' ');
    });
    function getAppValue(a, key) {
      if (key === 'date') return a.created_at || '';
      if (key === 'name') return a.name;
      if (key === 'email') return a.email;
      if (key === 'school') return a.school;
      if (key === 'major') return a.major;
      if (key === 'grade') return a.grade;
      if (key === 'division') return divisionDisplay(a.division);
      return '';
    }
    filtered = sortList(filtered, getAppValue, adminApplicationsSortKey, adminApplicationsSortDir);
    var totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (adminApplicationsPage > totalPages) adminApplicationsPage = totalPages;
    if (adminApplicationsPage < 1) adminApplicationsPage = 1;
    var start = (adminApplicationsPage - 1) * ADMIN_PAGE_SIZE;
    var slice = filtered.slice(start, start + ADMIN_PAGE_SIZE);
    renderApplicationsTable(slice);
    updatePaginationUI('admin-applications', filtered.length, adminApplicationsPage);
    updateSortHeaders('admin-applications', adminApplicationsSortKey, adminApplicationsSortDir);
    initApplicationsActions();
  }

  async function loadAdminApplications() {
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;
    try {
      const applications = await fetchApplications();
      adminApplicationsList = applications || [];
      adminApplicationsPage = 1;
      applyAdminApplicationsView();
    } catch (e) {
      adminApplicationsList = [];
      tbody.innerHTML =
        '<tr><td colspan="9" class="px-4 py-8 text-center text-red-400">Failed to load applications.</td></tr>';
    }
  }

  function exportApplicationsExcel() {
    var headers = ['Date', 'Name', 'Email', 'School', 'Major', 'Grade', 'Division', 'Resume', 'Approved'];
    var rows = adminApplicationsList.map(function (a) {
      var dateStr = a.created_at ? a.created_at.slice(0, 10) : '';
      return [
        dateStr,
        a.name || '',
        a.email || '',
        a.school || '',
        a.major || '',
        a.grade || '',
        divisionDisplay(a.division),
        a.resume_path ? 'Y' : '',
        (a.approved_user_id != null && a.approved_user_id !== '') ? 'Yes' : 'No'
      ];
    });
    downloadTableAsExcel(headers, rows, 'applications.csv');
  }

  function initApplicationsActions() {
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;
    tbody.removeEventListener('click', handleApplicationsTableClick);
    tbody.addEventListener('click', handleApplicationsTableClick);
  }

  function handleApplicationsTableClick(e) {
    const btn = e.target.closest('.admin-btn-approve-app');
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-application-id');
    if (id) approveApplication(id);
  }

  // -------------------------------------------------------------------------
  // Admin: Donations (기부하기 신청 목록)
  // -------------------------------------------------------------------------
  async function fetchDonations() {
    const res = await fetch('/api/donations', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to fetch donations');
    const data = await res.json();
    return data.donations || [];
  }

  function renderDonationsTable(donations) {
    const tbody = document.getElementById('donations-table-body');
    if (!tbody) return;
    tbody.innerHTML = donations.length
      ? donations
          .map(function (d) {
            const dateStr = d.created_at ? d.created_at.slice(0, 10) : '—';
            const completed = d.completed === true;
            const statusHtml = completed
              ? '<span class="text-emerald-400/90 text-xs font-medium">Complete</span>'
              : '<span class="text-amber-400/90 text-xs font-medium">Pending</span>';
            const actionsHtml = completed
              ? '<span class="text-slate-500 text-xs">—</span>'
              : '<button type="button" class="admin-btn-donation-complete px-2 py-1 rounded text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 transition-colors" data-donation-id="' + d.id + '" title="Mark complete">✓</button>';
            return (
              '<tr class="hover:bg-slate-700/20" data-donation-id="' + d.id + '">' +
              '<td class="px-4 py-3 text-slate-400 text-xs">' + escapeHtml(dateStr) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(d.name) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(d.email) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(d.amount) + '</td>' +
              '<td class="px-4 py-3">' + statusHtml + '</td>' +
              '<td class="px-4 py-3">' + actionsHtml + '</td>' +
              '</tr>'
            );
          })
          .join('')
      : '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No donations yet.</td></tr>';
  }

  async function completeDonation(donationId) {
    try {
      const res = await fetch('/api/donations/' + donationId + '/complete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        alert(data.message || data.error || 'Failed to mark as complete.');
        return;
      }
      if (typeof loadAdminDonations === 'function') loadAdminDonations();
    } catch (e) {
      alert('Network error.');
    }
  }

  function applyAdminDonationsView() {
    var searchEl = document.getElementById('admin-donations-search');
    var query = (searchEl && searchEl.value) || '';
    var filtered = filterListBySearch(adminDonationsList, query, function (d) {
      return [d.name, d.email, d.amount, d.created_at, d.completed ? 'Complete' : 'Pending'].join(' ');
    });
    function getDonValue(d, key) {
      if (key === 'date') return d.created_at || '';
      if (key === 'name') return d.name;
      if (key === 'email') return d.email;
      if (key === 'amount') return d.amount;
      if (key === 'status') return d.completed === true ? 'Complete' : 'Pending';
      return '';
    }
    filtered = sortList(filtered, getDonValue, adminDonationsSortKey, adminDonationsSortDir);
    var totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (adminDonationsPage > totalPages) adminDonationsPage = totalPages;
    if (adminDonationsPage < 1) adminDonationsPage = 1;
    var start = (adminDonationsPage - 1) * ADMIN_PAGE_SIZE;
    var slice = filtered.slice(start, start + ADMIN_PAGE_SIZE);
    renderDonationsTable(slice);
    updatePaginationUI('admin-donations', filtered.length, adminDonationsPage);
    updateSortHeaders('admin-donations', adminDonationsSortKey, adminDonationsSortDir);
    initDonationsActions();
  }

  async function loadAdminDonations() {
    const tbody = document.getElementById('donations-table-body');
    if (!tbody) return;
    try {
      const donations = await fetchDonations();
      adminDonationsList = donations || [];
      adminDonationsPage = 1;
      applyAdminDonationsView();
    } catch (e) {
      adminDonationsList = [];
      tbody.innerHTML =
        '<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">Failed to load donations.</td></tr>';
    }
  }

  function exportDonationsExcel() {
    var headers = ['Date', 'Name', 'Email', 'Amount', 'Status'];
    var rows = adminDonationsList.map(function (d) {
      var dateStr = d.created_at ? d.created_at.slice(0, 10) : '';
      return [
        dateStr,
        d.name || '',
        d.email || '',
        d.amount || '',
        d.completed === true ? 'Complete' : 'Pending'
      ];
    });
    downloadTableAsExcel(headers, rows, 'donations.csv');
  }

  function initDonationsActions() {
    const tbody = document.getElementById('donations-table-body');
    if (!tbody) return;
    tbody.removeEventListener('click', handleDonationsTableClick);
    tbody.addEventListener('click', handleDonationsTableClick);
  }

  function handleDonationsTableClick(e) {
    const btn = e.target.closest('.admin-btn-donation-complete');
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-donation-id');
    if (id) completeDonation(id);
  }

  // -------------------------------------------------------------------------
  // Admin: Inquiries (Contact 페이지 문의 목록)
  // -------------------------------------------------------------------------
  async function fetchInquiries() {
    const res = await fetch('/api/inquiries', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to fetch inquiries');
    const data = await res.json();
    return data.inquiries || [];
  }

  function renderInquiriesTable(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;
    tbody.innerHTML = inquiries.length
      ? inquiries
          .map(function (i) {
            const dateStr = i.created_at ? i.created_at.slice(0, 10) : '—';
            const msgShort = (i.message || '').length > 80 ? (i.message || '').slice(0, 80) + '…' : (i.message || '');
            return (
              '<tr class="hover:bg-slate-700/20">' +
              '<td class="px-4 py-3 text-slate-400 text-xs">' + escapeHtml(dateStr) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(i.name) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(i.email) + '</td>' +
              '<td class="px-4 py-3 text-slate-300">' + escapeHtml(i.subject) + '</td>' +
              '<td class="px-4 py-3 text-slate-400 text-xs max-w-[280px] truncate" title="' + escapeHtml(i.message || '') + '">' + escapeHtml(msgShort) + '</td>' +
              '</tr>'
            );
          })
          .join('')
      : '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">No inquiries yet.</td></tr>';
  }

  function applyAdminInquiriesView() {
    var searchEl = document.getElementById('admin-inquiries-search');
    var query = (searchEl && searchEl.value) || '';
    var filtered = filterListBySearch(adminInquiriesList, query, function (i) {
      return [i.name, i.email, i.subject, i.message, i.created_at].join(' ');
    });
    function getInqValue(i, key) {
      if (key === 'date') return i.created_at || '';
      if (key === 'name') return i.name;
      if (key === 'email') return i.email;
      if (key === 'subject') return i.subject;
      return '';
    }
    filtered = sortList(filtered, getInqValue, adminInquiriesSortKey, adminInquiriesSortDir);
    var totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (adminInquiriesPage > totalPages) adminInquiriesPage = totalPages;
    if (adminInquiriesPage < 1) adminInquiriesPage = 1;
    var start = (adminInquiriesPage - 1) * ADMIN_PAGE_SIZE;
    var slice = filtered.slice(start, start + ADMIN_PAGE_SIZE);
    renderInquiriesTable(slice);
    updatePaginationUI('admin-inquiries', filtered.length, adminInquiriesPage);
    updateSortHeaders('admin-inquiries', adminInquiriesSortKey, adminInquiriesSortDir);
  }

  async function loadAdminInquiries() {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;
    try {
      const inquiries = await fetchInquiries();
      adminInquiriesList = inquiries || [];
      adminInquiriesPage = 1;
      applyAdminInquiriesView();
    } catch (e) {
      adminInquiriesList = [];
      tbody.innerHTML =
        '<tr><td colspan="5" class="px-4 py-8 text-center text-red-400">Failed to load inquiries.</td></tr>';
    }
  }

  function exportInquiriesExcel() {
    var headers = ['Date', 'Name', 'Email', 'Subject', 'Message'];
    var rows = adminInquiriesList.map(function (i) {
      var dateStr = i.created_at ? i.created_at.slice(0, 10) : '';
      return [
        dateStr,
        i.name || '',
        i.email || '',
        i.subject || '',
        (i.message || '').replace(/\r?\n/g, ' ')
      ];
    });
    downloadTableAsExcel(headers, rows, 'inquiries.csv');
  }

  function handleAdminSortClick(e) {
    var th = e.target.closest('.admin-th-sort');
    if (!th) return;
    var table = th.closest('table');
    if (!table) return;
    var tableName = table.getAttribute('data-admin-table');
    var key = th.getAttribute('data-sort');
    if (!key) return;
    if (tableName === 'users') {
      if (adminUsersSortKey === key) adminUsersSortDir = adminUsersSortDir === 'asc' ? 'desc' : 'asc';
      else { adminUsersSortKey = key; adminUsersSortDir = 'asc'; }
      applyAdminUsersView();
    } else if (tableName === 'applications') {
      if (adminApplicationsSortKey === key) adminApplicationsSortDir = adminApplicationsSortDir === 'asc' ? 'desc' : 'asc';
      else { adminApplicationsSortKey = key; adminApplicationsSortDir = 'asc'; }
      applyAdminApplicationsView();
    } else if (tableName === 'donations') {
      if (adminDonationsSortKey === key) adminDonationsSortDir = adminDonationsSortDir === 'asc' ? 'desc' : 'asc';
      else { adminDonationsSortKey = key; adminDonationsSortDir = 'asc'; }
      applyAdminDonationsView();
    } else if (tableName === 'inquiries') {
      if (adminInquiriesSortKey === key) adminInquiriesSortDir = adminInquiriesSortDir === 'asc' ? 'desc' : 'asc';
      else { adminInquiriesSortKey = key; adminInquiriesSortDir = 'asc'; }
      applyAdminInquiriesView();
    }
  }

  function initAdminTableControls() {
    var viewAdmin = document.getElementById('view-admin');
    if (viewAdmin) viewAdmin.addEventListener('click', handleAdminSortClick);

    var usersSearch = document.getElementById('admin-users-search');
    var usersPrev = document.getElementById('admin-users-prev');
    var usersNext = document.getElementById('admin-users-next');
    var usersExcel = document.getElementById('admin-users-excel');
    if (usersSearch) {
      usersSearch.addEventListener('input', function () { adminUsersPage = 1; applyAdminUsersView(); });
    }
    if (usersPrev) usersPrev.addEventListener('click', function () { adminUsersPage--; applyAdminUsersView(); });
    if (usersNext) usersNext.addEventListener('click', function () { adminUsersPage++; applyAdminUsersView(); });
    if (usersExcel) usersExcel.addEventListener('click', exportUsersExcel);

    var appSearch = document.getElementById('admin-applications-search');
    var appPrev = document.getElementById('admin-applications-prev');
    var appNext = document.getElementById('admin-applications-next');
    var appExcel = document.getElementById('admin-applications-excel');
    if (appSearch) {
      appSearch.addEventListener('input', function () { adminApplicationsPage = 1; applyAdminApplicationsView(); });
    }
    if (appPrev) appPrev.addEventListener('click', function () { adminApplicationsPage--; applyAdminApplicationsView(); });
    if (appNext) appNext.addEventListener('click', function () { adminApplicationsPage++; applyAdminApplicationsView(); });
    if (appExcel) appExcel.addEventListener('click', exportApplicationsExcel);

    var donSearch = document.getElementById('admin-donations-search');
    var donPrev = document.getElementById('admin-donations-prev');
    var donNext = document.getElementById('admin-donations-next');
    var donExcel = document.getElementById('admin-donations-excel');
    if (donSearch) {
      donSearch.addEventListener('input', function () { adminDonationsPage = 1; applyAdminDonationsView(); });
    }
    if (donPrev) donPrev.addEventListener('click', function () { adminDonationsPage--; applyAdminDonationsView(); });
    if (donNext) donNext.addEventListener('click', function () { adminDonationsPage++; applyAdminDonationsView(); });
    if (donExcel) donExcel.addEventListener('click', exportDonationsExcel);

    var inqSearch = document.getElementById('admin-inquiries-search');
    var inqPrev = document.getElementById('admin-inquiries-prev');
    var inqNext = document.getElementById('admin-inquiries-next');
    var inqExcel = document.getElementById('admin-inquiries-excel');
    if (inqSearch) {
      inqSearch.addEventListener('input', function () { adminInquiriesPage = 1; applyAdminInquiriesView(); });
    }
    if (inqPrev) inqPrev.addEventListener('click', function () { adminInquiriesPage--; applyAdminInquiriesView(); });
    if (inqNext) inqNext.addEventListener('click', function () { adminInquiriesPage++; applyAdminInquiriesView(); });
    if (inqExcel) inqExcel.addEventListener('click', exportInquiriesExcel);
  }

  // -------------------------------------------------------------------------
  // Admin: 모달 열기/닫기
  // -------------------------------------------------------------------------
  var modalEl = document.getElementById('admin-add-modal');
  var addBtn = document.getElementById('admin-add-analyst-btn');
  var cancelBtn = document.getElementById('admin-modal-cancel');
  var backdrop = document.getElementById('admin-modal-backdrop');

  function openAddModal() {
    if (modalEl) {
      modalEl.classList.remove('hidden');
      modalEl.setAttribute('aria-hidden', 'false');
    }
  }

  function closeAddModal() {
    if (modalEl) {
      modalEl.classList.add('hidden');
      modalEl.setAttribute('aria-hidden', 'true');
    }
  }

  function initModal() {
    if (addBtn) addBtn.addEventListener('click', openAddModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddModal);
    if (backdrop) backdrop.addEventListener('click', closeAddModal);
    var editCancel = document.getElementById('admin-edit-modal-cancel');
    var editBackdrop = document.getElementById('admin-edit-modal-backdrop');
    var editSubmit = document.getElementById('admin-edit-submit');
    if (editCancel) editCancel.addEventListener('click', closeEditModal);
    if (editBackdrop) editBackdrop.addEventListener('click', closeEditModal);
    if (editSubmit) editSubmit.addEventListener('click', function () {
      var idEl = document.getElementById('edit-user-id');
      var userId = idEl && idEl.value ? idEl.value.trim() : '';
      if (!userId) return;
      var nameEl = document.getElementById('edit-name');
      var emailEl = document.getElementById('edit-email');
      var passEl = document.getElementById('edit-password');
      var divEl = document.getElementById('edit-division');
      var teamEl = document.getElementById('edit-team');
      var roleEl = document.getElementById('edit-role');
      var schoolEl = document.getElementById('edit-school');
      var payload = {
        name: (nameEl && nameEl.value) ? nameEl.value.trim() : '',
        email: (emailEl && emailEl.value) ? emailEl.value.trim() : '',
        school: (schoolEl && schoolEl.value) ? schoolEl.value.trim() : '',
        division: (divEl && divEl.value) ? divEl.value.trim() : '',
        team: (teamEl && teamEl.value.trim() !== '') ? teamEl.value.trim() : null,
        role: (roleEl && roleEl.value) ? roleEl.value.trim() : 'analyst',
      };
      if (passEl && passEl.value.trim()) payload.password = passEl.value;
      editSubmit.disabled = true;
      editSubmit.textContent = 'Saving…';
      fetch('/api/users/' + userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok) {
            closeEditModal();
            loadAdminUsers();
          } else {
            alert(result.data.message || result.data.error || 'Update failed.');
          }
        })
        .catch(function () { alert('Network error.'); })
        .finally(function () {
          editSubmit.disabled = false;
          editSubmit.textContent = 'Save Changes';
        });
    });
  }

  // -------------------------------------------------------------------------
  // Admin: 폼 제출 → POST /api/users → 성공 시 테이블 새로고침
  // -------------------------------------------------------------------------
  function initAddForm() {
    var form = document.getElementById('admin-add-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      var origText = submitBtn ? submitBtn.textContent : '';
      var divisionEl = document.getElementById('add-division');
      var teamEl = document.getElementById('add-team');
      var roleEl = document.getElementById('add-role');
      var schoolEl = document.getElementById('add-school');
      var payload = {
        name: document.getElementById('add-name').value.trim(),
        email: document.getElementById('add-email').value.trim(),
        school: (schoolEl && schoolEl.value) ? schoolEl.value.trim() : '',
        password: document.getElementById('add-password').value,
        division: (divisionEl && divisionEl.value) ? divisionEl.value.trim() : '',
        team: (teamEl && teamEl.value.trim() !== '') ? teamEl.value.trim() : null,
        role: (roleEl && roleEl.value) ? roleEl.value.trim() : 'analyst',
      };
      if (!payload.division) {
        alert('Please select a division.');
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating…';
      }
      try {
        var res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () { return {}; });
        if (res.ok) {
          closeAddModal();
          form.reset();
          await loadAdminUsers();
        } else {
          alert(data.message || data.error || 'Failed to create user.');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Financial Tools: 지연 로딩 + 프론트 캐싱
  // -------------------------------------------------------------------------
  var currentTicker = '';
  var financialCache = {};
  var financialChartInstance = null;

  function showToolLoader() {
    var el = document.getElementById('tool-loader');
    if (el) el.classList.remove('hidden');
  }
  function hideToolLoader() {
    var el = document.getElementById('tool-loader');
    if (el) el.classList.add('hidden');
  }

  var FINANCIAL_USAGE_ACTIONS = ['search', 'overview', 'chart', 'income', 'balance', 'cashflow', 'ratios', 'trend', 'comps', 'ownership', 'estimates', 'news'];

  function recordFinancialToolUsage(action) {
    if (!action || FINANCIAL_USAGE_ACTIONS.indexOf(action) === -1) return;
    fetch('/api/terminal/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: action })
    }).catch(function () {});
  }

  function setActiveFinancialTab(tabName) {
    document.querySelectorAll('.financial-tool-nav').forEach(function (btn) {
      btn.classList.remove('bg-slate-700/80', 'text-white');
      if ((btn.getAttribute('data-tab') || '') === tabName) {
        btn.classList.add('bg-slate-700/80', 'text-white');
      }
    });
  }

  function formatNum(x) {
    if (x == null || x === '' || isNaN(Number(x))) return '—';
    var n = Number(x);
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toLocaleString();
  }

  function renderSummary(profile) {
    var container = document.getElementById('company-summary');
    if (!container) return;
    if (!profile || !profile.companyName) {
      container.innerHTML = '';
      return;
    }
    var price = profile.price != null ? Number(profile.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    var pct = profile.changesPercentage != null ? Number(profile.changesPercentage).toFixed(2) : (profile.changesPercent != null ? Number(profile.changesPercent).toFixed(2) : '—');
    var pctClass = pct !== '—' && Number(pct) >= 0 ? 'text-emerald-400' : 'text-rose-400';
    container.innerHTML =
      '<span class="text-slate-200 font-medium">' + escapeHtml(profile.companyName || profile.symbol || '') + '</span>' +
      ' <span class="text-slate-400">|</span> ' +
      '<span class="text-slate-300">Price: ' + price + '</span>' +
      ' <span class="' + pctClass + '">(' + (pct !== '—' ? (Number(pct) >= 0 ? '+' : '') + pct + '%' : '—') + ')</span>';
  }

  function renderOverviewPanel(profile) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!profile || !profile.companyName) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No profile data. Enter a ticker and Search.</p>';
      return;
    }
    var esc = escapeHtml;
    var companyName = profile.companyName || profile.company_name || profile.name || profile.symbol || '—';
    var symbol = (profile.symbol || currentTicker || '').toUpperCase();
    var image = profile.image || profile.logo || '';
    var ceo = profile.ceo || profile.CEO || '—';
    var price = profile.price != null ? Number(profile.price).toFixed(2) : (profile.Price != null ? Number(profile.Price).toFixed(2) : '—');
    var chg = profile.changesPercentage != null ? Number(profile.changesPercentage).toFixed(2) : (profile.changesPercent != null ? Number(profile.changesPercent).toFixed(2) : null);
    var chgStr = chg != null ? (chg >= 0 ? '+' : '') + chg + '%' : '—';
    var chgClass = chg != null && chg >= 0 ? 'text-emerald-400' : 'text-rose-400';
    var sector = profile.sector || '—';
    var industry = profile.industry || '—';
    var mktCap = profile.mktCap != null ? profile.mktCap : (profile.marketCap != null ? profile.marketCap : profile.marketCapitalization);
    var mktCapStr = '—';
    if (mktCap != null && mktCap !== '') {
      var mc = Number(mktCap);
      if (!isNaN(mc)) mktCapStr = mc >= 1e12 ? (mc / 1e12).toFixed(2) + 'T' : mc >= 1e9 ? (mc / 1e9).toFixed(2) + 'B' : mc >= 1e6 ? (mc / 1e6).toFixed(2) + 'M' : mc >= 1e3 ? (mc / 1e3).toFixed(2) + 'K' : mc.toString();
    }
    var exchange = profile.exchangeShortName || profile.exchange || profile.Exchange || '—';
    var currency = profile.currency || profile.Currency || 'USD';
    var ipoDate = profile.ipoDate || profile.IPOdate || '—';
    var beta = profile.beta != null ? Number(profile.beta).toFixed(2) : '—';
    var volAvg = profile.volAvg != null ? (Number(profile.volAvg) >= 1e6 ? (Number(profile.volAvg) / 1e6).toFixed(2) + 'M' : Number(profile.volAvg).toLocaleString()) : '—';
    var range = profile.range || profile.Range || '—';
    var lastDiv = profile.lastDiv != null ? Number(profile.lastDiv).toFixed(2) : (profile.lastDividend != null ? Number(profile.lastDividend).toFixed(2) : '—');
    var fullTimeEmployees = profile.fullTimeEmployees != null ? profile.fullTimeEmployees.toLocaleString() : (profile.employees != null ? profile.employees.toLocaleString() : '—');
    var isEtf = profile.isEtf === true || profile.isETF === true;
    var isAdr = profile.isAdr === true || profile.isADR === true;
    var desc = (profile.description || '').slice(0, 400);
    if (desc && desc.length === 400) desc += '…';

    function statCell(label, value, isNumeric) {
      var valueClass = isNumeric ? 'font-mono tabular-nums text-slate-100 font-medium' : 'text-slate-100 font-medium';
      return '<div class="bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/50">' +
        '<div class="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">' + esc(label) + '</div>' +
        '<div class="' + valueClass + ' text-sm">' + esc(String(value)) + '</div></div>';
    }

    var pricePrefix = currency === 'USD' && price !== '—' ? '$' : '';
    var headerHtml =
      '<div class="flex flex-wrap items-center gap-4 sm:gap-6">' +
      (image ? '<img src="' + esc(image) + '" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain bg-slate-800/80 border border-slate-700/60 shrink-0" onerror="this.style.display=\'none\'">' : '') +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex flex-wrap items-center gap-2 gap-y-1">' +
      '<h1 class="text-xl sm:text-2xl font-semibold text-white tracking-tight">' + esc(companyName) + '</h1>' +
      '<span class="inline-flex items-center gap-1.5">' +
      '<span class="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/80 text-slate-300 border border-slate-600/60">' + esc(symbol) + '</span>' +
      '<span class="text-xs text-slate-500">' + esc(exchange) + '</span>' +
      '</span></div>' +
      '<div class="mt-2 flex flex-wrap items-baseline gap-3 gap-y-1">' +
      '<span class="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-white">' + pricePrefix + (price !== '—' ? price : '—') + '</span>' +
      (chgStr !== '—' ? '<span class="' + chgClass + ' font-mono text-sm font-medium tabular-nums">' + chgStr + '</span>' : '') +
      '</div></div></div>';

    var gridGroup1 = statCell('MKT CAP', mktCapStr, true) + statCell('BETA', beta, true) + statCell('LAST DIVIDEND', lastDiv !== '—' ? pricePrefix + lastDiv : lastDiv, true) + statCell('52W RANGE', range, false);
    var gridGroup2 = statCell('SECTOR', sector, false) + statCell('INDUSTRY', industry, false) + statCell('EMPLOYEES', fullTimeEmployees, true) + statCell('IPO DATE', ipoDate, false);
    var gridGroup3 = statCell('CEO', ceo, false) + statCell('AVG VOLUME', volAvg, true) + statCell('CURRENCY', currency, false) + statCell('COMMON STOCK', isEtf ? 'ETF' : (isAdr ? 'ADR' : 'Equity'), false);

    content.innerHTML =
      '<div class="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">' +
      '<div class="p-5 sm:p-6 border-b border-slate-700/60">' + headerHtml + '</div>' +
      '<div class="p-5 sm:p-6">' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' + gridGroup1 + gridGroup2 + gridGroup3 + '</div>' +
      '</div>' +
      (desc ? '<div class="px-5 sm:px-6 py-4 border-t border-slate-700/50 bg-slate-800/20">' +
        '<div class="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">Description</div>' +
        '<p class="text-slate-400 text-sm leading-relaxed" style="line-height: 1.65;">' + esc(desc) + '</p></div>' : '') +
      '</div>';
  }

  var financialChartType = 'line';
  var financialChartPeriod = '1Y';
  var financialChartInstance = null;
  var financialVolumeChartInstance = null;
  var financialChartHistorical = [];

  var GRID_COLOR = '#334155';
  var FONT_COLOR = '#94a3b8';
  var TOOLTIP_HIDE_DELAY_MS = 600;
  var tooltipHideTimeout = null;
  var lastHoveredIndex = -1;

  (function registerTooltipDelayPlugin() {
    if (typeof Chart === 'undefined') return;
    Chart.register({
      id: 'tooltipHideDelay',
      afterEvent: function (chart, args) {
        if (args.event.type === 'mousemove' && args.in) {
          if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
            tooltipHideTimeout = null;
          }
          var el = chart.getElementsAtEventForMode(args.event, 'index', { intersect: false }, false);
          if (el.length) lastHoveredIndex = el[0].index;
        }
        if (args.event.type === 'mouseout' || (args.event.type === 'mousemove' && !args.in)) {
          if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
          if (lastHoveredIndex < 0) return;
          var datasets = chart.data.datasets;
          var active = [];
          datasets.forEach(function (_, i) {
            if (chart.getDatasetMeta(i).data[lastHoveredIndex]) active.push({ datasetIndex: i, index: lastHoveredIndex });
          });
          if (active.length) {
            chart.setActiveElements(active);
            chart.update('none');
          }
          tooltipHideTimeout = setTimeout(function () {
            tooltipHideTimeout = null;
            chart.setActiveElements([]);
            chart.update('none');
          }, TOOLTIP_HIDE_DELAY_MS);
        }
      },
    });
  })();

  function renderOverview(profile, historical) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!historical || !historical.length) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No historical price data.</p>';
      return;
    }
    financialChartHistorical = historical;
    var labels = historical.map(function (d) { return d.date; });
    var hasOHLC = historical[0].open != null && historical[0].high != null && historical[0].low != null;

    content.innerHTML =
      '<div class="flex flex-col flex-1 min-h-0">' +
      '<div class="flex justify-between items-center mb-4 bg-slate-800/50 p-2 rounded shrink-0">' +
      '<div class="flex gap-1">' +
      ['1D', '5D', '1M', '6M', '1Y', '5Y'].map(function (p) {
        var active = p === financialChartPeriod;
        return '<button type="button" class="chart-period-btn px-2.5 py-1 rounded text-sm font-medium ' + (active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200') + '" data-period="' + p + '">' + p + '</button>';
      }).join('') +
      '</div>' +
      '<div class="flex items-center gap-1 bg-slate-700/50 rounded p-0.5">' +
      '<button type="button" class="chart-type-btn p-1.5 rounded ' + (financialChartType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200') + '" data-chart-type="line" title="Line">' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg></button>' +
      '<button type="button" class="chart-type-btn p-1.5 rounded ' + (financialChartType === 'candlestick' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200') + '" data-chart-type="candlestick" title="Candle">' +
      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></button>' +
      '</div></div>' +
      '<div class="flex-1 min-h-0 flex flex-col gap-1" id="financial-charts-container" style="min-height: 420px;">' +
      '<div class="relative min-h-0" id="financial-main-chart-wrapper" style="flex: 1; min-height: 320px;">' +
      '<canvas id="main-chart"></canvas>' +
      '</div>' +
      '<div class="relative shrink-0" id="financial-volume-chart-wrapper" style="height: 80px; min-height: 60px;">' +
      '<canvas id="volume-chart"></canvas>' +
      '</div></div></div>';

    if (financialChartInstance) { financialChartInstance.destroy(); financialChartInstance = null; }
    if (financialVolumeChartInstance) { financialVolumeChartInstance.destroy(); financialVolumeChartInstance = null; }

    var mainCtx = document.getElementById('main-chart');
    var volCtx = document.getElementById('volume-chart');
    if (!mainCtx || !volCtx || typeof Chart === 'undefined') return;

    var contentEl = content;
    var commonScaleOptions = {
      grid: { color: GRID_COLOR },
      ticks: { color: FONT_COLOR, font: { family: 'system-ui, sans-serif', size: 11 }, maxTicksLimit: 10 },
    };
    var xCommon = {
      grid: { display: false, color: GRID_COLOR },
      ticks: { color: FONT_COLOR, font: { family: 'system-ui, sans-serif', size: 11 }, maxTicksLimit: 12 },
    };

    function tooltipBodyCallback(context) {
      var idx = context.tooltip && context.tooltip.dataPoints && context.tooltip.dataPoints[0] ? context.tooltip.dataPoints[0].dataIndex : -1;
      if (idx < 0 || !historical[idx]) return [];
      var r = historical[idx];
      return [
        'Date: ' + (r.date || ''),
        'Open: ' + (r.open != null ? Number(r.open).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'),
        'High: ' + (r.high != null ? Number(r.high).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'),
        'Low: ' + (r.low != null ? Number(r.low).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'),
        'Close: ' + (r.close != null ? Number(r.close).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'),
        'Volume: ' + (r.volume != null ? Number(r.volume).toLocaleString() : '—'),
      ];
    }

    function buildCharts() {
      if (financialChartInstance) { financialChartInstance.destroy(); financialChartInstance = null; }
      if (financialVolumeChartInstance) { financialVolumeChartInstance.destroy(); financialVolumeChartInstance = null; }

      var optsMain = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        layout: { padding: { top: 8, right: 8, bottom: 4, left: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: FONT_COLOR,
            bodyColor: FONT_COLOR,
            borderColor: GRID_COLOR,
            borderWidth: 1,
            callbacks: { afterBody: tooltipBodyCallback },
          },
          tooltipHideDelay: {},
        },
        scales: {
          x: xCommon,
          y: { ...commonScaleOptions, position: 'right', ticks: { ...commonScaleOptions.ticks, callback: function (v) { return typeof v === 'number' ? v.toLocaleString() : v; } } },
        },
      };

      if (financialChartType === 'candlestick' && hasOHLC) {
        var wickData = historical.map(function (d) { return [d.low, d.high]; });
        var bodyData = historical.map(function (d) { return [Math.min(d.open, d.close), Math.max(d.open, d.close)]; });
        var bodyColors = historical.map(function (d) { return d.close >= d.open ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'; });
        financialChartInstance = new Chart(mainCtx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Wick', data: wickData, order: 2, barThickness: 1, maxBarThickness: 1, backgroundColor: 'rgba(148, 163, 184, 0.7)', borderColor: 'rgba(148, 163, 184, 0.8)', borderWidth: 1 },
              { label: 'Body', data: bodyData, order: 1, barThickness: 2, maxBarThickness: 4, backgroundColor: bodyColors, borderColor: bodyColors, borderWidth: 1 },
            ],
          },
          options: optsMain,
        });
      } else {
        var values = historical.map(function (d) { return d.close; });
        financialChartInstance = new Chart(mainCtx.getContext('2d'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Close',
              data: values,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              fill: true,
              tension: 0.2,
              pointRadius: 0,
              pointHoverRadius: 4,
            }],
          },
          options: optsMain,
        });
      }

      var volData = historical.map(function (d) { return d.volume != null ? d.volume : 0; });
      var volColors = historical.map(function (d) { return (d.close >= (d.open != null ? d.open : d.close)) ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'; });
      financialVolumeChartInstance = new Chart(volCtx.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Volume', data: volData, backgroundColor: volColors, borderColor: volColors, borderWidth: 1 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          layout: { padding: { top: 4, right: 8, bottom: 8, left: 8 } },
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: { afterBody: function (items) { var i = items[0].dataIndex; var r = historical[i]; return r ? ['Volume: ' + (r.volume != null ? Number(r.volume).toLocaleString() : '—')] : []; } } }, tooltipHideDelay: {} },
          scales: {
            x: xCommon,
            y: { ...commonScaleOptions, position: 'right', ticks: { ...commonScaleOptions.ticks, callback: function (v) { return typeof v === 'number' && v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v); } } },
          },
        },
      });
    }

    function resizeCharts() {
      var mainWrap = document.getElementById('financial-main-chart-wrapper');
      var volWrap = document.getElementById('financial-volume-chart-wrapper');
      if (!mainWrap || !volWrap) return;
      var totalH = mainWrap.offsetHeight + volWrap.offsetHeight;
      if (totalH < 80) return; // 레이아웃 전 컨테이너 높이 0일 때 적용하지 않음
      var mainH = Math.round(totalH * 0.8);
      var volH = totalH - mainH;
      mainCtx.width = mainWrap.clientWidth;
      mainCtx.height = mainH;
      volCtx.width = volWrap.clientWidth;
      volCtx.height = volH;
      if (financialChartInstance) financialChartInstance.resize();
      if (financialVolumeChartInstance) financialVolumeChartInstance.resize();
    }

    function initChartAndListeners() {
      buildCharts();
      setTimeout(resizeCharts, 50);
      // 탭 전환(valuation/accounting → overview) 후 컨테이너 레이아웃이 늦게 잡힐 수 있으므로 지연 리사이즈 추가
      setTimeout(resizeCharts, 200);
      setTimeout(resizeCharts, 450);
      contentEl.querySelectorAll('.chart-period-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var p = btn.getAttribute('data-period');
          if (p === financialChartPeriod) return;
          financialChartPeriod = p;
          contentEl.querySelectorAll('.chart-period-btn').forEach(function (b) {
            var active = b.getAttribute('data-period') === financialChartPeriod;
            b.classList.toggle('bg-blue-600', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('text-slate-400', !active);
          });
          fetchAndRedrawOverview();
        });
      });
      contentEl.querySelectorAll('.chart-type-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var t = btn.getAttribute('data-chart-type');
          if (t === financialChartType) return;
          financialChartType = t;
          contentEl.querySelectorAll('.chart-type-btn').forEach(function (b) {
            var active = b.getAttribute('data-chart-type') === financialChartType;
            b.classList.toggle('bg-blue-600', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('text-slate-400', !active);
          });
          buildCharts();
          resizeCharts();
        });
      });
      window.addEventListener('resize', resizeCharts);
      var chartsContainer = document.getElementById('financial-charts-container');
      if (chartsContainer && typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(function () { resizeCharts(); });
        ro.observe(chartsContainer);
      }
      contentEl._financialChartResize = resizeCharts;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var mainChartEl = document.getElementById('main-chart');
        if (!mainChartEl || mainChartEl.closest('#tool-content') !== contentEl) return;
        initChartAndListeners();
      });
    });
  }

  function fetchAndRedrawOverview() {
    var t = (currentTicker || '').trim().toUpperCase();
    if (!t) return;
    showToolLoader();
    fetch('/api/tools/profile/' + t + '?period=' + encodeURIComponent(financialChartPeriod))
      .then(function (res) { return res.json(); })
      .then(function (json) {
        hideToolLoader();
        var hist = json.historical || [];
        if (!hist.length) {
          document.getElementById('tool-content').innerHTML = '<p class="text-slate-500 text-sm">No data for this period.</p>';
          return;
        }
        if (financialCache[t]) financialCache[t].overview = { profile: json.profile || {}, historical: hist };
        renderOverview(json.profile || {}, hist);
      })
      .catch(function () {
        hideToolLoader();
        document.getElementById('tool-content').innerHTML = '<p class="text-slate-500 text-sm">Failed to load.</p>';
      });
  }

  // -------------------------------------------------------------------------
  // 재무제표: 정통 회계 순서 (Top-to-Bottom, Capital IQ 스타일)
  // style: 'normal' | 'sub'(들여쓰기) | 'total'(굵게+상단선) | 'totalDouble'(굵게+이중상단선)
  // keys: FMP API 필드명. 복수 key면 순서대로 시도.
  // -------------------------------------------------------------------------
  var INCOME_STATEMENT_LAYOUT = [
    { keys: ['revenue'], label: 'Revenue (매출)', style: 'normal' },
    { keys: ['costOfRevenue', 'costOfGoodsSold'], label: 'Cost of Revenue (매출원가)', style: 'normal' },
    { keys: ['grossProfit'], label: 'Gross Profit (매출총이익)', style: 'total' },
    { keys: ['operatingExpenses'], label: 'Operating Expenses (영업비용)', style: 'normal' },
    { keys: ['sellingGeneralAndAdministrativeExpenses', 'sgAndA'], label: 'Selling, General & Administrative (판관비)', style: 'sub' },
    { keys: ['researchAndDevelopmentExpenses', 'researchAndDevelopment'], label: 'Research and Development (R&D)', style: 'sub' },
    { keys: ['operatingIncome'], label: 'Operating Income (영업이익)', style: 'total' },
    { keys: ['interestExpense'], label: 'Interest Expense (이자비용)', style: 'normal' },
    { keys: ['incomeBeforeTax'], label: 'Income Before Tax (세전이익)', style: 'normal' },
    { keys: ['incomeTaxExpense'], label: 'Income Tax Expense (법인세비용)', style: 'normal' },
    { keys: ['netIncome'], label: 'Net Income (당기순이익)', style: 'totalDouble' },
    { keys: ['eps', 'epsBasic'], label: 'EPS (주당순이익)', style: 'normal' },
    { keys: ['epsdiluted', 'epsDiluted'], label: 'EPS Diluted', style: 'normal' },
  ];

  var BALANCE_SHEET_LAYOUT = [
    { keys: ['cashAndCashEquivalents', 'cashAndEquivalents'], label: 'Cash and Cash Equivalents (현금성자산)', style: 'normal' },
    { keys: ['shortTermInvestments'], label: 'Short-term Investments (단기금융상품)', style: 'normal' },
    { keys: ['netReceivables', 'receivables'], label: 'Net Receivables (매출채권)', style: 'normal' },
    { keys: ['inventory'], label: 'Inventory (재고자산)', style: 'normal' },
    { keys: ['totalCurrentAssets', 'currentAssets'], label: 'Total Current Assets (유동자산)', style: 'total' },
    { keys: ['propertyPlantEquipmentNet', 'propertyPlantAndEquipmentNet'], label: 'Property, Plant & Equipment Net (유형자산)', style: 'normal' },
    { keys: ['goodwillAndIntangibleAssets', 'goodwill', 'intangibleAssets'], label: 'Goodwill & Intangible Assets (무형자산)', style: 'normal' },
    { keys: ['totalAssets'], label: 'Total Assets (총자산)', style: 'total' },
    { keys: ['accountPayables', 'payables'], label: 'Account Payables (매입채무)', style: 'normal' },
    { keys: ['shortTermDebt'], label: 'Short-term Debt (단기차입금)', style: 'normal' },
    { keys: ['totalCurrentLiabilities', 'currentLiabilities'], label: 'Total Current Liabilities (유동부채)', style: 'total' },
    { keys: ['longTermDebt'], label: 'Long-term Debt (장기차입금)', style: 'normal' },
    { keys: ['totalLiabilities', 'liabilities'], label: 'Total Liabilities (총부채)', style: 'total' },
    { keys: ['retainedEarnings'], label: 'Retained Earnings (이익잉여금)', style: 'normal' },
    { keys: ['totalStockholdersEquity', 'totalEquity', 'totalShareholdersEquity'], label: 'Total Stockholders Equity (총자본)', style: 'total' },
  ];

  var CASH_FLOW_LAYOUT = [
    { keys: ['netIncome'], label: 'Net Income (당기순이익)', style: 'normal' },
    { keys: ['depreciationAndAmortization'], label: 'Depreciation & Amortization (감가상각비)', style: 'normal' },
    { keys: ['changeInWorkingCapital'], label: 'Change in Working Capital (운영자본 변동)', style: 'normal' },
    { keys: ['otherNonCashItems'], label: 'Other Non-Cash Items (기타 비현금)', style: 'normal' },
    { keys: ['operatingCashFlow', 'netCashProvidedByOperatingActivities'], label: 'Operating Cash Flow (영업활동 현금흐름)', style: 'total' },
    { keys: ['capitalExpenditure'], label: 'Capital Expenditure (설비투자)', style: 'normal' },
    { keys: ['acquisitionsNet'], label: 'Acquisitions Net (인수 등)', style: 'normal' },
    { keys: ['purchasesOfInvestments'], label: 'Purchases of Investments (투자매입)', style: 'normal' },
    { keys: ['salesMaturitiesOfInvestments'], label: 'Sales/Maturities of Investments (투자매각)', style: 'normal' },
    { keys: ['investingCashFlow', 'netCashUsedForInvestingActivities'], label: 'Investing Cash Flow (투자활동 현금흐름)', style: 'total' },
    { keys: ['freeCashFlow'], label: 'Free Cash Flow (잉여현금흐름)', style: 'total' },
    { keys: ['dividendsPaid'], label: 'Dividends Paid (배당지급)', style: 'normal' },
    { keys: ['debtRepayment'], label: 'Debt Repayment (차입금 상환)', style: 'normal' },
    { keys: ['commonStockIssued'], label: 'Common Stock Issued (주식발행)', style: 'normal' },
    { keys: ['financingCashFlow', 'netCashUsedProvidedByFinancingActivities'], label: 'Financing Cash Flow (재무활동 현금흐름)', style: 'total' },
    { keys: ['cashAtEndOfPeriod'], label: 'Cash at End of Period (기말현금)', style: 'total' },
  ];

  function getStatementValue(stmt, keys) {
    if (!stmt || typeof stmt !== 'object') return null;
    var keyList = Array.isArray(keys) ? keys : [keys];
    for (var i = 0; i < keyList.length; i++) {
      var v = stmt[keyList[i]];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  function buildLedgerTableFromLayout(statements, layout, dates) {
    if (!layout.length) return '<p class="text-slate-500 text-sm">No data.</p>';
    var thead = '<thead class="border-b border-slate-700"><tr><th class="text-left py-2 pr-4 text-slate-400 font-medium">Account</th>';
    dates.forEach(function (d) {
      thead += '<th class="text-right py-2 px-2 text-slate-400 font-medium tabular-nums">' + escapeHtml(String(d)) + '</th>';
    });
    thead += '</tr></thead>';
    var tbody = '<tbody class="divide-y divide-slate-700/50">';
    layout.forEach(function (item) {
      var values = statements.map(function (s) { return getStatementValue(s, item.keys); });
      var tdLabelClass = 'py-1.5 pr-4 font-mono text-sm text-slate-300';
      var trClass = '';
      if (item.style === 'sub') {
        tdLabelClass += ' pl-6';
      } else if (item.style === 'total') {
        tdLabelClass += ' font-bold text-slate-200';
        trClass = ' border-t border-slate-700';
      } else if (item.style === 'totalDouble') {
        tdLabelClass += ' font-bold text-white';
        trClass = ' border-t-2 border-slate-600';
      }
      tbody += '<tr class="' + trClass + '"><td class="' + tdLabelClass + '">' + escapeHtml(item.label) + '</td>';
      values.forEach(function (v) {
        var display = (v === null || v === undefined || v === '') ? '—' : formatNum(v);
        var tdClass = 'text-right py-1.5 px-2 font-mono text-sm tabular-nums ';
        if (item.style === 'total' || item.style === 'totalDouble') tdClass += 'font-bold text-slate-200'; else tdClass += 'text-slate-200';
        tbody += '<td class="' + tdClass + '">' + display + '</td>';
      });
      tbody += '</tr>';
    });
    tbody += '</tbody>';
    return '<table class="w-full text-sm font-mono">' + thead + tbody + '</table>';
  }

  function buildLedgerTable(rows, dates) {
    if (!rows.length) return '<p class="text-slate-500 text-sm">No data.</p>';
    var thead = '<thead class="border-b border-slate-700"><tr><th class="text-left py-2 pr-4 text-slate-400 font-medium">Account</th>';
    dates.forEach(function (d) {
      thead += '<th class="text-right py-2 px-2 text-slate-400 font-medium tabular-nums">' + escapeHtml(String(d)) + '</th>';
    });
    thead += '</tr></thead>';
    var tbody = '<tbody class="divide-y divide-slate-700/50">';
    rows.forEach(function (r) {
      tbody += '<tr><td class="py-1.5 pr-4 text-slate-300 font-mono text-sm">' + escapeHtml(r.label) + '</td>';
      r.values.forEach(function (v) {
        tbody += '<td class="text-right py-1.5 px-2 font-mono text-sm text-slate-200 tabular-nums">' + (r.isPct ? (v != null && v !== '' ? Number(v).toFixed(2) + '%' : '—') : formatNum(v)) + '</td>';
      });
      tbody += '</tr>';
    });
    tbody += '</tbody>';
    return '<table class="w-full text-sm font-mono">' + thead + tbody + '</table>';
  }

  // Key Ratios: API key -> 한국어 라벨 (옆에 표시). FMP는 camelCase 반환.
  var KEY_RATIOS_KR = {
    currentRatio: '유동비율',
    quickRatio: '당좌비율',
    cashRatio: '현금비율',
    grossProfitMargin: '매출총이익률',
    operatingProfitMargin: '영업이익률',
    netProfitMargin: '순이익률',
    bottomLineProfitMargin: '순이익률',
    continuousOperationsProfitMargin: '영속영업순이익률',
    returnOnAssets: '총자산순이익률',
    returnOnEquity: '자기자본이익률',
    returnOnCapitalEmployed: '투하자본이익률',
    debtRatio: '부채비율',
    debtEquityRatio: '부채자본비율',
    debtToAssetsRatio: '부채/총자산',
    debtToCapitalRatio: '부채/자본',
    debtToMarketCap: '부채/시가총액',
    interestCoverage: '이자보상배율',
    interestCoverageRatio: '이자보상배율',
    debtServiceCoverageRatio: '부채상환보상배율',
    payoutRatio: '배당성향',
    dividendPayoutRatio: '배당성향',
    dividendYield: '배당수익률',
    dividendYieldPercentage: '배당수익률',
    dividendPerShare: '주당배당금',
    dividendPaidAndCapexCoverageRatio: '배당·설비투자보상배율',
    assetTurnover: '총자산회전율',
    inventoryTurnover: '재고회전율',
    receivablesTurnover: '매출채권회전율',
    payablesTurnover: '매입채무회전율',
    fixedAssetTurnover: '유형자산회전율',
    workingCapitalTurnoverRatio: '운영자본회전율',
    capitalExpenditureCoverageRatio: '설비투자보상배율',
    priceToBookRatio: '주가순자산비율(P/B)',
    priceToSalesRatio: '주가매출비율(P/S)',
    priceEarningsRatio: '주가수익비율(PER)',
    priceToFreeCashFlowsRatio: '주가FCF비율(P/FCF)',
    priceToFreeCashFlowRatio: '주가FCF비율(P/FCF)',
    priceCashFlowRatio: 'P/CF',
    priceToOperatingCashFlowRatio: '주가영업CF비율',
    priceEarningsToGrowthRatio: 'PEG',
    priceToEarningsGrowthRatio: 'PEG',
    forwardPriceToEarningsGrowthRatio: '선행PEG',
    priceToFairValue: '주가/적정가치',
    earningsYield: '이익수익률',
    freeCashFlowYield: 'FCF 수익률',
    bookValuePerShare: '주당순자산',
    freeCashFlowPerShare: '주당FCF',
    operatingCashFlowPerShare: '주당영업CF',
    capexPerShare: '주당설비투자',
    revenuePerShare: '주당매출',
    netIncomePerShare: '주당순이익',
    netIncomePerEBT: '세전이익대비순이익',
    cashPerShare: '주당현금',
    tangibleAssetValue: '유형자산가치',
    tangibleBookValuePerShare: '주당유형순자산',
    shareholdersEquityPerShare: '주당자기자본',
    interestDebtPerShare: '주당이자부채',
    evToSales: 'EV/매출',
    evToEbitda: 'EV/EBITDA',
    evToOperatingCashFlow: 'EV/영업CF',
    evToFreeCashFlow: 'EV/FCF',
    enterpriseValue: '기업가치',
    enterpriseValueMultiple: '기업가치배수',
    netDebtToEbitda: '순부채/EBITDA',
    ebitMargin: 'EBIT 이익률',
    ebitdaMargin: 'EBITDA 이익률',
    pretaxProfitMargin: '세전이익률',
    effectiveTaxRate: '실효세율',
    ebtPerEbit: 'EBT/EBIT',
    financialLeverageRatio: '재무레버리지',
    longTermDebtToCapitalRatio: '장기부채/자본',
    operatingCashFlowRatio: '영업현금흐름비율',
    operatingCashFlowSalesRatio: '영업CF/매출',
    operatingCashFlowCoverageRatio: '영업CF보상배율',
    shortTermOperatingCashFlowCoverageRatio: '단기영업CF보상배율',
    freeCashFlowOperatingCashFlowRatio: 'FCF/영업CF',
    solvencyRatio: '지급능력비율',
    fiscalYear: '회계연도',
  };

  function statementToRows(statements, excludeKeys) {
    excludeKeys = excludeKeys || ['date', 'symbol', 'reportedCurrency', 'calendarYear', 'period', 'fillingDate', 'acceptedDate', 'cik', 'link', 'finalLink'];
    var keys = [];
    var seen = {};
    statements.forEach(function (s) {
      Object.keys(s).forEach(function (k) {
        if (excludeKeys.indexOf(k) !== -1) return;
        if (!seen[k]) { seen[k] = true; keys.push(k); }
      });
    });
    var labels = keys.map(function (k) {
      return k.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); }).trim();
    });
    var dates = statements.map(function (s) { return s.date || s.calendarYear || ''; });
    var rows = keys.map(function (k, i) {
      return {
        key: k,
        label: labels[i],
        values: statements.map(function (s) { return s[k]; }),
        isPct: false,
      };
    });
    return { rows: rows, dates: dates };
  }

  function renderIncomeLedger(data) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!data || !data.length) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No income statement data.</p>';
      return;
    }
    var dates = data.map(function (s) { return s.date || s.calendarYear || ''; });
    content.innerHTML = buildLedgerTableFromLayout(data, INCOME_STATEMENT_LAYOUT, dates);
  }

  function renderBalanceLedger(data) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!data || !data.length) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No balance sheet data.</p>';
      return;
    }
    var dates = data.map(function (s) { return s.date || s.calendarYear || ''; });
    content.innerHTML = buildLedgerTableFromLayout(data, BALANCE_SHEET_LAYOUT, dates);
  }

  function renderCashFlowLedger(data) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!data || !data.length) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No cash flow statement data.</p>';
      return;
    }
    var dates = data.map(function (s) { return s.date || s.calendarYear || ''; });
    content.innerHTML = buildLedgerTableFromLayout(data, CASH_FLOW_LAYOUT, dates);
  }

  function renderRatiosTable(data) {
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (!data || !data.length) {
      content.innerHTML = '<p class="text-slate-500 text-sm">No ratios data.</p>';
      return;
    }
    var out = statementToRows(data);
    out.rows.forEach(function (r) {
      r.isPct = /ratio|percent|margin|return|yield/i.test(r.label) && !/multiple|price|turnover/i.test(r.label);
      if (KEY_RATIOS_KR[r.key]) {
        r.label = r.label + ' (' + KEY_RATIOS_KR[r.key] + ')';
      }
    });
    content.innerHTML = buildLedgerTable(out.rows, out.dates);
  }

  // -------------------------------------------------------------------------
  // Trend: 5-year comparison (Mock data, terminal aesthetic)
  // -------------------------------------------------------------------------
  var TREND_NEON = ['#00FF41', '#00FFFF', '#FF00FF', '#FFE600'];
  var trendChartInstance = null;
  var trendSelectedKeys = [];

  var TREND_MOCK = {
    years: ['2020', '2021', '2022', '2023', '2024'],
    data: {
      revenue: [45.2, 52.1, 58.3, 62.8, 68.4],
      grossMargin: [35.2, 37.1, 36.0, 38.5, 40.2],
      ebitda: [12.1, 14.2, 15.0, 16.8, 19.1],
      ebit: [10.0, 11.8, 12.5, 14.0, 16.0],
      netIncome: [7.8, 9.2, 9.8, 11.0, 12.5],
      cashAndEquivalents: [15.2, 18.1, 20.0, 22.5, 25.3],
      totalDebt: [25.0, 28.2, 30.1, 28.5, 26.8],
      netWorkingCapital: [5.1, 6.0, 6.8, 7.5, 8.2],
      totalEquity: [80.0, 90.2, 100.5, 110.2, 125.0],
      netPPE: [40.0, 44.5, 49.2, 51.8, 54.5],
      operatingCashFlow: [14.0, 16.2, 17.1, 19.0, 21.2],
      capex: [6.0, 7.2, 7.8, 8.0, 8.5],
      freeCashFlow: [8.0, 9.0, 9.3, 11.0, 12.7],
      dAndA: [4.0, 4.5, 5.0, 5.5, 6.0],
      stockBasedComp: [1.5, 1.8, 2.0, 2.3, 2.6],
      evToEbitda: [12.2, 14.0, 11.5, 15.2, 13.8],
      peRatio: [22.0, 25.2, 20.5, 28.0, 26.5],
      roic: [12.0, 13.5, 11.8, 14.8, 16.2],
      debtToEquity: [0.35, 0.38, 0.42, 0.38, 0.35],
      fcfMargin: [17.7, 17.3, 16.0, 17.5, 18.6],
    },
  };

  var TREND_GROUPS = [
    { group: 'Income Statement', metrics: [
      { key: 'revenue', label: 'Revenue (B)', unit: 'abs' },
      { key: 'grossMargin', label: 'Gross Margin (%)', unit: 'pct' },
      { key: 'ebitda', label: 'EBITDA (B)', unit: 'abs' },
      { key: 'ebit', label: 'EBIT (B)', unit: 'abs' },
      { key: 'netIncome', label: 'Net Income (B)', unit: 'abs' },
    ]},
    { group: 'Balance Sheet', metrics: [
      { key: 'cashAndEquivalents', label: 'Cash & Equivalents (B)', unit: 'abs' },
      { key: 'totalDebt', label: 'Total Debt (B)', unit: 'abs' },
      { key: 'netWorkingCapital', label: 'Net Working Capital (B)', unit: 'abs' },
      { key: 'totalEquity', label: 'Total Equity (B)', unit: 'abs' },
      { key: 'netPPE', label: 'Net PP&E (B)', unit: 'abs' },
    ]},
    { group: 'Cash Flow Statement', metrics: [
      { key: 'operatingCashFlow', label: 'Operating Cash Flow (B)', unit: 'abs' },
      { key: 'capex', label: 'CapEx (B)', unit: 'abs' },
      { key: 'freeCashFlow', label: 'Free Cash Flow (B)', unit: 'abs' },
      { key: 'dAndA', label: 'D&A (B)', unit: 'abs' },
      { key: 'stockBasedComp', label: 'Stock-Based Comp (B)', unit: 'abs' },
    ]},
    { group: 'Key Ratios', metrics: [
      { key: 'evToEbitda', label: 'EV / EBITDA', unit: 'ratio' },
      { key: 'peRatio', label: 'P/E Ratio', unit: 'ratio' },
      { key: 'roic', label: 'ROIC (%)', unit: 'pct' },
      { key: 'debtToEquity', label: 'Debt / Equity', unit: 'ratio' },
      { key: 'fcfMargin', label: 'FCF Margin (%)', unit: 'pct' },
    ]},
  ];

  function trendGetUnit(key) {
    for (var g = 0; g < TREND_GROUPS.length; g++) {
      for (var m = 0; m < TREND_GROUPS[g].metrics.length; m++) {
        if (TREND_GROUPS[g].metrics[m].key === key) return TREND_GROUPS[g].metrics[m].unit;
      }
    }
    return 'abs';
  }

  function trendGetLabel(key) {
    for (var g = 0; g < TREND_GROUPS.length; g++) {
      for (var m = 0; m < TREND_GROUPS[g].metrics.length; m++) {
        if (TREND_GROUPS[g].metrics[m].key === key) return TREND_GROUPS[g].metrics[m].label;
      }
    }
    return key;
  }

  function trendCagr(values) {
    if (!values || values.length < 2) return null;
    var v0 = values[0];
    var vN = values[values.length - 1];
    if (!v0 || v0 === 0) return null;
    var n = values.length - 1;
    return (Math.pow(vN / v0, 1 / n) - 1) * 100;
  }

  function trendYoy(values) {
    if (!values || values.length < 2) return null;
    var prev = values[values.length - 2];
    var curr = values[values.length - 1];
    if (prev == null || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  function renderTrendView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    var selected = trendSelectedKeys.slice();
    var years = TREND_MOCK.years;
    var data = TREND_MOCK.data;

    var selectorHtml = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';
    selectorHtml += '<div class="mb-4 border border-slate-700 p-3 trend-selector">';
    selectorHtml += '<div class="text-xs text-slate-500 mb-3 uppercase tracking-wider">Metric Selector (max 4)</div>';
    selectorHtml += '<div class="grid grid-cols-4 gap-x-6 gap-y-3" style="grid-template-columns: repeat(4, minmax(0, 1fr));">';
    TREND_GROUPS.forEach(function (g) {
      selectorHtml += '<div class="flex flex-col gap-1.5">';
      selectorHtml += '<span class="text-slate-500 text-xs font-medium">' + escapeHtml(g.group) + '</span>';
      g.metrics.forEach(function (m) {
        var checked = selected.indexOf(m.key) !== -1;
        selectorHtml += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="trend-metric-cb border border-slate-600 bg-slate-900 text-cyan-400" data-key="' + escapeHtml(m.key) + '"' + (checked ? ' checked' : '') + '><span class="text-slate-300 text-sm">' + escapeHtml(m.label) + '</span></label>';
      });
      selectorHtml += '</div>';
    });
    selectorHtml += '</div></div>';

    selectorHtml += '<div class="mb-4 border border-slate-700 p-3" style="height:280px;"><canvas id="trend-chart-canvas"></canvas></div>';

    var tableRows = selected;
    var chartKeys = selected;
    selectorHtml += '<div class="overflow-x-auto border border-slate-700 trend-table">';
    selectorHtml += '<table class="w-full text-left border-collapse">';
    selectorHtml += '<thead><tr class="border-b border-slate-700">';
    selectorHtml += '<th class="py-2 pr-4 text-slate-500 font-medium">Metric</th>';
    years.forEach(function (y) { selectorHtml += '<th class="py-2 pr-4 text-right text-slate-500 font-medium">' + escapeHtml(y) + '</th>'; });
    selectorHtml += '<th class="py-2 pr-4 text-right text-slate-500 font-medium">YoY %</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">5Y CAGR</th></tr></thead><tbody>';
    if (tableRows.length === 0) {
      selectorHtml += '<tr class="border-b border-slate-700/50"><td colspan="' + (years.length + 3) + '" class="py-4 pr-4 text-center text-slate-500 font-mono text-sm">Select up to 4 metrics above to view chart and table.</td></tr>';
    }
    tableRows.forEach(function (key) {
      var vals = data[key] || [];
      var yoy = trendYoy(vals);
      var cagr = trendCagr(vals);
      var label = trendGetLabel(key);
      selectorHtml += '<tr class="border-b border-slate-700/50">';
      selectorHtml += '<td class="py-1.5 pr-4 text-slate-300">' + escapeHtml(label) + '</td>';
      vals.forEach(function (v) {
        var disp = '—';
        if (v != null) {
          var u = trendGetUnit(key);
          if (u === 'pct') disp = v.toFixed(2) + '%';
          else if (u === 'ratio') disp = v.toFixed(2);
          else disp = v.toFixed(2) + 'B';
        }
        selectorHtml += '<td class="py-1.5 pr-4 text-right text-slate-200 font-mono">' + escapeHtml(disp) + '</td>';
      });
      var yoyClass = yoy != null ? (yoy >= 0 ? 'trend-positive' : 'trend-negative') : '';
      var yoyStr = yoy != null ? (yoy >= 0 ? '+' : '') + yoy.toFixed(2) + '%' : '—';
      selectorHtml += '<td class="py-1.5 pr-4 text-right font-mono ' + yoyClass + '">' + escapeHtml(yoyStr) + '</td>';
      var cagrClass = cagr != null ? (cagr >= 0 ? 'trend-positive' : 'trend-negative') : '';
      var cagrStr = cagr != null ? (cagr >= 0 ? '+' : '') + cagr.toFixed(2) + '%' : '—';
      selectorHtml += '<td class="py-1.5 pr-4 text-right font-mono ' + cagrClass + '">' + escapeHtml(cagrStr) + '</td></tr>';
    });
    selectorHtml += '</tbody></table></div>';

    content.innerHTML = selectorHtml;
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';

    content.querySelectorAll('.trend-metric-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-key');
        var idx = trendSelectedKeys.indexOf(key);
        if (cb.checked) {
          if (trendSelectedKeys.length >= 4) { cb.checked = false; return; }
          if (idx === -1) trendSelectedKeys.push(key);
        } else {
          if (idx !== -1) trendSelectedKeys.splice(idx, 1);
        }
        renderTrendView();
      });
    });

    if (typeof Chart !== 'undefined' && chartKeys.length) {
      var ctx = document.getElementById('trend-chart-canvas');
      if (ctx) {
        if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
        var hasAbs = chartKeys.some(function (k) { return trendGetUnit(k) === 'abs'; });
        var leftKeys = chartKeys.filter(function (k) { return trendGetUnit(k) === 'abs'; });
        var rightKeys = chartKeys.filter(function (k) { var u = trendGetUnit(k); return u === 'pct' || u === 'ratio'; });
        var useDualAxis = leftKeys.length > 0 && rightKeys.length > 0;
        var datasets = [];
        leftKeys.forEach(function (key, i) {
          datasets.push({
            label: trendGetLabel(key),
            data: data[key] || [],
            borderColor: TREND_NEON[i % TREND_NEON.length],
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            tension: 0,
            fill: false,
            yAxisID: 'y',
            pointRadius: 2,
          });
        });
        rightKeys.forEach(function (key, i) {
          datasets.push({
            label: trendGetLabel(key),
            data: data[key] || [],
            borderColor: TREND_NEON[(leftKeys.length + i) % TREND_NEON.length],
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            tension: 0,
            fill: false,
            yAxisID: useDualAxis ? 'y1' : 'y',
            pointRadius: 2,
          });
        });
        var chartKeyOrder = leftKeys.concat(rightKeys);
        trendChartInstance = new Chart(ctx.getContext('2d'), {
          type: 'line',
          data: { labels: years, datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: true, labels: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' } },
              tooltip: {
                cornerRadius: 0,
                titleFont: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 },
                bodyFont: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 },
                backgroundColor: 'rgba(0,0,0,0.9)',
                titleColor: '#00FF41',
                bodyColor: '#e2e8f0',
                borderColor: '#00FF41',
                borderWidth: 1,
                padding: 8,
                displayColors: true,
                callbacks: {
                  label: function (item) {
                    var key = chartKeyOrder[item.datasetIndex];
                    var u = (key && trendGetUnit(key)) || 'abs';
                    var v = item.raw;
                    if (u === 'pct') return item.dataset.label + ': ' + (v != null ? v.toFixed(2) + '%' : '—');
                    if (u === 'ratio') return item.dataset.label + ': ' + (v != null ? v.toFixed(2) : '—');
                    return item.dataset.label + ': ' + (v != null ? v.toFixed(2) + 'B' : '—');
                  },
                },
              },
            },
            scales: (function () {
              var s = {
                x: {
                  grid: { color: '#2A2A2A', drawBorder: true, borderDash: [3, 3] },
                  ticks: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888', maxRotation: 0 },
                },
                y: {
                  type: 'linear',
                  position: 'left',
                  grid: { color: '#2A2A2A', drawBorder: true, borderDash: [3, 3] },
                  ticks: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
                },
              };
              if (useDualAxis) {
                s.y1 = {
                  type: 'linear',
                  position: 'right',
                  grid: { drawOnChartArea: false },
                  ticks: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
                };
              }
              return s;
            })(),
          },
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // COMPS (Comparable Analysis): Peer selector, scatter chart, comps table
  // -------------------------------------------------------------------------
  var compScatterInstance = null;
  var COMPS_NEON = ['#00FF41', '#00FFFF', '#FF00FF', '#00FF41', '#00FFFF'];
  var COMPS_TARGET_COLOR = '#FFE600';
  var COMPS_MOCK = {
    peers: ['MSFT', 'GOOGL', 'META', 'AMZN'],
    data: [
      { ticker: 'AAPL', marketCap: 2800, ev: 2900, ltmRevenue: 383.3, ltmEbitda: 129.9, grossMargin: 43.9, evToEbitda: 22.3, peRatio: 29.0, pbRatio: 45.2, roe: 147.0, roic: 54.8, revenueCagr5y: 8.5 },
      { ticker: 'MSFT', marketCap: 2100, ev: 2120, ltmRevenue: 211.9, ltmEbitda: 102.5, grossMargin: 69.0, evToEbitda: 20.7, peRatio: 35.2, pbRatio: 12.1, roe: 42.1, roic: 28.5, revenueCagr5y: 12.2 },
      { ticker: 'GOOGL', marketCap: 1850, ev: 1780, ltmRevenue: 307.4, ltmEbitda: 95.2, grossMargin: 57.2, evToEbitda: 18.7, peRatio: 26.5, pbRatio: 6.8, roe: 29.8, roic: 22.1, revenueCagr5y: 18.1 },
      { ticker: 'META', marketCap: 1200, ev: 1180, ltmRevenue: 134.9, ltmEbitda: 61.2, grossMargin: 81.2, evToEbitda: 19.3, peRatio: 24.8, pbRatio: 5.2, roe: 34.5, roic: 26.0, revenueCagr5y: 22.5 },
      { ticker: 'AMZN', marketCap: 1850, ev: 1950, ltmRevenue: 574.8, ltmEbitda: 89.1, grossMargin: 47.4, evToEbitda: 21.9, peRatio: 78.5, pbRatio: 8.9, roe: 12.2, roic: 10.5, revenueCagr5y: 14.0 },
    ],
  };
  var compPeerTickers = [];
  var compLastTarget = '';
  var compSelectedTickers = [];
  var lastCompsDataByTicker = {};

  function compGetCompany(ticker) {
    return COMPS_MOCK.data.find(function (r) { return r.ticker === ticker; });
  }

  function compMean(arr) {
    if (!arr || !arr.length) return null;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }
  function compMedian(arr) {
    if (!arr || !arr.length) return null;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  async function renderCompsView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    var inputEl = document.getElementById('ticker-input');
    var target = (currentTicker || (inputEl && inputEl.value) || '').trim().toUpperCase();
    if (!target) return;

    var dataByTicker = {};
    var rawPeers = compPeerTickers.filter(function (p) { return (p || '').trim().toUpperCase() !== target; });
    var allTickers = [target].concat(rawPeers);
    var selected = compSelectedTickers.length ? compSelectedTickers.slice() : [target].concat(rawPeers.slice(0, 4));

    function renderCompsShell(loadingMsg) {
      var html = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';
      html += '<div class="mb-4 border border-slate-700 p-3" style="border-radius:0;">';
      html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider">Peer Group <span class="normal-case font-normal">(선택한 피어 + EV 기준 가까운 순)</span></div>';
      html += '<div class="flex flex-wrap gap-2">';
      allTickers.forEach(function (t) {
        var isTarget = t === target;
        var isSel = selected.indexOf(t) !== -1;
        var chipBg = isTarget ? 'rgba(255,230,0,0.15)' : (isSel ? 'rgba(0,255,65,0.12)' : 'rgba(71,85,105,0.3)');
        var chipBorder = isTarget ? '#FFE600' : (isSel ? '#00FF41' : '#475569');
        html += '<div class="comps-chip flex items-center gap-1.5 px-2.5 py-1 border font-mono text-sm" style="border-radius:0;border-color:' + chipBorder + ';background:' + chipBg + ';">';
        html += '<label class="flex items-center gap-1.5 cursor-pointer">';
        html += '<input type="checkbox" class="comps-peer-cb border border-slate-600 bg-slate-900" data-ticker="' + escapeHtml(t) + '"' + (isSel ? ' checked' : '') + '>';
        html += '<span class="' + (isTarget ? 'text-amber-300 font-semibold' : '') + '">' + escapeHtml(t) + '</span></label>';
        if (!isTarget) html += '<button type="button" class="comps-peer-remove text-slate-500 hover:text-rose-400 ml-0.5" data-ticker="' + escapeHtml(t) + '" aria-label="Remove">×</button>';
        html += '</div>';
      });
      html += '</div></div>';
      html += '<div class="mb-4 border border-slate-700 p-3 flex items-center justify-center text-slate-500 font-mono text-sm" style="height:320px;border-radius:0;" id="comps-chart-area"><span>' + (loadingMsg || '') + '</span></div>';
      var colLabels = ['Ticker', 'Market Cap (B)', 'EV (B)', 'LTM Revenue (B)', 'LTM EBITDA (B)', 'Gross Margin %', 'EV/EBITDA', 'P/E', 'P/B', 'ROE %'];
      html += '<div class="overflow-x-auto border border-slate-700 trend-table" style="border-radius:0;">';
      html += '<table class="w-full border-collapse" style="font-family:inherit;"><thead><tr class="border-b border-slate-700">';
      html += '<th class="py-2 pr-4 text-left text-slate-500 font-medium">' + escapeHtml(colLabels[0]) + '</th>';
      for (var c = 1; c < colLabels.length; c++) html += '<th class="py-2 pr-4 text-right text-slate-500 font-medium">' + escapeHtml(colLabels[c]) + '</th>';
      html += '</tr></thead><tbody id="comps-tbody">';
      if (loadingMsg) {
        html += '<tr class="border-b border-slate-700/50"><td colspan="10" class="py-4 text-center text-slate-500 font-mono text-sm">' + escapeHtml(loadingMsg) + '</td></tr>';
      }
      html += '</tbody></table></div></div>';
      content.innerHTML = html;
      content.classList.add('bkig-trend');
      content.style.background = '#0A0E17';
    }

    renderCompsShell('Loading comps…');
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';

    try {
      var peersRes = await fetch('/api/tools/peers/' + encodeURIComponent(target));
      var peersJson = await peersRes.json().catch(function () { return {}; });
      var apiPeers = Array.isArray(peersJson.peers) ? peersJson.peers : [];
      if (target !== compLastTarget) {
        compPeerTickers = apiPeers.slice(0, 4);
      }
      rawPeers = compPeerTickers.filter(function (p) { return (p || '').trim().toUpperCase() !== target; });
      allTickers = [target].concat(rawPeers);
      var tickersToFetch = [target].concat(rawPeers).slice(0, 5);
      var compsRes = await fetch('/api/tools/comps-data?tickers=' + encodeURIComponent(tickersToFetch.join(',')));
      var compsJson = await compsRes.json().catch(function () { return {}; });
      var compsList = Array.isArray(compsJson.data) ? compsJson.data : [];
      compsList.forEach(function (row) {
        if (row && row.ticker) dataByTicker[row.ticker] = row;
      });
      COMPS_MOCK.data.forEach(function (row) { if (!dataByTicker[row.ticker]) dataByTicker[row.ticker] = row; });
    } catch (e) {
      var tbody = document.getElementById('comps-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="py-4 text-center text-slate-500">Failed to load comps.</td></tr>';
      return;
    }

    [target].concat(rawPeers).forEach(function (t) {
      if (!dataByTicker[t]) {
        dataByTicker[t] = { ticker: t, marketCap: null, ev: null, ltmRevenue: null, ltmEbitda: null, grossMargin: null, evToEbitda: null, peRatio: null, pbRatio: null, roe: null, roic: null, revenueCagr5y: null };
      }
    });
    lastCompsDataByTicker = dataByTicker;
    var targetEv = dataByTicker[target].ev != null ? dataByTicker[target].ev : 0;
    var peersWithEv = rawPeers.filter(function (p) { var d = dataByTicker[p]; return d && d.ev != null && !isNaN(d.ev); });
    peersWithEv.sort(function (a, b) {
      var diffA = Math.abs((dataByTicker[a].ev || 0) - targetEv);
      var diffB = Math.abs((dataByTicker[b].ev || 0) - targetEv);
      return diffA - diffB;
    });
    var peersNoEv = rawPeers.filter(function (p) { return peersWithEv.indexOf(p) === -1; });
    var peersOrdered = peersWithEv.concat(peersNoEv);
    var allTickers = [target].concat(peersOrdered).slice(0, 5);
    if (target !== compLastTarget) {
      compLastTarget = target;
      compSelectedTickers = [target].concat(peersOrdered).slice(0, 5);
    }
    var selected = compSelectedTickers.slice();

    var html = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';

    html += '<div class="mb-4 border border-slate-700 p-3" style="border-radius:0;">';
    html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider">Peer Group <span class="normal-case font-normal">(선택한 피어 + EV 기준 가까운 순)</span></div>';
    html += '<div class="flex flex-wrap gap-2">';
    allTickers.forEach(function (t) {
      var isTarget = t === target;
      var isSelected = selected.indexOf(t) !== -1;
      var chipBg = isTarget ? 'rgba(255,230,0,0.15)' : (isSelected ? 'rgba(0,255,65,0.12)' : 'rgba(71,85,105,0.3)');
      var chipBorder = isTarget ? '#FFE600' : (isSelected ? '#00FF41' : '#475569');
      html += '<div class="comps-chip flex items-center gap-1.5 px-2.5 py-1 border font-mono text-sm" style="border-radius:0;border-color:' + chipBorder + ';background:' + chipBg + ';">';
      html += '<label class="flex items-center gap-1.5 cursor-pointer">';
      html += '<input type="checkbox" class="comps-peer-cb border border-slate-600 bg-slate-900" data-ticker="' + escapeHtml(t) + '"' + (isSelected ? ' checked' : '') + '>';
      html += '<span class="' + (isTarget ? 'text-amber-300 font-semibold' : '') + '">' + escapeHtml(t) + '</span></label>';
      if (!isTarget) {
        html += '<button type="button" class="comps-peer-remove text-slate-500 hover:text-rose-400 ml-0.5" data-ticker="' + escapeHtml(t) + '" aria-label="Remove">×</button>';
      }
      html += '</div>';
    });
    html += '</div></div>';

    html += '<div class="mb-4 border border-slate-700 p-3" style="height:320px;border-radius:0;"><canvas id="comps-scatter-canvas"></canvas></div>';

    var colLabels = ['Ticker', 'Market Cap (B)', 'EV (B)', 'LTM Revenue (B)', 'LTM EBITDA (B)', 'Gross Margin %', 'EV/EBITDA', 'P/E', 'P/B', 'ROE %'];
    html += '<div class="overflow-x-auto border border-slate-700 trend-table" style="border-radius:0;">';
    html += '<table class="w-full border-collapse" style="font-family:inherit;">';
    html += '<thead><tr class="border-b border-slate-700">';
    html += '<th class="py-2 pr-4 text-left text-slate-500 font-medium">' + escapeHtml(colLabels[0]) + '</th>';
    for (var c = 1; c < colLabels.length; c++) {
      html += '<th class="py-2 pr-4 text-right text-slate-500 font-medium">' + escapeHtml(colLabels[c]) + '</th>';
    }
    html += '</tr></thead><tbody>';

    selected.forEach(function (ticker) {
      var row = dataByTicker[ticker];
      if (!row) return;
      var isTargetRow = ticker === target;
      var rowClass = isTargetRow ? 'bg-white/[0.05]' : '';
      html += '<tr class="border-b border-slate-700/50 ' + rowClass + '">';
      html += '<td class="py-1.5 pr-4 font-mono ' + (isTargetRow ? 'text-amber-300 font-semibold' : 'text-slate-300') + '">' + escapeHtml(ticker) + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.marketCap != null ? row.marketCap.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.ev != null ? row.ev.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.ltmRevenue != null ? row.ltmRevenue.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.ltmEbitda != null ? row.ltmEbitda.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.grossMargin != null ? row.grossMargin.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.evToEbitda != null ? row.evToEbitda.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.peRatio != null ? row.peRatio.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.pbRatio != null ? row.pbRatio.toFixed(1) : '—') + '</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-200">' + (row.roe != null ? row.roe.toFixed(1) : '—') + '</td>';
      html += '</tr>';
    });

    var peersOnly = selected.filter(function (t) { return t !== target; });
    function numList(key) {
      return peersOnly.map(function (t) { return dataByTicker[t] && dataByTicker[t][key]; }).filter(function (v) { return v != null && !isNaN(v); });
    }
    if (peersOnly.length > 0) {
      var meanRow = { marketCap: compMean(numList('marketCap')), ev: compMean(numList('ev')), ltmRevenue: compMean(numList('ltmRevenue')), ltmEbitda: compMean(numList('ltmEbitda')), grossMargin: compMean(numList('grossMargin')), evToEbitda: compMean(numList('evToEbitda')), peRatio: compMean(numList('peRatio')), pbRatio: compMean(numList('pbRatio')), roe: compMean(numList('roe')) };
      var medRow = { marketCap: compMedian(numList('marketCap')), ev: compMedian(numList('ev')), ltmRevenue: compMedian(numList('ltmRevenue')), ltmEbitda: compMedian(numList('ltmEbitda')), grossMargin: compMedian(numList('grossMargin')), evToEbitda: compMedian(numList('evToEbitda')), peRatio: compMedian(numList('peRatio')), pbRatio: compMedian(numList('pbRatio')), roe: compMedian(numList('roe')) };
      function fmt(v) { return v != null ? v.toFixed(1) : '—'; }
      html += '<tr class="border-b border-slate-700 bg-slate-800/40"><td class="py-1.5 pr-4 font-mono text-slate-400 font-semibold">Mean (ex. target)</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.marketCap) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.ev) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.ltmRevenue) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.ltmEbitda) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.grossMargin) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.evToEbitda) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.peRatio) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.pbRatio) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(meanRow.roe) + '</td></tr>';
      html += '<tr class="border-b border-slate-700 bg-slate-800/40"><td class="py-1.5 pr-4 font-mono text-slate-400 font-semibold">Median (ex. target)</td>';
      html += '<td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.marketCap) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.ev) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.ltmRevenue) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.ltmEbitda) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.grossMargin) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.evToEbitda) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.peRatio) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.pbRatio) + '</td><td class="py-1.5 pr-4 text-right font-mono text-slate-300">' + fmt(medRow.roe) + '</td></tr>';
    }
    html += '</tbody></table></div></div>';

    content.innerHTML = html;
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';

    content.querySelectorAll('.comps-peer-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var t = cb.getAttribute('data-ticker');
        var idx = compSelectedTickers.indexOf(t);
        if (cb.checked) { if (idx === -1) compSelectedTickers.push(t); } else { if (idx !== -1) compSelectedTickers.splice(idx, 1); }
        renderCompsView();
      });
    });
    content.querySelectorAll('.comps-peer-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-ticker');
        var idx = compSelectedTickers.indexOf(t);
        if (idx !== -1) { compSelectedTickers.splice(idx, 1); renderCompsView(); }
      });
    });

    if (typeof Chart !== 'undefined' && selected.length > 0) {
      var ctx = document.getElementById('comps-scatter-canvas');
      if (ctx) {
        if (compScatterInstance) { compScatterInstance.destroy(); compScatterInstance = null; }
        var xKey = 'roe';
        var yKey = 'evToEbitda';
        var xLabel = 'ROE (%)';
        var yLabel = 'EV / EBITDA';
        var datasets = selected.map(function (ticker, i) {
          var row = dataByTicker[ticker];
          if (!row || row[xKey] == null || row[yKey] == null) return null;
          var isTarget = ticker === target;
          return {
            label: ticker,
            data: [{ x: row[xKey], y: row[yKey] }],
            backgroundColor: isTarget ? COMPS_TARGET_COLOR : COMPS_NEON[i % COMPS_NEON.length],
            borderColor: isTarget ? COMPS_TARGET_COLOR : COMPS_NEON[i % COMPS_NEON.length],
            borderWidth: 1,
            pointRadius: isTarget ? 12 : 6,
            pointHoverRadius: isTarget ? 14 : 8,
          };
        }).filter(Boolean);
        compScatterInstance = new Chart(ctx.getContext('2d'), {
          type: 'scatter',
          data: { datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' } },
              tooltip: {
                cornerRadius: 0,
                titleFont: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 },
                bodyFont: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 },
                backgroundColor: 'rgba(0,0,0,0.95)',
                titleColor: '#FFE600',
                bodyColor: '#e2e8f0',
                borderColor: '#00FF41',
                borderWidth: 1,
                padding: 8,
                callbacks: {
                  title: function (items) {
                    return items[0] && items[0].raw ? items[0].dataset.label : '';
                  },
                  label: function (ctx) {
                    var x = ctx.raw && ctx.raw.x != null ? ctx.raw.x.toFixed(2) : '—';
                    var y = ctx.raw && ctx.raw.y != null ? ctx.raw.y.toFixed(2) : '—';
                    return xLabel + ': ' + x + '  |  ' + yLabel + ': ' + y;
                  },
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: xLabel, font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
                grid: { color: '#2A2A2A', drawBorder: true, borderDash: [3, 3] },
                ticks: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
              },
              y: {
                title: { display: true, text: yLabel, font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
                grid: { color: '#2A2A2A', drawBorder: true, borderDash: [3, 3] },
                ticks: { font: { family: "'JetBrains Mono','Fira Code','Courier New',monospace", size: 11 }, color: '#888888' },
              },
            },
          },
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // OWNERSHIP: Institutional ownership + Insider transactions (FMP-shaped mock)
  // -------------------------------------------------------------------------
  var OWNERSHIP_MOCK_AAPL = {
    institutionalHoldingsPct: 61.4,
    insiderTransactions: [
      { date: '2025-02-15', insiderName: 'Tim Cook', title: 'CEO', transactionType: 'SELL', shares: 50000, price: 188.25, value: 9412500 },
      { date: '2025-02-10', insiderName: 'Luca Maestri', title: 'CFO', transactionType: 'SELL', shares: 12000, price: 186.50, value: 2238000 },
      { date: '2025-01-28', insiderName: 'James Wilson', title: 'Director', transactionType: 'BUY', shares: 2000, price: 192.00, value: 384000 },
      { date: '2025-01-20', insiderName: 'Susan Carter', title: 'Director', transactionType: 'BUY', shares: 1500, price: 189.75, value: 284625 },
      { date: '2025-01-05', insiderName: 'Tim Cook', title: 'CEO', transactionType: 'SELL', shares: 35000, price: 185.20, value: 6482000 },
    ],
  };

  function getOwnershipMockForTicker(ticker) {
    if ((ticker || '').toUpperCase() === 'AAPL') {
      return OWNERSHIP_MOCK_AAPL;
    }
    var pctByTicker = { WMT: 58.2, MSFT: 72.1, GOOGL: 68.5, META: 65.0, AMZN: 59.3 };
    var pct = pctByTicker[ticker] != null ? pctByTicker[ticker] : 55.0;
    return {
      institutionalHoldingsPct: pct,
      insiderTransactions: [
        { date: '2025-02-14', insiderName: '—', title: 'CEO', transactionType: 'SELL', shares: 15000, price: 82.50, value: 1237500 },
        { date: '2025-02-08', insiderName: '—', title: 'CFO', transactionType: 'SELL', shares: 5000, price: 81.20, value: 406000 },
        { date: '2025-01-25', insiderName: '—', title: 'Director', transactionType: 'BUY', shares: 1000, price: 79.00, value: 79000 },
        { date: '2025-01-18', insiderName: '—', title: 'Director', transactionType: 'BUY', shares: 800, price: 78.50, value: 62800 },
        { date: '2025-01-05', insiderName: '—', title: 'Officer', transactionType: 'SELL', shares: 10000, price: 80.10, value: 801000 },
      ],
    };
  }

  function renderOwnershipWithData(content, ticker, data) {
    var pct = data.institutionalHoldingsPct != null ? Number(data.institutionalHoldingsPct) : 0;
    var html = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';
    html += '<div class="mb-4 border border-slate-700 p-3" style="border-radius:0;">';
    html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider">Institutional &amp; Fund Ownership <span class="normal-case font-semibold" style="color:#00FF41;">' + escapeHtml(ticker) + '</span></div>';
    html += '<p class="font-mono text-sm mb-2" style="color:#00FF41;">Institutional Holdings: ' + pct.toFixed(1) + '%</p>';
    html += '<div class="w-full h-2 border border-slate-600 bg-slate-900 relative overflow-hidden" style="border-radius:0;"><div class="absolute left-0 top-0 bottom-0" style="width:' + Math.min(100, Math.max(0, pct)) + '%; background:#00FF41;"></div></div>';
    html += '</div>';
    html += '<div class="border border-slate-700 overflow-x-auto" style="border-radius:0;">';
    html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider px-3 pt-3">Insider Transactions</div>';
    html += '<table class="w-full border-collapse" style="font-family:inherit;">';
    html += '<thead><tr class="border-b border-slate-700"><th class="py-2 pr-4 text-left text-slate-500 font-medium">Date</th><th class="py-2 pr-4 text-left text-slate-500 font-medium">Insider Name</th><th class="py-2 pr-4 text-left text-slate-500 font-medium">Title</th><th class="py-2 pr-4 text-left text-slate-500 font-medium">Transaction Type</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">Shares</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">Price</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">Value ($)</th></tr></thead><tbody>';
    (data.insiderTransactions || []).forEach(function (row) {
      var typeClass = (row.transactionType || '').toUpperCase() === 'BUY' ? 'text-green-500' : 'text-red-500';
      var typeText = (row.transactionType || '').toUpperCase();
      var valueStr = row.value != null ? Number(row.value).toLocaleString() : '—';
      var priceStr = row.price != null ? Number(row.price).toFixed(2) : '—';
      html += '<tr class="border-b border-slate-700/50"><td class="py-1.5 pr-4 text-slate-300 font-mono text-sm">' + escapeHtml(row.date || '—') + '</td><td class="py-1.5 pr-4 text-slate-300 font-mono text-sm">' + escapeHtml(row.insiderName || '—') + '</td><td class="py-1.5 pr-4 text-slate-400 font-mono text-sm">' + escapeHtml(row.title || '—') + '</td><td class="py-1.5 pr-4 font-mono text-sm ' + typeClass + '">' + escapeHtml(typeText) + '</td><td class="py-1.5 pr-4 text-right text-slate-200 font-mono text-sm">' + (row.shares != null ? row.shares.toLocaleString() : '—') + '</td><td class="py-1.5 pr-4 text-right text-slate-200 font-mono text-sm">' + escapeHtml(priceStr) + '</td><td class="py-1.5 pr-4 text-right text-slate-200 font-mono text-sm">' + escapeHtml(valueStr) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    content.innerHTML = html;
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';
  }

  async function renderOwnershipView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    var inputEl = document.getElementById('ticker-input');
    var ticker = ((currentTicker || (inputEl && inputEl.value) || '').trim().toUpperCase());
    if (!ticker) return;
    content.innerHTML = '<p class="text-slate-500 font-mono text-sm">Loading ownership data…</p>';
    try {
      var res = await fetch('/api/tools/ownership/' + encodeURIComponent(ticker));
      var json = await res.json().catch(function () { return {}; });
      var useApi = res.ok && (json.hasOwnProperty('institutionalHoldingsPct') || json.hasOwnProperty('insiderTransactions'));
      var data = useApi ? { institutionalHoldingsPct: json.institutionalHoldingsPct != null ? json.institutionalHoldingsPct : 0, insiderTransactions: Array.isArray(json.insiderTransactions) ? json.insiderTransactions : [] } : getOwnershipMockForTicker(ticker);
      lastOwnershipData = { ticker: ticker, data: data };
      renderOwnershipWithData(content, ticker, data);
    } catch (e) {
      var fallback = getOwnershipMockForTicker(ticker);
      lastOwnershipData = { ticker: ticker, data: fallback };
      renderOwnershipWithData(content, ticker, fallback);
    }
  }

  // -------------------------------------------------------------------------
  // ESTIMATES: Price target consensus + Earnings/Revenue estimates (FMP-shaped mock)
  // -------------------------------------------------------------------------
  var ESTIMATES_MOCK = {
    currentPrice: 188.50,
    priceTarget: { high: 225, low: 165, average: 205, consensus: 210 },
    earningsEstimates: [
      { period: 'FY25 Q1', estimatedEps: 1.52, estimatedRevenue: 94.2 },
      { period: 'FY25 Q2', estimatedEps: 1.38, estimatedRevenue: 82.5 },
      { period: 'FY25 Q3', estimatedEps: 1.65, estimatedRevenue: 98.1 },
      { period: 'FY25 Q4', estimatedEps: 2.12, estimatedRevenue: 112.4 },
    ],
  };

  function estimatesPeriodLabel(period) {
    if (!period || period === '—') return '—';
    var s = String(period);
    var m = s.match(/^(\d{4})-(\d{2})/);
    if (m) return m[1] + ' Q' + Math.ceil(parseInt(m[2], 10) / 3);
    return s;
  }

  var estimatesChartInstance = null;

  function renderEstimatesWithData(content, ticker, data) {
    var current = data.currentPrice != null ? Number(data.currentPrice) : 0;
    var pt = data.priceTarget || {};
    var low = pt.low != null ? Number(pt.low) : (current ? current * 0.8 : 0);
    var high = pt.high != null ? Number(pt.high) : (current ? current * 1.3 : 100);
    var range = high - low || 1;
    var pct = current ? ((current - low) / range) * 100 : 50;
    var avg = pt.average != null ? Number(pt.average).toFixed(2) : '—';
    var consensus = pt.consensus != null ? Number(pt.consensus).toFixed(2) : '—';
    var html = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';
    html += '<div class="mb-4 border border-slate-700 p-3" style="border-radius:0;">';
    html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider">Price Target Consensus <span class="normal-case font-semibold" style="color:#FFE600;">' + escapeHtml(ticker) + '</span></div>';
    html += '<p class="text-slate-400 font-mono text-xs mb-2">Low ' + low.toFixed(0) + ' — High ' + high.toFixed(0) + ' &nbsp;|&nbsp; Average: ' + avg + ' &nbsp;|&nbsp; Consensus: ' + consensus + '</p>';
    html += '<div class="w-full h-4 border border-slate-600 bg-slate-900 relative" style="border-radius:0;">';
    html += '<div class="absolute inset-0"><div class="h-full bg-slate-700 w-full" style="border-radius:0;"></div></div>';
    html += '<div class="absolute top-0 bottom-0 w-1 bg-[#FFE600] z-10" style="left:' + Math.min(100, Math.max(0, pct)) + '%; margin-left:-2px; border-radius:0;" title="Current: $' + (current ? current.toFixed(2) : '—') + '"></div>';
    html += '<span class="absolute top-1/2 -translate-y-1/2 left-2 font-mono text-xs text-slate-500 z-10">' + low.toFixed(0) + '</span>';
    html += '<span class="absolute top-1/2 -translate-y-1/2 right-2 font-mono text-xs text-slate-500 z-10">' + high.toFixed(0) + '</span>';
    html += '</div>';
    html += '<p class="mt-1 font-mono text-xs font-semibold" style="color:#FFE600;">Current: $' + (current ? current.toFixed(2) : '—') + '</p></div>';
    html += '<div class="mb-4 border border-slate-700 p-3 relative" style="height:240px;border-radius:0;"><canvas id="estimates-chart-canvas"></canvas><div id="estimates-chart-placeholder" class="hidden absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm">No EPS/Revenue data to chart</div></div>';
    html += '<div class="border border-slate-700 overflow-x-auto" style="border-radius:0;">';
    html += '<div class="text-xs text-slate-500 mb-2 uppercase tracking-wider px-3 pt-3">Earnings &amp; Revenue Estimates (Next 4 Quarters)</div>';
    html += '<table class="w-full border-collapse" style="font-family:inherit;">';
    html += '<thead><tr class="border-b border-slate-700"><th class="py-2 pr-4 text-left text-slate-500 font-medium">Period</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">Estimated EPS</th><th class="py-2 pr-4 text-right text-slate-500 font-medium">Estimated Revenue (B)</th></tr></thead><tbody>';
    var estimates = data.earningsEstimates || [];
    estimates.forEach(function (row) {
      var periodLabel = estimatesPeriodLabel(row.period || '—');
      var eps = row.estimatedEps != null ? Number(row.estimatedEps).toFixed(2) : '—';
      var rev = row.estimatedRevenue != null ? Number(row.estimatedRevenue).toFixed(2) : '—';
      html += '<tr class="border-b border-slate-700/50"><td class="py-1.5 pr-4 text-slate-300 font-mono text-sm">' + escapeHtml(periodLabel) + '</td><td class="py-1.5 pr-4 text-right text-slate-200 font-mono text-sm">' + escapeHtml(eps) + '</td><td class="py-1.5 pr-4 text-right text-slate-200 font-mono text-sm">' + escapeHtml(rev) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    content.innerHTML = html;
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';

    var hasEps = estimates.some(function (r) { return r.estimatedEps != null && !isNaN(Number(r.estimatedEps)); });
    var hasRev = estimates.some(function (r) { return r.estimatedRevenue != null && !isNaN(Number(r.estimatedRevenue)); });
    var placeholder = content.querySelector('#estimates-chart-placeholder');
    if (placeholder) placeholder.classList.toggle('hidden', !!(hasEps || hasRev) && estimates.length > 0);
    if (typeof Chart !== 'undefined' && estimates.length > 0 && (hasEps || hasRev)) {
      var labels = estimates.map(function (r) { return estimatesPeriodLabel(r.period || ''); });
      var epsData = estimates.map(function (r) { return r.estimatedEps != null ? Number(r.estimatedEps) : null; });
      var revData = estimates.map(function (r) {
        var v = r.estimatedRevenue != null ? Number(r.estimatedRevenue) : null;
        return v != null && v !== 0 ? (v >= 1 ? v : v * 1000) : null;
      });
      var ctx = document.getElementById('estimates-chart-canvas');
      if (ctx) {
        if (estimatesChartInstance) { estimatesChartInstance.destroy(); estimatesChartInstance = null; }
        var datasets = [];
        if (hasEps) datasets.push({ label: 'EPS', data: epsData, backgroundColor: 'rgba(0,255,65,0.6)', borderColor: '#00FF41', borderWidth: 1 });
        if (hasRev) datasets.push({ label: 'Revenue (B)', data: revData, backgroundColor: 'rgba(0,255,255,0.5)', borderColor: '#00FFFF', borderWidth: 1 });
        if (datasets.length) {
          estimatesChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { font: { family: "'JetBrains Mono','Fira Code',monospace", size: 11 }, color: '#94a3b8' } },
              },
              scales: {
                x: { grid: { color: '#334155' }, ticks: { font: { family: "'JetBrains Mono',monospace", size: 10 }, color: '#94a3b8', maxRotation: 45 } },
                y: { grid: { color: '#334155' }, ticks: { font: { family: "'JetBrains Mono',monospace", size: 10 }, color: '#94a3b8' } },
              },
            },
          });
        }
      }
    }
  }

  async function renderEstimatesView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    var inputEl = document.getElementById('ticker-input');
    var ticker = ((currentTicker || (inputEl && inputEl.value) || '').trim().toUpperCase());
    if (!ticker) return;
    content.innerHTML = '<p class="text-slate-500 font-mono text-sm">Loading estimates…</p>';
    try {
      var res = await fetch('/api/tools/estimates/' + encodeURIComponent(ticker));
      var json = await res.json().catch(function () { return {}; });
      var useApi = res.ok && (json.hasOwnProperty('currentPrice') || json.hasOwnProperty('priceTarget') || json.hasOwnProperty('earningsEstimates'));
      var data = useApi ? { currentPrice: json.currentPrice, priceTarget: json.priceTarget || {}, earningsEstimates: Array.isArray(json.earningsEstimates) ? json.earningsEstimates : [] } : ESTIMATES_MOCK;
      if (data.priceTarget && json.priceTarget && json.priceTarget.currentPrice != null) data.currentPrice = data.currentPrice != null ? data.currentPrice : json.priceTarget.currentPrice;
      lastEstimatesData = { ticker: ticker, data: data };
      renderEstimatesWithData(content, ticker, data);
    } catch (e) {
      lastEstimatesData = { ticker: ticker, data: ESTIMATES_MOCK };
      renderEstimatesWithData(content, ticker, ESTIMATES_MOCK);
    }
  }

  // -------------------------------------------------------------------------
  // NEWS: Stock news feed (FMP-shaped mock)
  // -------------------------------------------------------------------------
  var NEWS_MOCK = [
    { publishedDate: '2025-02-20 09:35', source: 'Reuters', title: 'Apple supplier Foxconn sees strong Q1 demand for AI servers' },
    { publishedDate: '2025-02-20 08:15', source: 'Bloomberg', title: 'iPhone 16 Pro demand exceeds expectations in Asia' },
    { publishedDate: '2025-02-19 16:00', source: 'CNBC', title: 'Apple stock hits record high on services growth' },
    { publishedDate: '2025-02-19 14:22', source: 'Reuters', title: 'EU narrows Apple App Store antitrust probe' },
    { publishedDate: '2025-02-19 11:00', source: 'Bloomberg', title: 'Apple in talks to add Google Gemini to iPhone' },
    { publishedDate: '2025-02-18 18:30', source: 'CNBC', title: 'Warren Buffett\'s Berkshire trims Apple stake again' },
  ];

  function getNewsMockForTicker(ticker) {
    return NEWS_MOCK.map(function (item) {
      var t = (item.title || '').replace(/Apple/gi, ticker);
      return { publishedDate: item.publishedDate, source: item.source, title: t, url: item.url };
    });
  }

  function renderNewsWithData(content, ticker, items) {
    var html = '<div class="bkig-trend trend-mono text-slate-300" style="background:#0A0E17;">';
    html += '<div class="text-xs text-slate-500 mb-3 uppercase tracking-wider">Stock News Feed <span class="normal-case font-semibold" style="color:#00FFFF;">' + escapeHtml(ticker) + '</span></div>';
    html += '<ul class="border border-slate-700 divide-y divide-slate-700" style="border-radius:0;">';
    (items || []).forEach(function (item) {
      var dateTime = (item.publishedDate || '').replace('T', ' ').substring(0, 16);
      var source = item.source || '—';
      var title = item.title || item.headline || '—';
      var url = item.url || '#';
      html += '<li class="news-feed-item px-3 py-2 font-mono text-sm cursor-pointer hover:bg-white/10 transition-colors" style="border-radius:0;" data-url="' + escapeHtml(url) + '">';
      html += '<span style="color:#888888;">' + escapeHtml(dateTime) + '</span> <span class="mx-2">|</span> <span style="color:#00FFFF;">' + escapeHtml(source) + '</span> <span class="mx-2">|</span> <span class="text-slate-200">' + escapeHtml(title) + '</span>';
      html += '</li>';
    });
    html += '</ul></div>';
    content.innerHTML = html;
    content.classList.add('bkig-trend');
    content.style.background = '#0A0E17';
    content.querySelectorAll('.news-feed-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var u = el.getAttribute('data-url');
        if (u && u !== '#') window.open(u, '_blank');
      });
    });
  }

  async function renderNewsView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    var inputEl = document.getElementById('ticker-input');
    var ticker = ((currentTicker || (inputEl && inputEl.value) || '').trim().toUpperCase());
    if (!ticker) return;
    content.innerHTML = '<p class="text-slate-500 font-mono text-sm">Loading news…</p>';
    try {
      var res = await fetch('/api/tools/news/' + encodeURIComponent(ticker));
      var json = await res.json().catch(function () { return {}; });
      var items = (json.news && json.news.length > 0) ? json.news : getNewsMockForTicker(ticker);
      renderNewsWithData(content, ticker, items);
    } catch (e) {
      renderNewsWithData(content, ticker, getNewsMockForTicker(ticker));
    }
  }

  // -------------------------------------------------------------------------
  // FACCTing Portal (Valuation / Accounting) — URL constants (edit here)
  // -------------------------------------------------------------------------
  var FACCTING_BASE = 'https://faccting.com';
  var FACCTING_URLS = {
    comps: FACCTING_BASE + '/comps/',
    dcf: FACCTING_BASE + '/dcf/',
    ddm: FACCTING_BASE + '/ddm/',
    capm: FACCTING_BASE + '/capm',
    blackScholes: FACCTING_BASE + '/black/',
    emh: FACCTING_BASE + '/emh/',
    stock: FACCTING_BASE + '/stock/',
    bollinger: FACCTING_BASE + '/bollinger/',
    psar: FACCTING_BASE + '/psar/',
    fibonacci: FACCTING_BASE + '/fibo/',
    workingCapital: FACCTING_BASE + '/working_capital/',
    financialRatio: FACCTING_BASE + '/financial_ratio/',
    depreciation: FACCTING_BASE + '/depreciation/',
    dupont: FACCTING_BASE + '/dupont/',
    leaseAccounting: FACCTING_BASE + '/lease/',
    korCorporate: FACCTING_BASE + '/k_acct/',
    usCorporate: FACCTING_BASE + '/us_acct/'
  };

  function facctingPortalCard(title, desc, url) {
    var u = (url && FACCTING_URLS[url]) ? FACCTING_URLS[url] : (url || FACCTING_BASE);
    return '<div class="faccting-portal-card">' +
      '<div class="faccting-portal-card-title">' + escapeHtml(title) + '</div>' +
      '<div class="faccting-portal-card-desc">// ' + escapeHtml(desc) + '</div>' +
      '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener noreferrer" class="faccting-portal-launch">[ LAUNCH ]</a>' +
      '</div>';
  }

  function renderValuationAnalysisView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    content.className = 'faccting-portal';
    var promptPath = '/modules/valuation_analysis';
    var html = '<div class="faccting-portal-prompt">user@faccting:~$ cd ' + escapeHtml(promptPath) + ' &nbsp; <span class="faccting-portal-status">[STATUS: SYSTEM READY]</span></div>';
    html += '<div class="p-4 border border-slate-800 border-t-0" style="border-radius:0; background:#0a0e17;">';
    html += '<div class="faccting-portal-section-title">Valuation Modules</div>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    html += facctingPortalCard('DCF Model (Discounted Cash Flow)', 'Intrinsic value estimation', 'dcf');
    html += facctingPortalCard('DDM (Dividend Discount Model)', 'Equity valuation based on future dividends', 'ddm');
    html += facctingPortalCard('CAPM (Capital Asset Pricing Model)', 'Expected return calculation', 'capm');
    html += facctingPortalCard('Black-Scholes Model', 'Options pricing and valuation', 'blackScholes');
    html += facctingPortalCard('EMH Analysis (Efficient Market Hypothesis)', 'Market efficiency testing', 'emh');
    html += '</div>';
    html += '<div class="faccting-portal-section-title">Technical Analysis Modules</div>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    html += facctingPortalCard('Bollinger Bands Analysis', 'Volatility and price channels', 'bollinger');
    html += facctingPortalCard('PSAR Analysis (Parabolic SAR)', 'Trend direction and reversals', 'psar');
    html += facctingPortalCard('Fibonacci Retracement', 'Support and resistance levels', 'fibonacci');
    html += '</div></div>';
    content.innerHTML = html;
  }

  function renderAccountingAnalysisView() {
    var content = document.getElementById('tool-content');
    if (!content) return;
    content.className = 'faccting-portal';
    var promptPath = '/modules/accounting_analysis';
    var html = '<div class="faccting-portal-prompt">user@faccting:~$ cd ' + escapeHtml(promptPath) + ' &nbsp; <span class="faccting-portal-status">[STATUS: SYSTEM READY]</span></div>';
    html += '<div class="p-4 border border-slate-800 border-t-0" style="border-radius:0; background:#0a0e17;">';
    html += '<div class="faccting-portal-section-title">Theoretical Analysis</div>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    html += facctingPortalCard('Working Capital Analysis', 'Liquidity and short-term health', 'workingCapital');
    html += facctingPortalCard('Financial Ratio Analysis', 'Core profitability and solvency metrics', 'financialRatio');
    html += facctingPortalCard('Depreciation Analysis', 'CapEx and asset lifecycle impacts', 'depreciation');
    html += facctingPortalCard('DuPont Analysis', 'ROE breakdown and driver identification', 'dupont');
    html += '</div>';
    html += '<div class="faccting-portal-section-title">Practical Data Sets</div>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    html += facctingPortalCard('US Corporate Accounting Data', 'Execute practical modeling', 'usCorporate');
    html += facctingPortalCard('KOR Corporate Accounting Data', 'Execute practical modeling', 'korCorporate');
    html += facctingPortalCard('Lease Accounting Practice', 'ASC 842 / IFRS 16 application', 'leaseAccounting');
    html += '</div></div>';
    content.innerHTML = html;
  }

  function getTabEndpoint(tab) {
    var t = (currentTicker || '').trim().toUpperCase();
    if (!t) return null;
    if (tab === 'overview' || tab === 'chart') return '/api/tools/profile/' + t;
    if (tab === 'income') return '/api/tools/income-statement/' + t;
    if (tab === 'balance') return '/api/tools/balance-sheet/' + t;
    if (tab === 'cashflow') return '/api/tools/cash-flow/' + t;
    if (tab === 'ratios') return '/api/tools/ratios/' + t;
    return null;
  }

  function ensureCached(tab) {
    var t = (currentTicker || '').trim().toUpperCase();
    if (!t) return Promise.resolve(null);
    if (!financialCache[t]) financialCache[t] = {};
    if (financialCache[t][tab]) return Promise.resolve(financialCache[t][tab]);
    if (tab === 'chart' && financialCache[t].overview) return Promise.resolve(financialCache[t].overview);
    var url = getTabEndpoint(tab);
    if (!url) return Promise.resolve(null);
    showToolLoader();
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (json) {
        hideToolLoader();
        if (tab === 'overview' || tab === 'chart') {
          financialCache[t].overview = { profile: json.profile || {}, historical: json.historical || [] };
          return financialCache[t].overview;
        }
        var list = json.data || [];
        financialCache[t][tab] = list;
        return list;
      })
      .catch(function () {
        hideToolLoader();
        return null;
      });
  }

  var currentFinancialTab = '';
  var EXCEL_TABS = ['overview', 'chart', 'income', 'balance', 'cashflow', 'ratios', 'trend', 'comps', 'ownership', 'estimates'];
  var lastOwnershipData = null;
  var lastEstimatesData = null;

  function loadAndRenderTab(tab) {
    currentFinancialTab = tab || '';
    if (tab && FINANCIAL_USAGE_ACTIONS.indexOf(tab) !== -1) recordFinancialToolUsage(tab);
    var excelBar = document.getElementById('tool-excel-bar');
    if (excelBar) excelBar.classList.toggle('hidden', EXCEL_TABS.indexOf(tab) === -1);

    setActiveFinancialTab(tab);
    var content = document.getElementById('tool-content');
    if (!content) return;
    if (tab === 'valuation-analysis') {
      renderValuationAnalysisView();
      return;
    }
    if (tab === 'accounting-analysis') {
      renderAccountingAnalysisView();
      return;
    }
    if (tab === 'trend') {
      renderTrendView();
      return;
    }
    if (tab === 'comps' || tab === 'ownership' || tab === 'estimates' || tab === 'news') {
      var tickerInput = document.getElementById('ticker-input');
      var tickerForTab = (currentTicker || (tickerInput && tickerInput.value) || '').trim().toUpperCase();
      if (!tickerForTab) {
        content.innerHTML = '<p class="text-slate-500 text-sm">Enter a ticker and click Search first.</p>';
        return;
      }
      if (tab === 'comps') { renderCompsView(); return; }
      if (tab === 'ownership') { renderOwnershipView(); return; }
      if (tab === 'estimates') { renderEstimatesView(); return; }
      if (tab === 'news') { renderNewsView(); return; }
    }
    if (!currentTicker.trim()) {
      content.innerHTML = '<p class="text-slate-500 text-sm">Enter a ticker and click Search first.</p>';
      return;
    }
    if (tab === 'overview') {
      ensureCached('overview').then(function (cached) {
        if (cached && cached.profile) {
          renderOverviewPanel(cached.profile);
        } else {
          content.innerHTML = '<p class="text-slate-500 text-sm">Failed to load data.</p>';
        }
      });
      return;
    }
    if (tab === 'chart') {
      ensureCached('chart').then(function (cached) {
        if (cached && cached.historical && cached.historical.length) {
          renderOverview(cached.profile || {}, cached.historical);
          var contentEl = document.getElementById('tool-content');
          if (contentEl && contentEl._financialChartResize) {
            setTimeout(function () { contentEl._financialChartResize(); }, 100);
            setTimeout(function () { contentEl._financialChartResize(); }, 500);
          }
        } else {
          content.innerHTML = '<p class="text-slate-500 text-sm">No historical price data. Enter a ticker and Search first.</p>';
        }
      });
      return;
    }
    ensureCached(tab).then(function (data) {
      if (tab === 'income') renderIncomeLedger(data);
      else if (tab === 'balance') renderBalanceLedger(data);
      else if (tab === 'cashflow') renderCashFlowLedger(data);
      else if (tab === 'ratios') renderRatiosTable(data);
      else if (!data) content.innerHTML = '<p class="text-slate-500 text-sm">Failed to load data.</p>';
    });
  }

  function switchToFinancialTools(ticker) {
    var t = (ticker || '').trim().toUpperCase();
    if (!t) return;
    var input = document.getElementById('ticker-input');
    if (input) input.value = t;
    showView('view-financial-tools');
    if (typeof onTickerSearch === 'function') onTickerSearch();
  }

  function showSearchLimitModal(message) {
    var modal = document.getElementById('financial-search-limit-modal');
    var msgEl = document.getElementById('financial-search-limit-modal-message');
    if (msgEl && message) msgEl.textContent = message;
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function hideSearchLimitModal() {
    var modal = document.getElementById('financial-search-limit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
  window.showSearchLimitModal = showSearchLimitModal;
  window.hideSearchLimitModal = hideSearchLimitModal;

  function onTickerSearch() {
    var input = document.getElementById('ticker-input');
    var ticker = (input && input.value) ? input.value.trim().toUpperCase() : '';
    if (!ticker) {
      alert('Enter a ticker symbol.');
      return;
    }
    currentTicker = ticker;
    if (!financialCache[currentTicker]) financialCache[currentTicker] = {};
    fetch('/api/terminal/usage/can-search', { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.allowed === false) {
          showSearchLimitModal(data.message || 'Maximum 5 searches per day. For additional data, please visit FACCTing.com');
          return;
        }
        showToolLoader();
        currentFinancialTab = 'overview';
        var excelBar = document.getElementById('tool-excel-bar');
        if (excelBar) excelBar.classList.remove('hidden');
        setActiveFinancialTab('overview');
        fetch('/api/tools/profile/' + ticker)
          .then(function (res) { return res.json(); })
          .then(function (json) {
            hideToolLoader();
            var profile = json.profile || {};
            var historical = json.historical || [];
            financialCache[currentTicker].overview = { profile: profile, historical: historical };
            renderSummary(profile);
            renderOverviewPanel(profile);
            recordFinancialToolUsage('search');
          })
          .catch(function () {
            hideToolLoader();
            renderSummary(null);
            document.getElementById('tool-content').innerHTML = '<p class="text-slate-500 text-sm">Failed to load. Check ticker or API.</p>';
          });
      })
      .catch(function () {
        showToolLoader();
        currentFinancialTab = 'overview';
        var excelBar = document.getElementById('tool-excel-bar');
        if (excelBar) excelBar.classList.remove('hidden');
        setActiveFinancialTab('overview');
        fetch('/api/tools/profile/' + ticker)
          .then(function (res) { return res.json(); })
          .then(function (json) {
            hideToolLoader();
            var profile = json.profile || {};
            var historical = json.historical || [];
            financialCache[currentTicker].overview = { profile: profile, historical: historical };
            renderSummary(profile);
            renderOverviewPanel(profile);
            recordFinancialToolUsage('search');
          })
          .catch(function () {
            hideToolLoader();
            renderSummary(null);
            document.getElementById('tool-content').innerHTML = '<p class="text-slate-500 text-sm">Failed to load. Check ticker or API.</p>';
          });
      });
  }

  function exportFinancialToExcel() {
    if (typeof XLSX === 'undefined') { alert('Excel export library not loaded.'); return; }
    var tab = currentFinancialTab;
    var t = (currentTicker || '').trim().toUpperCase();
    var aoa = [];
    var sheetName = tab || 'Sheet1';
    var baseName = (t || 'export') + '_' + tab;

    function numFmt(x) {
      if (x == null || x === '' || x === undefined) return '—';
      var n = Number(x);
      if (isNaN(n)) return String(x);
      return n;
    }

    if (tab === 'chart' && financialChartHistorical && financialChartHistorical.length) {
      aoa = [['Date', 'Open', 'High', 'Low', 'Close', 'Volume']];
      financialChartHistorical.forEach(function (d) {
        aoa.push([
          d.date || '',
          d.open != null ? numFmt(d.open) : '',
          d.high != null ? numFmt(d.high) : '',
          d.low != null ? numFmt(d.low) : '',
          d.close != null ? numFmt(d.close) : '',
          d.volume != null ? numFmt(d.volume) : '',
        ]);
      });
    } else if (tab === 'overview' && t && financialCache[t] && financialCache[t].overview && financialCache[t].overview.profile) {
      var p = financialCache[t].overview.profile;
      aoa = [['Field', 'Value']];
      [['Company', p.companyName || p.company_name], ['Symbol', p.symbol], ['CEO', p.ceo || p.CEO], ['Price', p.price], ['Sector', p.sector], ['Industry', p.industry], ['Market Cap', p.mktCap || p.marketCap], ['Exchange', p.exchangeShortName || p.exchange], ['IPO Date', p.ipoDate], ['Beta', p.beta], ['Avg Volume', p.volAvg], ['52W Range', p.range], ['Employees', p.fullTimeEmployees]].forEach(function (pair) {
        aoa.push([pair[0], pair[1] != null && pair[1] !== '' ? pair[1] : '—']);
      });
    } else if ((tab === 'income' || tab === 'balance' || tab === 'cashflow') && t && financialCache[t] && financialCache[t][tab]) {
      var statements = financialCache[t][tab];
      var layout = tab === 'income' ? INCOME_STATEMENT_LAYOUT : (tab === 'balance' ? BALANCE_SHEET_LAYOUT : CASH_FLOW_LAYOUT);
      var dates = statements.map(function (s) { return s.date || s.calendarYear || ''; });
      aoa = [['Account'].concat(dates)];
      layout.forEach(function (item) {
        var row = [item.label];
        statements.forEach(function (s) { row.push(getStatementValue(s, item.keys) != null ? numFmt(getStatementValue(s, item.keys)) : '—'); });
        aoa.push(row);
      });
    } else if (tab === 'ratios' && t && financialCache[t] && financialCache[t].ratios) {
      var out = statementToRows(financialCache[t].ratios);
      aoa = [['Account'].concat(out.dates)];
      out.rows.forEach(function (r) {
        aoa.push([r.label].concat(r.values.map(function (v) { return v != null && v !== '' ? (r.isPct ? Number(v).toFixed(2) + '%' : numFmt(v)) : '—'; })));
      });
    } else if (tab === 'trend') {
      var years = TREND_MOCK.years;
      var data = TREND_MOCK.data;
      var keys = trendSelectedKeys.length ? trendSelectedKeys : Object.keys(data);
      aoa = [['Metric'].concat(years).concat(['YoY %', '5Y CAGR'])];
      keys.forEach(function (key) {
        var vals = data[key] || [];
        var yoy = trendYoy(vals);
        var cagr = trendCagr(vals);
        var label = trendGetLabel(key);
        var row = [label];
        vals.forEach(function (v) { row.push(v != null ? numFmt(v) : '—'); });
        row.push(yoy != null ? (yoy >= 0 ? '+' : '') + yoy.toFixed(2) + '%' : '—');
        row.push(cagr != null ? (cagr >= 0 ? '+' : '') + cagr.toFixed(2) + '%' : '—');
        aoa.push(row);
      });
    } else if (tab === 'comps') {
      var dataByTicker = Object.keys(lastCompsDataByTicker).length ? lastCompsDataByTicker : (function () { var o = {}; COMPS_MOCK.data.forEach(function (row) { o[row.ticker] = row; }); return o; })();
      var selected = compSelectedTickers.length ? compSelectedTickers : [currentTicker || 'AAPL'].concat(COMPS_MOCK.peers);
      aoa = [['Ticker', 'Market Cap (B)', 'EV (B)', 'LTM Revenue (B)', 'LTM EBITDA (B)', 'Gross Margin %', 'EV/EBITDA', 'P/E', 'P/B', 'ROE %']];
      selected.forEach(function (ticker) {
        var row = dataByTicker[ticker];
        if (!row) return;
        aoa.push([
          ticker,
          row.marketCap != null ? row.marketCap : '—',
          row.ev != null ? row.ev : '—',
          row.ltmRevenue != null ? row.ltmRevenue : '—',
          row.ltmEbitda != null ? row.ltmEbitda : '—',
          row.grossMargin != null ? row.grossMargin : '—',
          row.evToEbitda != null ? row.evToEbitda : '—',
          row.peRatio != null ? row.peRatio : '—',
          row.pbRatio != null ? row.pbRatio : '—',
          row.roe != null ? row.roe : '—',
        ]);
      });
    } else if (tab === 'ownership' && lastOwnershipData) {
      var od = lastOwnershipData.data;
      aoa = [['Institutional Holdings %'], [od.institutionalHoldingsPct != null ? od.institutionalHoldingsPct : '—']];
      aoa.push([]);
      aoa.push(['Date', 'Insider', 'Title', 'Type', 'Shares', 'Price', 'Value']);
      (od.insiderTransactions || []).forEach(function (tr) {
        aoa.push([
          tr.date || '—',
          tr.insiderName || tr.name || '—',
          tr.title || '—',
          tr.transactionType || '—',
          tr.shares != null ? tr.shares : '—',
          tr.price != null ? tr.price : '—',
          tr.value != null ? tr.value : '—',
        ]);
      });
    } else if (tab === 'estimates' && lastEstimatesData) {
      var ed = lastEstimatesData.data;
      aoa = [['Current Price', ed.currentPrice != null ? ed.currentPrice : '—'], ['Price Target Low', (ed.priceTarget && ed.priceTarget.low) != null ? ed.priceTarget.low : '—'], ['Price Target High', (ed.priceTarget && ed.priceTarget.high) != null ? ed.priceTarget.high : '—'], ['Price Target Avg', (ed.priceTarget && ed.priceTarget.average) != null ? ed.priceTarget.average : '—'], []];
      aoa.push(['Period', 'Estimated EPS', 'Estimated Revenue (B)']);
      (ed.earningsEstimates || []).forEach(function (row) {
        aoa.push([
          row.period || '—',
          row.estimatedEps != null ? row.estimatedEps : '—',
          row.estimatedRevenue != null ? row.estimatedRevenue : '—',
        ]);
      });
    }

    if (aoa.length === 0) {
      alert('No data to export for this tab. Load data first.');
      return;
    }
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, baseName + '.xlsx');
  }

  function initFinancialTools() {
    var searchBtn = document.getElementById('ticker-search-btn');
    var tickerInput = document.getElementById('ticker-input');
    if (searchBtn) searchBtn.addEventListener('click', onTickerSearch);
    if (tickerInput) {
      tickerInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); onTickerSearch(); }
      });
    }
    document.querySelectorAll('.financial-tool-nav').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-tab');
        if (tab) loadAndRenderTab(tab);
      });
    });
    var excelBtn = document.getElementById('tool-download-excel-btn');
    if (excelBtn) excelBtn.addEventListener('click', exportFinancialToExcel);
    var searchLimitClose = document.getElementById('financial-search-limit-modal-close');
    var searchLimitBackdrop = document.getElementById('financial-search-limit-modal-backdrop');
    if (searchLimitClose) searchLimitClose.addEventListener('click', hideSearchLimitModal);
    if (searchLimitBackdrop) searchLimitBackdrop.addEventListener('click', hideSearchLimitModal);
  }

  // -------------------------------------------------------------------------
  // DART 공시 (한국 공시/재무)
  // -------------------------------------------------------------------------
  var dartState = {
    corpCode: null,
    corpName: null,
    stockCode: null,
    fsDiv: 'CFS',
    activeTab: 'overview',
    financialsData: null,
    financialsSubTab: 'balance_sheet'
  };

  var dartSearchDebounceTimer = null;
  var dartSearchAbortController = null;
  var dartSearchInFlight = false;
  function initDartView() {
    var searchBtn = document.getElementById('dart-search-btn');
    var queryInput = document.getElementById('dart-query-input');
    var searchWrap = document.getElementById('dart-search-wrap');
    var dropdown = document.getElementById('dart-search-dropdown');
    if (searchBtn) searchBtn.addEventListener('click', dartSearch);
    if (queryInput) {
      queryInput.addEventListener('input', function () {
        if (dartSearchDebounceTimer) clearTimeout(dartSearchDebounceTimer);
        dartSearchDebounceTimer = setTimeout(dartSearch, 350);
      });
      queryInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); dartSearch(); }
        if (e.key === 'Escape') { dartCloseDropdown(); queryInput.blur(); }
      });
      queryInput.addEventListener('focus', function () {
        if (queryInput.value.trim()) dartSearch();
      });
    }
    document.addEventListener('click', function (e) {
      if (!searchWrap || !dropdown) return;
      if (e.target && e.target.id === 'dart-search-btn') return;
      if (!searchWrap.contains(e.target)) dartCloseDropdown();
    });
    document.querySelectorAll('.dart-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-dart-tab');
        if (!tab) return;
        dartState.activeTab = tab;
        document.querySelectorAll('.dart-tab').forEach(function (b) {
          b.classList.remove('bg-slate-700/80', 'text-white');
          b.classList.add('text-slate-400');
        });
        btn.classList.add('bg-slate-700/80', 'text-white');
        btn.classList.remove('text-slate-400');
        dartLoadTab(tab);
      });
    });
    var consolidatedBtn = document.getElementById('dart-fs-consolidated');
    var separateBtn = document.getElementById('dart-fs-separate');
    if (consolidatedBtn) {
      consolidatedBtn.addEventListener('click', function () {
        dartState.fsDiv = 'CFS';
        consolidatedBtn.classList.add('bg-cyan-600', 'text-white');
        consolidatedBtn.classList.remove('bg-slate-700/60', 'text-slate-400');
        if (separateBtn) { separateBtn.classList.remove('bg-cyan-600', 'text-white'); separateBtn.classList.add('bg-slate-700/60', 'text-slate-400'); }
        if (dartState.activeTab === 'financials') dartLoadTab('financials');
      });
    }
    if (separateBtn) {
      separateBtn.addEventListener('click', function () {
        dartState.fsDiv = 'OFS';
        separateBtn.classList.add('bg-cyan-600', 'text-white');
        separateBtn.classList.remove('bg-slate-700/60', 'text-slate-400');
        if (consolidatedBtn) { consolidatedBtn.classList.remove('bg-cyan-600', 'text-white'); consolidatedBtn.classList.add('bg-slate-700/60', 'text-slate-400'); }
        if (dartState.activeTab === 'financials') dartLoadTab('financials');
      });
    }
    var firstTab = document.querySelector('.dart-tab[data-dart-tab="overview"]');
    if (firstTab) {
      firstTab.classList.add('bg-slate-700/80', 'text-white');
      firstTab.classList.remove('text-slate-400');
    }
    var dartContent = document.getElementById('dart-content');
    if (dartContent) {
      dartContent.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.dart-fs-subtab-btn');
        if (!btn || btn.disabled) return;
        var t = btn.getAttribute('data-dart-fs-subtab');
        if (t && dartState.financialsData) {
          dartState.financialsSubTab = t;
          document.querySelectorAll('.dart-fs-subtab-btn').forEach(function (b) {
            b.classList.remove('active');
          });
          btn.classList.add('active');
          renderDartFinancialsTable(dartContent, dartState.financialsData, t);
        }
      });
    }
  }

  function dartCloseDropdown() {
    var dd = document.getElementById('dart-search-dropdown');
    var input = document.getElementById('dart-query-input');
    if (dd) { dd.classList.add('hidden'); dd.innerHTML = ''; dd.setAttribute('aria-expanded', 'false'); }
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function dartSelectCompany(item) {
    if (!item || !item.corp_code) return;
    dartState.corpCode = item.corp_code;
    dartState.corpName = item.corp_name || '';
    dartState.stockCode = item.stock_code || '';
    var input = document.getElementById('dart-query-input');
    if (input) input.value = item.corp_name || item.stock_code || '';
    dartCloseDropdown();
    var summaryEl = document.getElementById('dart-company-summary');
    summaryEl.innerHTML = '<span class="text-cyan-400 font-medium">' + (dartState.corpName || '') + '</span>' +
      (dartState.stockCode ? ' <span class="text-slate-500">(' + dartState.stockCode + ')</span>' : '') +
      ' <a href="/api/dart/export_excel?corp_code=' + encodeURIComponent(dartState.corpCode) + '&corp_name=' + encodeURIComponent(dartState.corpName) + '&fs_div=' + dartState.fsDiv + '" class="ml-2 text-xs text-slate-400 hover:text-cyan-400" download>Excel 다운로드</a>';
    document.getElementById('dart-fs-toggle-wrap').style.display = 'flex';
    dartLoadTab(dartState.activeTab);
  }

  var dartSearchLastId = 0;
  function dartSearch() {
    var input = document.getElementById('dart-query-input');
    var dropdown = document.getElementById('dart-search-dropdown');
    var q = (input && input.value) ? input.value.trim() : '';
    if (!q) {
      dartCloseDropdown();
      document.getElementById('dart-company-summary').innerHTML = '';
      return;
    }
    if (!dropdown) return;
    if (dartSearchAbortController) dartSearchAbortController.abort();
    dartSearchAbortController = new AbortController();
    var signal = dartSearchAbortController.signal;
    var myId = ++dartSearchLastId;
    dartSearchInFlight = true;
    dropdown.classList.remove('hidden');
    dropdown.innerHTML = '<div class="px-3 py-4 text-center text-slate-500 text-sm">검색 중…</div>';
    if (input) input.setAttribute('aria-expanded', 'true');
    var timeoutId = setTimeout(function () {
      if (dartSearchAbortController === null) return;
      dartSearchAbortController.abort();
    }, 12000);
    fetch('/api/dart/search?q=' + encodeURIComponent(q) + '&limit=20', { credentials: 'same-origin', signal: signal })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) return res.json().then(function (data) { throw new Error(data.error || data.message || '검색 실패'); });
        return res.json();
      })
      .then(function (data) {
        dartSearchInFlight = false;
        if (myId !== dartSearchLastId || !dropdown) return;
        if (data.error) {
          dropdown.innerHTML = '<div class="px-3 py-4 text-amber-500 text-sm">' + (data.error || '검색 실패') + '</div>';
          return;
        }
        var results = data.results || [];
        if (results.length === 0) {
          dropdown.innerHTML = '<div class="px-3 py-4 text-slate-500 text-sm">검색 결과가 없습니다.</div>';
          return;
        }
        dropdown.innerHTML = '';
        results.forEach(function (item) {
          var li = document.createElement('div');
          li.setAttribute('role', 'option');
          li.className = 'px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-700/80 cursor-pointer border-b border-slate-700/50 last:border-b-0 flex justify-between items-center gap-2';
          li.innerHTML = '<span class="font-medium">' + (item.corp_name || '—') + '</span>' + (item.stock_code ? '<span class="text-slate-500 text-xs">' + item.stock_code + '</span>' : '');
          li.addEventListener('click', function () { dartSelectCompany(item); });
          dropdown.appendChild(li);
        });
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        dartSearchInFlight = false;
        dartSearchAbortController = null;
        if (myId !== dartSearchLastId || !dropdown) return;
        if (err && err.name === 'AbortError') {
          dropdown.innerHTML = '<div class="px-3 py-4 text-slate-500 text-sm">검색이 취소되었거나 시간이 초과되었습니다.</div>';
          return;
        }
        dropdown.innerHTML = '<div class="px-3 py-4 text-amber-500 text-sm">' + (err && err.message ? err.message : '검색 요청 실패') + '</div>';
      });
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    var t = String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatFinancialNum(val) {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) return '—';
    var n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''), 10);
    if (isNaN(n) || n === 0) return '—';
    return Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n);
  }

  function buildSheetRows(rows) {
    if (!rows || !rows.length) return { rows: [], currentLabel: '당기', prevLabel: '전기' };
    var filtered = rows.filter(function (r) {
      var nm = (r.account_nm != null && r.account_nm !== '') ? String(r.account_nm).trim() : '';
      return nm.length > 0;
    });
    filtered.sort(function (a, b) {
      var oa = a.ord != null ? (typeof a.ord === 'number' ? a.ord : parseInt(a.ord, 10)) : 0;
      var ob = b.ord != null ? (typeof b.ord === 'number' ? b.ord : parseInt(b.ord, 10)) : 0;
      return (oa || 0) - (ob || 0);
    });
    var first = filtered[0] || {};
    var currentLabel = first.thstrm_dt || first.frmtrm_dt || '당기';
    var prevLabel = first.frmtrm_dt || first.bfefrmtrm_dt || '전기';
    var out = filtered.map(function (r) {
      var current = r.thstrm_amount != null && r.thstrm_amount !== '' ? r.thstrm_amount : r.frmtrm_amount;
      var previous = r.frmtrm_amount != null && r.frmtrm_amount !== '' ? r.frmtrm_amount : r.bfefrmtrm_amount;
      return { account_nm: (r.account_nm || '').trim(), current: current, previous: previous };
    });
    return { rows: out, currentLabel: currentLabel, prevLabel: prevLabel };
  }

  function renderDartFinancialsTable(container, data, subTabKey) {
    if (!container || !data) return;
    var labels = {
      balance_sheet: { ko: '재무상태표', en: 'Balance Sheet' },
      income_statement: { ko: '손익계산서', en: 'Income Statement' },
      cash_flow: { ko: '현금흐름표', en: 'Cash Flow' }
    };
    var key = subTabKey || 'balance_sheet';
    var rows = data[key] || [];
    var built = buildSheetRows(rows);
    var currentLabel = built.currentLabel;
    var prevLabel = built.prevLabel;
    var subNavHtml = '<div class="dart-financials"><div class="dart-fs-subnav flex gap-1 mb-4">';
    ['balance_sheet', 'income_statement', 'cash_flow'].forEach(function (k) {
      var L = labels[k];
      var active = k === key ? ' active' : '';
      subNavHtml += '<button type="button" class="dart-fs-subtab-btn px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors' + active + '" data-dart-fs-subtab="' + k + '">' + L.ko + ' (' + L.en + ')</button>';
    });
    subNavHtml += '</div>';
    if (built.rows.length === 0) {
      var hint = key === 'cash_flow' ? '<p class="text-slate-500 text-xs mt-2">DART 단일회사 주요계정 API에서 현금흐름표가 제공되지 않을 수 있습니다.</p>' : '';
      subNavHtml += '<p class="text-slate-500 text-sm">데이터 없음</p>' + hint + '</div>';
      container.innerHTML = subNavHtml;
      return;
    }
    subNavHtml += '<div class="overflow-x-auto"><table class="dart-fs-table"><thead><tr><th class="account">계정과목 (Account)</th><th class="num current">제 ' + escapeHtml(currentLabel) + ' 기</th><th class="num prev">제 ' + escapeHtml(prevLabel) + ' 기</th></tr></thead><tbody>';
    built.rows.forEach(function (r) {
      subNavHtml += '<tr><td class="account">' + escapeHtml(r.account_nm || '—') + '</td><td class="num current">' + formatFinancialNum(r.current) + '</td><td class="num prev">' + formatFinancialNum(r.previous) + '</td></tr>';
    });
    subNavHtml += '</tbody></table></div></div>';
    container.innerHTML = subNavHtml;
  }

  function dartLoadTab(tab) {
    var content = document.getElementById('dart-content');
    if (!content) return;
    if (!dartState.corpCode) {
      content.innerHTML = '<p class="text-slate-500 text-sm">회사명 또는 종목코드로 검색한 뒤 탭에서 재무제표·공시를 확인하세요.</p>';
      return;
    }
    if (tab === 'overview') {
      content.innerHTML = '<p class="text-slate-500 text-sm">로딩 중…</p>';
      fetch('/api/dart/overview?corp_code=' + encodeURIComponent(dartState.corpCode), { credentials: 'same-origin' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) {
            content.innerHTML = '<p class="text-slate-500 text-sm">' + (data.error || '개요 조회 실패') + '</p>';
            return;
          }
          var co = data.company || {};
          var emp = data.employees || {};
          var sh = data.shareholders || [];
          var ceo = co.ceo || co.ceo_nm || '—';
          var estDt = co.est_dt || '—';
          var addr = co.address || co.adres || '—';
          var web = co.website || co.hm_url || '';
          var totEmp = emp.total_employees;
          var avgSal = emp.avg_salary;
          var avgTen = emp.avg_tenure;
          var empYear = emp.year != null ? emp.year : '';
          function fmtNum(n) {
            if (n == null || n === '' || n === undefined) return '—';
            var x = typeof n === 'number' ? n : parseFloat(String(n).replace(/,/g, ''), 10);
            return isNaN(x) ? '—' : Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(x);
          }
          function fmtSalary(won) {
            if (won == null || won === '' || won === undefined) return '—';
            var x = typeof won === 'number' ? won : parseFloat(String(won).replace(/,/g, ''), 10);
            if (isNaN(x)) return '—';
            if (x >= 100000000) return (x / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
            if (x >= 10000) return (x / 10000).toFixed(0) + '만';
            return fmtNum(x);
          }
          var html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
          html += '<div class="bg-slate-800/60 border border-slate-700 rounded-lg p-4"><h3 class="text-sm font-semibold text-slate-400 mb-3">Corporate Profile</h3>';
          html += '<p class="text-slate-200 text-sm"><span class="text-slate-500">대표</span> ' + escapeHtml(ceo) + '</p>';
          html += '<p class="text-slate-200 text-sm mt-1"><span class="text-slate-500">설립일</span> ' + escapeHtml(estDt) + '</p>';
          if (addr && String(addr).trim()) html += '<p class="text-slate-200 text-sm mt-1"><span class="text-slate-500">주소</span> ' + escapeHtml(String(addr).slice(0, 80)) + (String(addr).length > 80 ? '…' : '') + '</p>';
          if (web) html += '<a href="' + escapeHtml(web) + '" target="_blank" rel="noopener" class="text-cyan-400 hover:underline text-sm mt-2 inline-block">Homepage</a>';
          html += '</div>';
          html += '<div class="bg-slate-800/60 border border-slate-700 rounded-lg p-4"><h3 class="text-sm font-semibold text-slate-400 mb-3">Human Capital' + (empYear ? ' (' + empYear + ')' : '') + '</h3>';
          html += '<div class="grid grid-cols-1 gap-3"><div><p class="text-slate-500 text-xs">Avg Salary (평균연봉)</p><p class="text-xl font-bold text-slate-100">' + fmtSalary(avgSal) + '</p></div>';
          html += '<div><p class="text-slate-500 text-xs">Avg Tenure (근속연수)</p><p class="text-xl font-bold text-slate-100">' + fmtNum(avgTen) + '</p></div>';
          html += '<div><p class="text-slate-500 text-xs">Total Staff (임직원수)</p><p class="text-xl font-bold text-slate-100">' + fmtNum(totEmp) + '</p></div></div></div>';
          html += '<div class="bg-slate-800/60 border border-slate-700 rounded-lg p-4 md:col-span-2 lg:col-span-1"><h3 class="text-sm font-semibold text-slate-400 mb-3">Governance (Shareholders)</h3>';
          if (sh.length === 0) {
            html += '<p class="text-slate-500 text-sm">데이터 없음</p>';
          } else {
            html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-slate-600 text-left"><th class="py-1.5 pr-2 text-slate-500 font-medium">Name</th><th class="py-1.5 pr-2 text-slate-500 font-medium">Relation</th><th class="py-1.5 text-slate-500 font-medium text-right">Stake (%)</th></tr></thead><tbody>';
            sh.forEach(function (r) {
              var name = r.nm || r.major_holders_nm || r.주주명 || '—';
              var rel = r.relate || r.relation || r.관계 || '—';
              var pct = r.stock_qota_rt || r.hold_stock_qty_ratio || r.지분;
              html += '<tr class="border-b border-slate-700/50"><td class="py-1.5 pr-2 text-slate-200">' + escapeHtml(String(name)) + '</td><td class="py-1.5 pr-2 text-slate-400">' + escapeHtml(String(rel)) + '</td><td class="py-1.5 text-slate-300 text-right font-mono">' + fmtNum(pct) + '%</td></tr>';
            });
            html += '</tbody></table></div>';
          }
          html += '</div></div>';
          content.innerHTML = html;
        })
        .catch(function () {
          content.innerHTML = '<p class="text-slate-500 text-sm">개요 조회 실패</p>';
        });
      return;
    }
    if (tab === 'financials') {
      content.innerHTML = '<p class="text-slate-500 text-sm">로딩 중…</p>';
      fetch('/api/dart/financials?corp_code=' + encodeURIComponent(dartState.corpCode) + '&fs_div=' + dartState.fsDiv, { credentials: 'same-origin' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) {
            content.innerHTML = '<p class="text-slate-500 text-sm">' + (data.error || '재무제표 조회 실패') + '</p>';
            return;
          }
          var hasAny = !!(data.balance_sheet && data.balance_sheet.length) || !!(data.income_statement && data.income_statement.length) || !!(data.cash_flow && data.cash_flow.length);
          if (!hasAny) {
            var hint = data.dart_message ? '<p class="text-amber-500/90 text-sm mt-2">DART: ' + (data.dart_message || '') + '</p>' : '';
            content.innerHTML = '<p class="text-slate-500 text-sm">데이터 없음</p>' + hint;
            return;
          }
          dartState.financialsData = {
            balance_sheet: data.balance_sheet || [],
            income_statement: data.income_statement || [],
            cash_flow: data.cash_flow || []
          };
          if (!dartState.financialsSubTab || !dartState.financialsData[dartState.financialsSubTab]) {
            dartState.financialsSubTab = dartState.financialsData.balance_sheet.length ? 'balance_sheet' : (dartState.financialsData.income_statement.length ? 'income_statement' : 'cash_flow');
          }
          renderDartFinancialsTable(content, dartState.financialsData, dartState.financialsSubTab);
        })
        .catch(function () {
          content.innerHTML = '<p class="text-slate-500 text-sm">재무제표 조회 실패</p>';
        });
      return;
    }
    if (tab === 'disclosures') {
      content.innerHTML = '<p class="text-slate-500 text-sm">로딩 중…</p>';
      fetch('/api/dart/disclosures?corp_code=' + encodeURIComponent(dartState.corpCode), { credentials: 'same-origin' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var list = data.list || [];
          if (list.length === 0) {
            content.innerHTML = '<p class="text-slate-500 text-sm">공시 목록이 없습니다.</p>';
            return;
          }
          function badge(reportName) {
            var t = (reportName || '').toString();
            if (/부도|횡령|소송/.test(t)) return '<span class="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400">Risk</span>';
            if (/배당|증자|계약/.test(t)) return '<span class="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-400">Signal</span>';
            if (/보고서/.test(t)) return '<span class="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-slate-500/20 text-slate-400">Report</span>';
            return '';
          }
          var html = '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm dart-disclosures-table"><thead><tr class="border-b border-slate-700 bg-slate-800/60"><th class="text-left py-2 px-3 text-slate-400 font-medium">날짜</th><th class="text-left py-2 px-3 text-slate-400 font-medium">시간</th><th class="text-left py-2 px-3 text-slate-400 font-medium">보고서명</th><th class="text-left py-2 px-3 text-slate-400 font-medium">제출인</th></tr></thead><tbody>';
          list.forEach(function (item, i) {
            var rceptNo = item.rcept_no || item.rcpNo || item.receipt_no || '';
            var date = item.rcept_dt || item.date || '';
            var time = item.report_time || item.time || '';
            var report = item.report_nm || item.report_name || item.corp_cls || '';
            var flier = item.flr_nm || item.flier || item.submitter || '';
            var href = rceptNo ? ('http://dart.fss.or.kr/dsaf001/main.do?rcpNo=' + encodeURIComponent(rceptNo)) : '';
            var click = href ? ' role="button" tabindex="0" data-dart-rcpt="' + escapeHtml(rceptNo) + '"' : '';
            html += '<tr class="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors' + (i % 2 ? ' bg-slate-800/20' : '') + '"' + click + '><td class="py-2 px-3 text-slate-400">' + escapeHtml(date) + '</td><td class="py-2 px-3 text-slate-500">' + escapeHtml(time) + '</td><td class="py-2 px-3 text-slate-200">' + escapeHtml(report || '—') + ' ' + badge(report) + '</td><td class="py-2 px-3 text-slate-300">' + escapeHtml(flier || '—') + '</td></tr>';
          });
          html += '</tbody></table></div>';
          content.innerHTML = html;
          content.querySelectorAll('[data-dart-rcpt]').forEach(function (tr) {
            var no = tr.getAttribute('data-dart-rcpt');
            if (no) {
              tr.addEventListener('click', function () { window.open('http://dart.fss.or.kr/dsaf001/main.do?rcpNo=' + encodeURIComponent(no), '_blank', 'noopener'); });
            }
          });
        })
        .catch(function () {
          content.innerHTML = '<p class="text-slate-500 text-sm">공시 목록 조회 실패</p>';
        });
      return;
    }
    if (tab === 'analysis') {
      content.innerHTML = '<p class="text-slate-500 text-sm">분석 탭은 추후 제공될 예정입니다.</p>';
    }
  }

  window.initDartView = initDartView;

  // -------------------------------------------------------------------------
  // 초기화
  // -------------------------------------------------------------------------
  function initProfileButton() {
    var btn = document.getElementById('sidebar-profile-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        showView('view-profile');
      });
    }
    if (getPortfolioToken()) {
      portfolioState.token = getPortfolioToken();
      fetchFacctingMe().then(updateSidebarFacctingNickname);
    }
  }

  /** 새로고침 시에는 로그아웃하지 않음. beforeunload/pagehide는 새로고침에서도 발생해 리프레시 시 세션이 풀리던 문제가 있어 제거함. 로그아웃은 상단 Logout 링크로만. */
  function initAutoLogoutOnLeave() {}

  function init() {
    initTabRouting();
    initMobileNav();
    initCalendarNav();
    initProfileButton();
    initRankingRefresh();
    initModal();
    initAddForm();
    initActionsDelegation();
    initAdminTableControls();
    initDashboardModals();
    initFinancialTools();
    initAutoLogoutOnLeave();
    if (typeof window.initMeetingIntelForm === 'function') window.initMeetingIntelForm();
    // 모바일: 메인 스크롤 영역을 맨 위로 맞춰서 위쪽 빈 공간이 안 보이게
    if (window.innerWidth <= 768) {
      var mainEl = document.querySelector('.bkig-terminal main');
      if (mainEl) {
        mainEl.scrollTop = 0;
        window.addEventListener('load', function () { mainEl.scrollTop = 0; });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
