/**
 * Network & Career — Alumni Directory + Job Board
 *
 * @typedef {Object} AlumniProfile
 * @property {number} id
 * @property {string} name
 * @property {string} company
 * @property {string} role
 * @property {string} industry - IB | PE | HF | Audit | Tech
 * @property {string} location - NYC | Seoul | HK
 * @property {'open_for_coffee'|'busy'|'email_me'} status
 * @property {string[]} tags - e.g. #M&A, #Quant, #CPA
 * @property {{ email?: string, linkedin?: string }} contactInfo
 * @property {number} graduationYear
 * @property {string} [avatarUrl]
 * @property {string} [companyLogoUrl]
 *
 * @typedef {Object} JobPosting
 * @property {number} id
 * @property {string} title
 * @property {string} company
 * @property {'Intern'|'Full-time'} type
 * @property {string} deadline - ISO date
 * @property {boolean} isReferral
 * @property {number} [referralAlumniId]
 * @property {string} [referralAlumniName]
 * @property {string} [link]
 * @property {'bulge_bracket'|'big_4'|'other'} [firmType]
 * @property {string} [eventType] - e.g. Resume Drop, Online Test
 */
(function () {
  'use strict';

  var alumniData = [];
  var jobsData = [];
  var networkCalendarCurrent = new Date();

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function statusBadge(status) {
    var label, cls;
    if (status === 'open_for_coffee') {
      label = 'Open for Coffee Chat';
      cls = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    } else if (status === 'busy') {
      label = 'Busy';
      cls = 'bg-red-500/20 text-red-400 border border-red-500/40';
    } else {
      label = 'Email Me';
      cls = 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
    }
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function renderAlumniCard(profile) {
    var contact = profile.contactInfo || {};
    var email = contact.email || '';
    var linkedin = contact.linkedin || '';
    var initials = (profile.name || '?').split(' ').map(function (n) { return n[0]; }).join('').slice(0, 2).toUpperCase();
    var tagsHtml = (profile.tags || []).map(function (t) {
      return '<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/80 text-slate-400 border border-slate-600/60">#' + escapeHtml(t) + '</span>';
    }).join(' ');
    var linkedinBtn = linkedin
      ? '<a href="' + escapeHtml(linkedin) + '" target="_blank" rel="noopener noreferrer" class="network-connect-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600/80 hover:bg-cyan-500/80 text-white transition-colors">LinkedIn</a>'
      : '';
    var emailBtn = email
      ? '<button type="button" class="network-connect-email inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-600/80 hover:bg-slate-500/80 text-slate-200 transition-colors" data-email="' + escapeHtml(email) + '" title="Copy email">Email</button>'
      : '';
    var connectActions = [linkedinBtn, emailBtn].filter(Boolean).join('');
    return (
      '<div class="network-alumni-card bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600/80 active:border-slate-500/80 transition-colors flex flex-col touch-manipulation">' +
        '<div class="flex items-start gap-3">' +
          '<div class="shrink-0 w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">' + escapeHtml(initials) + '</div>' +
          '<div class="min-w-0 flex-1">' +
            '<p class="font-semibold text-slate-100 truncate">' + escapeHtml(profile.name) + '</p>' +
            '<p class="text-xs text-slate-400 truncate">' + escapeHtml(profile.role) + '</p>' +
            '<p class="text-xs text-slate-500 truncate">' + escapeHtml(profile.company) + '</p>' +
            '<div class="mt-2">' + statusBadge(profile.status) + '</div>' +
          '</div>' +
        '</div>' +
        (tagsHtml ? '<div class="mt-3 flex flex-wrap gap-1.5">' + tagsHtml + '</div>' : '') +
        (connectActions ? '<div class="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap gap-2">' + connectActions + '</div>' : '') +
      '</div>'
    );
  }

  /** Re-insert loading/empty placeholders so they exist after grid innerHTML is replaced (fixes re-entry to view). */
  function ensureAlumniGridPlaceholders(grid) {
    if (!grid) return;
    if (!document.getElementById('network-alumni-loading')) {
      var loading = document.createElement('div');
      loading.id = 'network-alumni-loading';
      loading.className = 'col-span-full py-10 text-center text-slate-500 text-sm hidden';
      loading.textContent = 'Loading…';
      grid.appendChild(loading);
    }
    if (!document.getElementById('network-alumni-empty')) {
      var empty = document.createElement('div');
      empty.id = 'network-alumni-empty';
      empty.className = 'col-span-full py-10 text-center text-slate-500 text-sm hidden';
      empty.textContent = 'No alumni match your filters.';
      grid.appendChild(empty);
    }
  }

  function applyAlumniFilters() {
    var search = (document.getElementById('network-alumni-search') && document.getElementById('network-alumni-search').value) || '';
    var q = search.trim().toLowerCase();
    var industryChecked = {};
    var locationChecked = {};
    var yearChecked = {};
    document.querySelectorAll('#network-filter-industry input:checked').forEach(function (cb) {
      industryChecked[cb.value] = true;
    });
    document.querySelectorAll('#network-filter-location input:checked').forEach(function (cb) {
      locationChecked[cb.value] = true;
    });
    document.querySelectorAll('#network-filter-year input:checked').forEach(function (cb) {
      yearChecked[cb.value] = true;
    });
    var hasIndustry = Object.keys(industryChecked).length > 0;
    var hasLocation = Object.keys(locationChecked).length > 0;
    var hasYear = Object.keys(yearChecked).length > 0;

    var filtered = alumniData.filter(function (p) {
      if (q) {
        var nameMatch = (p.name || '').toLowerCase().indexOf(q) >= 0;
        var companyMatch = (p.company || '').toLowerCase().indexOf(q) >= 0;
        if (!nameMatch && !companyMatch) return false;
      }
      if (hasIndustry && !industryChecked[p.industry]) return false;
      if (hasLocation && !locationChecked[p.location]) return false;
      if (hasYear && !yearChecked[String(p.graduationYear)]) return false;
      return true;
    });

    var grid = document.getElementById('network-alumni-grid');
    var loading = document.getElementById('network-alumni-loading');
    var empty = document.getElementById('network-alumni-empty');
    if (!grid) return;

    if (loading) loading.classList.add('hidden');
    if (empty) empty.classList.add('hidden');
    if (filtered.length === 0) {
      grid.innerHTML = '';
      ensureAlumniGridPlaceholders(grid);
      var emptyEl = document.getElementById('network-alumni-empty');
      if (emptyEl) emptyEl.classList.remove('hidden');
      updateFiltersBadge();
      return;
    }
    grid.innerHTML = filtered.map(renderAlumniCard).join('');
    ensureAlumniGridPlaceholders(grid);
    updateFiltersBadge();

    grid.querySelectorAll('.network-connect-email').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var email = btn.getAttribute('data-email');
        if (email && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(function () {
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = 'Email'; }, 1500);
          });
        } else {
          window.location.href = 'mailto:' + email;
        }
      });
    });
  }

  function buildFilterChips(containerId, key, options) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = options.map(function (opt) {
      var val = opt.value != null ? opt.value : opt;
      var label = opt.label != null ? opt.label : val;
      return (
        '<label class="network-filter-chip inline-flex items-center justify-center min-h-[28px] px-2.5 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-[11px] text-slate-400 cursor-pointer select-none transition-all duration-150 hover:border-slate-500 hover:text-slate-200 has-[:checked]:border-cyan-500/60 has-[:checked]:bg-cyan-500/20 has-[:checked]:text-cyan-300">' +
          '<input type="checkbox" class="sr-only network-filter-checkbox" value="' + escapeHtml(String(val)) + '" data-filter="' + key + '">' +
          '<span>' + escapeHtml(String(label)) + '</span>' +
        '</label>'
      );
    }).join('');
    container.querySelectorAll('input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        applyAlumniFilters();
        updateFiltersBadge();
      });
    });
  }

  function updateFiltersBadge() {
    var count = 0;
    document.querySelectorAll('#network-filter-industry input:checked, #network-filter-location input:checked, #network-filter-year input:checked').forEach(function () { count++; });
    var badge = document.getElementById('network-alumni-filters-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  function toggleFiltersPanel(open) {
    var panel = document.getElementById('network-alumni-filters-panel');
    var btn = document.getElementById('network-alumni-filters-toggle');
    if (!panel || !btn) return;
    if (open === undefined) open = !panel.classList.contains('is-open');
    if (open) {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function loadAlumniFilters() {
    var industries = [{ value: 'IB', label: 'IB' }, { value: 'PE', label: 'PE' }, { value: 'HF', label: 'HF' }, { value: 'Audit', label: 'Audit' }, { value: 'Tech', label: 'Tech' }];
    var locations = [{ value: 'NYC', label: 'NYC' }, { value: 'Seoul', label: 'Seoul' }, { value: 'HK', label: 'HK' }];
    var years = [2023, 2022, 2021, 2020, 2019, 2018].map(function (y) { return { value: y, label: String(y) }; });
    buildFilterChips('network-filter-industry', 'industry', industries);
    buildFilterChips('network-filter-location', 'location', locations);
    buildFilterChips('network-filter-year', 'year', years);
  }

  function loadAlumni() {
    var grid = document.getElementById('network-alumni-grid');
    var loading = document.getElementById('network-alumni-loading');
    var empty = document.getElementById('network-alumni-empty');
    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');

    fetch('/api/network/alumni', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        alumniData = data.alumni || [];
        loadAlumniFilters();
        applyAlumniFilters();
      })
      .catch(function () {
        alumniData = [];
        if (loading) loading.classList.add('hidden');
        if (empty) { empty.classList.remove('hidden'); empty.textContent = 'Failed to load alumni.'; }
        if (grid) grid.innerHTML = '';
      });
  }

  function firmTypeColor(firmType) {
    if (firmType === 'bulge_bracket') return 'bg-blue-500/80';
    if (firmType === 'big_4') return 'bg-amber-500/80';
    return 'bg-emerald-500/80';
  }

  function renderJobRow(job) {
    var referralClass = job.isReferral ? ' network-job-row-referral border-l-4 border-amber-500' : '';
    var referralBadge = job.isReferral
      ? '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">Verified Referral</span>'
      : '';
    var contact = job.referralAlumniName ? escapeHtml(job.referralAlumniName) : '—';
    var saveBtn = '<button type="button" class="network-save-calendar px-3 py-2 text-xs font-medium rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 transition-colors touch-manipulation" data-deadline="' + escapeHtml(job.deadline || '') + '" data-title="' + escapeHtml((job.title || '') + ' @ ' + (job.company || '')) + '">Save</button>';
    return (
      '<tr class="network-job-row border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors' + referralClass + '">' +
        '<td class="py-3 px-3 text-slate-200 font-medium">' + (referralBadge ? referralBadge + ' ' : '') + escapeHtml(job.title || '') + '</td>' +
        '<td class="py-3 px-3 text-slate-400">' + escapeHtml(job.company || '') + '</td>' +
        '<td class="py-3 px-3 text-slate-400 hidden sm:table-cell">' + escapeHtml(job.type || '') + '</td>' +
        '<td class="py-3 px-3 text-slate-400 tabular-nums">' + escapeHtml(job.deadline || '') + '</td>' +
        '<td class="py-3 px-3 text-slate-400 hidden md:table-cell">' + contact + '</td>' +
        '<td class="py-3 px-3 text-right">' + saveBtn + '</td>' +
      '</tr>'
    );
  }

  function renderJobCard(job) {
    var referralBadge = job.isReferral
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">Referral</span>'
      : '';
    var contact = job.referralAlumniName ? escapeHtml(job.referralAlumniName) : '—';
    var title = escapeHtml(job.title || '');
    var company = escapeHtml(job.company || '');
    var deadline = escapeHtml(job.deadline || '');
    var type = escapeHtml(job.type || '');
    var dataTitle = escapeHtml((job.title || '') + ' @ ' + (job.company || ''));
    var dataDeadline = escapeHtml(job.deadline || '');
    return (
      '<div class="network-job-card py-4 px-4 ' + (job.isReferral ? 'border-l-4 border-amber-500 bg-amber-500/5' : '') + '">' +
        '<div class="flex flex-wrap items-start justify-between gap-2">' +
          '<div class="min-w-0 flex-1">' +
            (referralBadge ? '<div class="mb-1">' + referralBadge + '</div>' : '') +
            '<p class="font-medium text-slate-100">' + title + '</p>' +
            '<p class="text-sm text-slate-400">' + company + ' · ' + type + '</p>' +
            '<p class="text-xs text-slate-500 mt-1 tabular-nums">Due ' + deadline + '</p>' +
            (contact !== '—' ? '<p class="text-xs text-slate-400 mt-0.5">Contact: ' + contact + '</p>' : '') +
          '</div>' +
          '<button type="button" class="network-save-calendar shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium border border-slate-600 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 transition-colors touch-manipulation" data-deadline="' + dataDeadline + '" data-title="' + dataTitle + '">Save</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bindSaveCalendarButtons(container) {
    if (!container) return;
    container.querySelectorAll('.network-save-calendar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var deadline = btn.getAttribute('data-deadline');
        var title = btn.getAttribute('data-title');
        if (!deadline || !title) return;
        var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + deadline.replace(/-/g, '') + '/' + deadline.replace(/-/g, '');
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });
  }

  function loadJobsList() {
    var tbody = document.getElementById('network-jobs-tbody');
    var cardsEl = document.getElementById('network-jobs-cards');
    if (jobsData.length === 0) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500 text-sm">No job postings.</td></tr>';
      if (cardsEl) cardsEl.innerHTML = '<div class="py-8 text-center text-slate-500 text-sm">No job postings.</div>';
      return;
    }
    if (tbody) {
      tbody.innerHTML = jobsData.map(renderJobRow).join('');
      bindSaveCalendarButtons(tbody);
    }
    if (cardsEl) {
      cardsEl.innerHTML = jobsData.map(renderJobCard).join('');
      bindSaveCalendarButtons(cardsEl);
    }
  }

  function renderCalendar() {
    var year = networkCalendarCurrent.getFullYear();
    var month = networkCalendarCurrent.getMonth();
    var first = new Date(year, month, 1);
    var last = new Date(year, month + 1, 0);
    var startDay = first.getDay();
    var daysInMonth = last.getDate();

    var labelEl = document.getElementById('network-calendar-month-label');
    if (labelEl) labelEl.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    var grid = document.getElementById('network-calendar-grid');
    if (!grid) return;

    var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var head = weekdays.map(function (d) { return '<div class="font-medium text-slate-500 text-center py-1">' + d + '</div>'; }).join('');
    var blanks = Array(startDay).fill('<div class="p-1 min-h-[36px] bg-slate-800/30 rounded"></div>').join('');

    var eventsByDate = {};
    jobsData.forEach(function (job) {
      var d = (job.deadline || '').slice(0, 10);
      if (!d) return;
      if (!eventsByDate[d]) eventsByDate[d] = [];
      eventsByDate[d].push(job);
    });

    var cells = '';
    for (var i = 0; i < startDay; i++) cells += '<div class="p-1 min-h-[36px] bg-slate-800/30 rounded"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var events = eventsByDate[dateStr] || [];
      var eventDots = events.slice(0, 3).map(function (ev) {
        return '<span class="inline-block w-1.5 h-1.5 rounded-full ' + firmTypeColor(ev.firmType) + '" title="' + escapeHtml((ev.eventType || 'Deadline') + ': ' + (ev.title || '') + '') + '"></span>';
      }).join('');
      var more = events.length > 3 ? '<span class="text-[10px] text-slate-500">+' + (events.length - 3) + '</span>' : '';
      cells += '<div class="p-1 min-h-[36px] bg-slate-800/40 rounded border border-slate-700/50">' +
        '<div class="text-slate-300 text-xs font-medium">' + d + '</div>' +
        '<div class="flex flex-wrap gap-0.5 items-center mt-0.5">' + eventDots + more + '</div>' +
      '</div>';
    }
    grid.innerHTML = head + blanks + cells;
  }

  function loadJobs() {
    fetch('/api/network/jobs', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) {
        jobsData = data.jobs || [];
        loadJobsList();
        renderCalendar();
      })
      .catch(function () {
        jobsData = [];
        loadJobsList();
        renderCalendar();
      });
  }

  function switchNetworkTab(tab) {
    document.querySelectorAll('.network-subtab').forEach(function (btn) {
      if (btn.getAttribute('data-network-tab') === tab) {
        btn.classList.add('bg-slate-700', 'text-white');
        btn.classList.remove('text-slate-400');
        btn.setAttribute('data-active', 'true');
      } else {
        btn.classList.remove('bg-slate-700', 'text-white');
        btn.classList.add('text-slate-400');
        btn.removeAttribute('data-active');
      }
    });
    var alumniPanel = document.getElementById('network-alumni-panel');
    var jobsPanel = document.getElementById('network-jobs-panel');
    if (tab === 'alumni') {
      if (alumniPanel) alumniPanel.classList.remove('hidden');
      if (jobsPanel) jobsPanel.classList.add('hidden');
    } else {
      if (alumniPanel) alumniPanel.classList.add('hidden');
      if (jobsPanel) jobsPanel.classList.remove('hidden');
    }
  }

  function switchJobView(view) {
    document.querySelectorAll('.network-job-view').forEach(function (btn) {
      if (btn.getAttribute('data-job-view') === view) {
        btn.classList.add('bg-slate-700', 'text-white');
        btn.classList.remove('text-slate-400');
        btn.setAttribute('data-active', 'true');
      } else {
        btn.classList.remove('bg-slate-700', 'text-white');
        btn.classList.add('text-slate-400');
        btn.removeAttribute('data-active');
      }
    });
    var listWrap = document.getElementById('network-jobs-list-wrap');
    var calWrap = document.getElementById('network-jobs-calendar-wrap');
    if (view === 'list') {
      if (listWrap) listWrap.classList.remove('hidden');
      if (calWrap) calWrap.classList.add('hidden');
    } else {
      if (listWrap) listWrap.classList.add('hidden');
      if (calWrap) calWrap.classList.remove('hidden');
      renderCalendar();
    }
  }

  function initNetworkView() {
    switchNetworkTab('alumni');
    switchJobView('list');
    loadAlumni();
    loadJobs();

    document.querySelectorAll('.network-subtab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchNetworkTab(btn.getAttribute('data-network-tab'));
      });
    });

    document.querySelectorAll('.network-job-view').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchJobView(btn.getAttribute('data-job-view'));
      });
    });

    var filtersToggle = document.getElementById('network-alumni-filters-toggle');
    if (filtersToggle) {
      filtersToggle.addEventListener('click', function (e) {
        e.preventDefault();
        var panel = document.getElementById('network-alumni-filters-panel');
        var isOpen = panel && panel.classList.contains('is-open');
        toggleFiltersPanel(!isOpen);
      });
    }
    var resetBtn = document.getElementById('network-alumni-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var search = document.getElementById('network-alumni-search');
        if (search) search.value = '';
        document.querySelectorAll('.network-filter-checkbox').forEach(function (cb) { cb.checked = false; });
        applyAlumniFilters();
        updateFiltersBadge();
      });
    }

    var searchInput = document.getElementById('network-alumni-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyAlumniFilters);
      searchInput.addEventListener('keyup', applyAlumniFilters);
    }

    var calPrev = document.getElementById('network-calendar-prev');
    var calNext = document.getElementById('network-calendar-next');
    if (calPrev) calPrev.addEventListener('click', function () {
      networkCalendarCurrent.setMonth(networkCalendarCurrent.getMonth() - 1);
      renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', function () {
      networkCalendarCurrent.setMonth(networkCalendarCurrent.getMonth() + 1);
      renderCalendar();
    });
  }

  window.initNetworkView = initNetworkView;
})();
