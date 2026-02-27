(function () {
  'use strict';

  var header = document.querySelector('.header');
  var peoplePage = document.querySelector('.people-page');
  var peopleContent = document.getElementById('people-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!peoplePage || !peopleContent) return;
    var triggerTop = peopleContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Organizational Chart --- */

  var orgData = {
    '2025-2026': [
      { name: 'Gibeom Kim', role: 'President', tier: 1, initials: 'G.K', university: 'BU', photo: '김기범_회장_BU_3학년.jpg', division: null },
      { name: 'Jinwoo Son', role: 'Vice President', tier: 1, initials: 'J.S', university: 'BU', photo: '손진우_부회장_BU_3학년.jpg', division: null },
      { name: 'Jaewoo Yoon', role: 'Advisor', tier: 1, initials: 'J.Y', university: 'BC', photo: '윤재우_PD_PR팀_BC_4학년.jpg', division: null },
      { name: 'Dongjae Hwang', role: 'Advisor', tier: 1, initials: 'D.H', university: 'BC', photo: '황동재_PD_PR팀_BC_4학년.jpg', division: null },
      { name: 'Hannah Kim', role: 'Report Lead', tier: 2, initials: 'H.K', university: 'BU', photo: '김해나_리포트팀_BU_3학년.jpg', division: 'Equity Research' },
      { name: 'Kangmin Kim', role: 'Report Lead', tier: 2, initials: 'K.K', university: 'BU', photo: '김강민_리포트팀_BU_2학년.jpg', division: 'Equity Research' },
      { name: 'Joonha Kwon', role: 'Report Lead', tier: 2, initials: 'J.K', university: 'BC', photo: '권준하_리포트팀_BC_3학년.JPG', linkedin: 'https://www.linkedin.com/in/joonha-kwon/', division: 'Equity Research' },
      { name: 'Subin Cho', role: 'Investment Lead', tier: 2, initials: 'S.C', university: 'Tufts', photo: '조수빈_PD_PR팀_Tufts_3학년.JPG', division: 'Investment' },
      { name: 'Donggyu Kim', role: 'Investment Lead', tier: 2, initials: 'D.K', university: 'BU', photo: '김동규_투자팀_BU_3학년.jpg', division: 'Investment' },
      { name: 'Jaehyun Kim', role: 'Investment Lead', tier: 2, initials: 'J.K', university: 'BC', photo: '김재현_투자팀_BC_4학년.jpg', division: 'Investment' },
      { name: 'Minji Lee', role: 'PD Lead', tier: 2, initials: 'M.L', university: 'NEU', photo: '이민지_PD_PR팀_NEU_4학년.jpg.JPG', division: 'PD/PR' },
      { name: 'Woojeong Youn', role: 'PD Lead', tier: 2, initials: 'W.Y', university: 'BC', photo: '윤우정_PD_PR팀_BC_4학년.jpg', division: 'PD/PR' },
      { name: 'Shinyeong Park', role: 'PR Lead', tier: 2, initials: 'S.P', university: 'BU', photo: '박신영_PD_PR팀_BU_4학년.jpg', division: 'PD/PR' },
      { name: 'Sunghyun An', role: 'Report Team', tier: 3, initials: 'S.A', university: 'BC', photo: 'SunghyunAn_Report_BC.png', division: 'Equity Research' },
      { name: 'Eunjae Gil', role: 'Report Team', tier: 3, initials: 'E.G', university: 'BC', photo: 'EunjaeGil_Report_BC.jpg', division: 'Equity Research' },
      { name: 'Dongwook Kim', role: 'Report Team', tier: 3, initials: 'D.K', university: 'BU', photo: 'DongwookKim_Report_BU.jpeg', division: 'Equity Research' },
      { name: 'Ethan Kim', role: 'Report Team', tier: 3, initials: 'E.K', university: 'BC', photo: 'EthanKim_Report_BC.JPG', division: 'Equity Research' },
      { name: 'Hyunsoo Kim', role: 'Report Team', tier: 3, initials: 'H.K', university: 'BU', photo: 'HyunsooKim_Report_BU.jpg', division: 'Equity Research' },
      { name: 'Donghyun Lee', role: 'Report Team', tier: 3, initials: 'D.L', university: 'BU', photo: 'DonghyunLee_Report_BU.jpg', division: 'Equity Research' },
      { name: 'Haeun Lee', role: 'Report Team', tier: 3, initials: 'H.L', university: 'NEU', photo: 'HaeunLee_Report_NEU.jpeg', division: 'Equity Research' },
      { name: 'Ryan Lee', role: 'Report Team', tier: 3, initials: 'R.L', university: 'BC', photo: 'RyanLee_Report_BC.jpeg', division: 'Equity Research' },
      { name: 'Yoonjun Song', role: 'Report Team', tier: 3, initials: 'Y.S', university: 'BU', photo: 'YoonjunSong_Report_BU.jpeg', division: 'Equity Research' },
      { name: 'Andrew Choi', role: 'Investment Team', tier: 3, initials: 'A.C', university: 'Tufts', photo: 'AndrewChoi_Investment_Tufts.JPG', division: 'Investment' },
      { name: 'Haeyoul Chung', role: 'Investment Team', tier: 3, initials: 'H.C', university: 'BU', photo: 'HaeyoulChung_Investment_BU.JPG', division: 'Investment' },
      { name: 'Jimin Hwang', role: 'Investment Team', tier: 3, initials: 'J.H', university: 'BU', photo: 'JiminHwang_Investment_BU.jpg', division: 'Investment' },
      { name: 'Hyeondo Jeong', role: 'Investment Team', tier: 3, initials: 'H.J', university: 'NEU', photo: 'HyeondoJeong_Investment_NEU.jpg', division: 'Investment' },
      { name: 'Jaeyun Jung', role: 'Investment Team', tier: 3, initials: 'J.J', university: 'BC', photo: 'JaeyunJung_Investment_BC.jpeg', division: 'Investment' },
      { name: 'Ashley Kim', role: 'Investment Team', tier: 3, initials: 'A.K', university: 'BU', photo: 'AshleyKim_Investment_BU.JPG', division: 'Investment' },
      { name: 'Christine Kim', role: 'Investment Team', tier: 3, initials: 'C.K', university: 'Tufts', photo: 'ChristineKim_Investment_Tufts.jpg', division: 'Investment' },
      { name: 'Donghyun Kim', role: 'Investment Team', tier: 3, initials: 'D.K', university: 'BC', photo: 'DonghyunKim_Investment_BC.jpeg', division: 'Investment' },
      { name: 'Dongwoo Kim', role: 'Investment Team', tier: 3, initials: 'D.K', university: 'BC', photo: 'DongwooKim_Investment_BC.jpeg', division: 'Investment' },
      { name: 'Seowoo Kim', role: 'Investment Team', tier: 3, initials: 'S.K', university: 'BU', photo: 'SeowooKim_Investment_BU.jpeg', division: 'Investment' },
      { name: 'Jonathan Lee', role: 'Investment Team', tier: 3, initials: 'J.L', university: 'BC', photo: 'JonathanLee_Investment_BC.jpg', division: 'Investment' },
      { name: 'Sungbin Lee', role: 'Investment Team', tier: 3, initials: 'S.L', university: 'NEU', photo: 'SungbinLee_Investment_NEU.JPG', division: 'Investment' },
      { name: 'Yeongwoo Lee', role: 'Investment Team', tier: 3, initials: 'Y.L', university: 'NEU', photo: 'YeongwooLee_Investment_NEU.png', division: 'Investment' },
      { name: 'Yewon Lee', role: 'Investment Team', tier: 3, initials: 'Y.L', university: 'NEU', photo: 'YewonLee_Investment_NEU.jpg', division: 'Investment' },
      { name: 'Jaewon Oh', role: 'Investment Team', tier: 3, initials: 'J.O', university: 'BU', photo: 'JaewonOh_Investment_BU.jpeg', division: 'Investment' },
      { name: 'Paul Yang', role: 'Investment Team', tier: 3, initials: 'P.Y', university: 'BU', photo: 'PaulYang_Investment_BU.jpg', division: 'Investment' },
      { name: 'Daejin Jung', role: 'PD Team', tier: 3, initials: 'D.J', university: 'BC', photo: 'DaejinJung_PD_BC.jpg', division: 'PD/PR' },
      { name: 'Sungeun Kim', role: 'PD Team', tier: 3, initials: 'S.K', university: 'NEU', photo: 'SungeunKim_PD_NEU.jpeg', division: 'PD/PR' },
      { name: 'Kaylin Van', role: 'PD Team', tier: 3, initials: 'K.V', university: 'BC', photo: 'KaylinVan_PD_BC.jpeg', division: 'PD/PR' },
      { name: 'Jungmin Yoon', role: 'PD Team', tier: 3, initials: 'J.Y', university: 'BC', photo: 'JungminYoon_PD_BC.jpg', division: 'PD/PR' },
      { name: 'Heewoo Han', role: 'PR Team', tier: 3, initials: 'H.H', university: 'BU', photo: 'HeewooHan_PR_BU.JPG', division: 'PD/PR' },
      { name: 'Yerin Jang', role: 'PR Team', tier: 3, initials: 'Y.J', university: 'Tufts', photo: 'YerinJang_PR_Tufts.jpeg', division: 'PD/PR' },
      { name: 'Minseo Kang', role: 'PR Team', tier: 3, initials: 'M.K', university: 'Tufts', photo: 'MinseoKang_PR_Tufts.jpeg', division: 'PD/PR' },
      { name: 'Allison Lee', role: 'PR Team', tier: 3, initials: 'A.L', university: 'Tufts', photo: 'AllisonLee_PR_Tufts.jpeg', division: 'PD/PR' }
    ],
    '2024-2025': [
      { name: 'Gibeom Kim', role: 'President', tier: 1, initials: 'G.K', university: 'BU', division: null },
      { name: 'Jinwoo Son', role: 'Vice President', tier: 1, initials: 'J.S', university: 'BU', division: null },
      { name: 'Jaewoo Yoon', role: 'Advisor', tier: 1, initials: 'J.Y', university: 'BC', division: null },
      { name: 'Dongjae Hwang', role: 'Advisor', tier: 1, initials: 'D.H', university: 'BC', division: null },
      { name: 'Hannah Kim', role: 'Report Lead', tier: 2, initials: 'H.K', university: 'BU', photo: '김해나_리포트팀_BU_3학년.jpg', division: 'Equity Research' },
      { name: 'Kangmin Kim', role: 'Report Lead', tier: 2, initials: 'K.K', university: 'BU', division: 'Equity Research' },
      { name: 'Joonha Kwon', role: 'Report Lead', tier: 2, initials: 'J.K', university: 'BC', photo: 'joonha.JPG', linkedin: 'https://www.linkedin.com/in/joonha-kwon/', division: 'Equity Research' },
      { name: 'Subin Cho', role: 'Investment Lead', tier: 2, initials: 'S.C', university: 'Tufts', division: 'Investment' },
      { name: 'Donggyu Kim', role: 'Investment Lead', tier: 2, initials: 'D.K', university: 'BU', division: 'Investment' },
      { name: 'Jaehyun Kim', role: 'Investment Lead', tier: 2, initials: 'J.K', university: 'BC', division: 'Investment' },
      { name: 'Minji Lee', role: 'PD Lead', tier: 2, initials: 'M.L', university: 'NEU', division: 'PD/PR' },
      { name: 'Woojeong Youn', role: 'PD Lead', tier: 2, initials: 'W.Y', university: 'BC', photo: '윤우정_PD_PR팀_BC_4학년.jpg', division: 'PD/PR' },
      { name: 'Shinyeong Park', role: 'PR Lead', tier: 2, initials: 'S.P', university: 'BU', division: 'PD/PR' },
      { name: 'Sunghyun An', role: 'Report Team', tier: 3, initials: 'S.A', university: 'BC', division: 'Equity Research' },
      { name: 'Eunjae Gil', role: 'Report Team', tier: 3, initials: 'E.G', university: 'BC', division: 'Equity Research' },
      { name: 'Dongwook Kim', role: 'Report Team', tier: 3, initials: 'D.K', university: 'BU', division: 'Equity Research' },
      { name: 'Ethan Kim', role: 'Report Team', tier: 3, initials: 'E.K', university: 'BC', division: 'Equity Research' },
      { name: 'Hyunsoo Kim', role: 'Report Team', tier: 3, initials: 'H.K', university: 'BU', division: 'Equity Research' },
      { name: 'Donghyun Lee', role: 'Report Team', tier: 3, initials: 'D.L', university: 'BU', division: 'Equity Research' },
      { name: 'Haeun Lee', role: 'Report Team', tier: 3, initials: 'H.L', university: 'NEU', photo: 'HaeunLee_Report_NEU.jpeg', division: 'Equity Research' },
      { name: 'Ryan Lee', role: 'Report Team', tier: 3, initials: 'R.L', university: 'BC', division: 'Equity Research' },
      { name: 'Yoonjun Song', role: 'Report Team', tier: 3, initials: 'Y.S', university: 'BU', division: 'Equity Research' },
      { name: 'Andrew Choi', role: 'Investment Team', tier: 3, initials: 'A.C', university: 'Tufts', division: 'Investment' },
      { name: 'Haeyoul Chung', role: 'Investment Team', tier: 3, initials: 'H.C', university: 'BU', division: 'Investment' },
      { name: 'Jimin Hwang', role: 'Investment Team', tier: 3, initials: 'J.H', university: 'BU', division: 'Investment' },
      { name: 'Hyeondo Jeong', role: 'Investment Team', tier: 3, initials: 'H.J', university: 'NEU', division: 'Investment' },
      { name: 'Jaeyun Jung', role: 'Investment Team', tier: 3, initials: 'J.J', university: 'BC', division: 'Investment' },
      { name: 'Ashley Kim', role: 'Investment Team', tier: 3, initials: 'A.K', university: 'BU', division: 'Investment' },
      { name: 'Christine Kim', role: 'Investment Team', tier: 3, initials: 'C.K', university: 'Tufts', division: 'Investment' },
      { name: 'Donghyun Kim', role: 'Investment Team', tier: 3, initials: 'D.K', university: 'BC', division: 'Investment' },
      { name: 'Dongwoo Kim', role: 'Investment Team', tier: 3, initials: 'D.K', university: 'BC', division: 'Investment' },
      { name: 'Seowoo Kim', role: 'Investment Team', tier: 3, initials: 'S.K', university: 'BU', division: 'Investment' },
      { name: 'Jonathan Lee', role: 'Investment Team', tier: 3, initials: 'J.L', university: 'BC', division: 'Investment' },
      { name: 'Sungbin Lee', role: 'Investment Team', tier: 3, initials: 'S.L', university: 'NEU', division: 'Investment' },
      { name: 'Yeongwoo Lee', role: 'Investment Team', tier: 3, initials: 'Y.L', university: 'NEU', division: 'Investment' },
      { name: 'Yewon Lee', role: 'Investment Team', tier: 3, initials: 'Y.L', university: 'NEU', division: 'Investment' },
      { name: 'Jaewon Oh', role: 'Investment Team', tier: 3, initials: 'J.O', university: 'BU', division: 'Investment' },
      { name: 'Paul Yang', role: 'Investment Team', tier: 3, initials: 'P.Y', university: 'BU', division: 'Investment' },
      { name: 'Daejin Jung', role: 'PD Team', tier: 3, initials: 'D.J', university: 'BC', division: 'PD/PR' },
      { name: 'Sungeun Kim', role: 'PD Team', tier: 3, initials: 'S.K', university: 'NEU', division: 'PD/PR' },
      { name: 'Kaylin Van', role: 'PD Team', tier: 3, initials: 'K.V', university: 'BC', division: 'PD/PR' },
      { name: 'Jungmin Yoon', role: 'PD Team', tier: 3, initials: 'J.Y', university: 'BC', division: 'PD/PR' },
      { name: 'Heewoo Han', role: 'PR Team', tier: 3, initials: 'H.H', university: 'BU', division: 'PD/PR' },
      { name: 'Yerin Jang', role: 'PR Team', tier: 3, initials: 'Y.J', university: 'Tufts', division: 'PD/PR' },
      { name: 'Minseo Kang', role: 'PR Team', tier: 3, initials: 'M.K', university: 'Tufts', division: 'PD/PR' },
      { name: 'Allison Lee', role: 'PR Team', tier: 3, initials: 'A.L', university: 'Tufts', division: 'PD/PR' }
    ],
    '2023-2024': [
      { name: 'Yoonsung Choi', role: 'President', tier: 1, initials: 'Y.C', university: 'BU', linkedin: 'https://www.linkedin.com/in/yoonsungchoi1999/', division: null }
      /* Add 2023-2024 Executive Board, Division Leads, and Analysts here */
    ]
  };

  var divisionDescriptions = {
    'Equity Research': 'We conduct in-depth analysis of industries and companies\' intrinsic value, build valuation models, and publish professional research reports.',
    'Investment': 'We develop real-world investment strategies based on macroeconomics and market trends, and manage portfolios with actual capital.',
    'Case Study': 'We analyze past financial deal structures (M&A, LBO) and prepare for global case competitions.',
    'PD/PR': 'We oversee BKIG\'s branding and external communications, and organize networking with finance professionals and alumni.'
  };

  var universityStyles = {
    BC: { border: 'border-t-4 border-t-rose-900', badge: 'bg-rose-100 text-rose-900' },
    BU: { border: 'border-t-4 border-t-red-600', badge: 'bg-red-100 text-red-700' },
    NEU: { border: 'border-t-4 border-t-zinc-900', badge: 'bg-zinc-200 text-zinc-900' },
    Tufts: { border: 'border-t-4 border-t-sky-500', badge: 'bg-sky-100 text-sky-800' }
  };
  var defaultStyles = { border: 'border-t-4 border-t-slate-300', badge: 'bg-slate-100 text-slate-600' };

  function getUniversityStyles(university) {
    if (university && universityStyles[university]) return universityStyles[university];
    return defaultStyles;
  }

  var tier1El = document.getElementById('org-tier1');
  var tier2El = document.getElementById('org-tier2');
  var tier3El = document.getElementById('org-tier3');
  var tabs = document.querySelectorAll('.people-year-tab');
  var divisionTabs = document.querySelectorAll('.people-division-tab');
  var divisionPanel = document.getElementById('division-description-panel');
  var divisionTitleEl = document.getElementById('division-description-title');
  var divisionTextEl = document.getElementById('division-description-text');

  var currentYear = '2025-2026';
  var currentDivision = 'All';

  function getByTier(list, tier) {
    return list.filter(function (p) { return p.tier === tier; });
  }

  function filterByDivision(list, division) {
    if (division === 'All') return list;
    return list.filter(function (p) {
      if (p.tier === 1) return true;
      return p.division === division;
    });
  }

  function linkedInIcon(url) {
    var href = url || '#';
    return '<a href="' + href + '" target="_blank" rel="noopener noreferrer" class="absolute top-3 left-3 inline-flex items-center text-slate-500 hover:text-slate-700" aria-label="LinkedIn"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>';
  }

  function cardHtml(person, size) {
    var styles = getUniversityStyles(person.university);
    var avatarSize = size === 'tier1' ? 'w-20 h-20 text-xl' : size === 'tier2' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm';
    var avatarHtml = person.photo
      ? '<img src="/static/images/people/' + person.photo + '" alt="" class="rounded-full object-cover shrink-0 ' + avatarSize.replace(' text-xl', '').replace(' text-lg', '').replace(' text-sm', '') + '" width="64" height="64">'
      : '<div class="rounded-full bg-slate-100 flex items-center justify-center shrink-0 ' + avatarSize + '"><span class="font-bold text-slate-900">' + person.initials + '</span></div>';
    var nameSize = size === 'tier1' ? 'text-xl sm:text-2xl' : size === 'tier2' ? 'text-lg' : 'text-base';
    var padding = size === 'tier1' ? 'p-8' : size === 'tier2' ? 'p-6' : 'p-4';
    var badgeHtml = person.university
      ? '<span class="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ' + styles.badge + '">' + person.university + '</span>'
      : '<span class="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ' + styles.badge + '">—</span>';
    return (
      '<div class="org-card relative rounded-xl ' + styles.border + ' hover:-translate-y-1 transition-all duration-300 ' + padding + ' flex flex-col items-center text-center min-w-0">' +
        linkedInIcon(person.linkedin) +
        badgeHtml +
        avatarHtml +
        '<h4 class="' + nameSize + ' font-bold text-slate-900 mt-3 truncate w-full">' + person.name + '</h4>' +
        '<p class="text-blue-700 text-xs sm:text-sm font-medium mt-0.5">' + person.role + '</p>' +
      '</div>'
    );
  }

  function renderOrgChart(year, division) {
    var list = orgData[year];
    if (!list || !tier1El || !tier2El || !tier3El) return;

    var filtered = filterByDivision(list, division);
    var t1 = getByTier(filtered, 1);
    var t2 = getByTier(filtered, 2);
    var t3 = getByTier(filtered, 3);

    tier1El.innerHTML = t1.map(function (p) { return cardHtml(p, 'tier1'); }).join('');
    tier2El.innerHTML = t2.map(function (p) { return cardHtml(p, 'tier2'); }).join('');
    tier3El.innerHTML = t3.map(function (p) { return cardHtml(p, 'tier3'); }).join('');
  }

  function updateDivisionPanel(division) {
    if (!divisionPanel || !divisionTitleEl || !divisionTextEl) return;
    if (division === 'All') {
      divisionPanel.classList.remove('visible');
      divisionPanel.setAttribute('aria-hidden', 'true');
      divisionPanel.addEventListener('transitionend', function onEnd() {
        divisionPanel.removeEventListener('transitionend', onEnd);
        if (currentDivision === 'All') divisionPanel.classList.add('hidden');
      }, { once: true });
    } else {
      divisionPanel.classList.remove('hidden');
      divisionTitleEl.textContent = division;
      divisionTextEl.textContent = divisionDescriptions[division] || '';
      divisionPanel.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () {
        divisionPanel.classList.add('visible');
      });
    }
  }

  function setActiveDivisionTab(division) {
    divisionTabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-division') === division;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        tab.classList.remove('text-slate-400', 'border-transparent');
        tab.classList.add('text-slate-900', 'border-slate-900');
      } else {
        tab.classList.remove('text-slate-900', 'border-slate-900');
        tab.classList.add('text-slate-400', 'border-transparent');
      }
    });
  }

  function setActiveTab(activeYear) {
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-year') === activeYear;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        tab.classList.remove('text-slate-600');
        tab.classList.add('bg-slate-900', 'text-white');
      } else {
        tab.classList.add('text-slate-600');
        tab.classList.remove('bg-slate-900', 'text-white');
      }
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var year = tab.getAttribute('data-year');
      currentYear = year;
      setActiveTab(year);
      renderOrgChart(currentYear, currentDivision);
    });
  });

  divisionTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var division = tab.getAttribute('data-division');
      currentDivision = division;
      setActiveDivisionTab(division);
      updateDivisionPanel(division);
      renderOrgChart(currentYear, currentDivision);
    });
  });

  if (tier1El && tier2El && tier3El) {
    setActiveTab('2025-2026');
    setActiveDivisionTab('All');
    updateDivisionPanel('All');
    renderOrgChart('2025-2026', 'All');
  }
})();
