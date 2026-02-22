(function () {
  'use strict';

  var header = document.querySelector('.header');
  var researchPage = document.querySelector('.research-page');
  var researchContent = document.getElementById('research-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!researchPage || !researchContent) return;
    var triggerTop = researchContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Language Toggle (EN/KR) & Sector Tabs ---
  var langToggles = document.querySelectorAll('.lang-toggle');
  var sectorTabs = document.querySelectorAll('.sector-tab');
  var archiveGrid = document.getElementById('research-archive-grid');
  var cards = archiveGrid ? archiveGrid.querySelectorAll('.research-card') : [];

  var currentLang = 'en';
  var currentSector = 'all';

  function applyFilters() {
    cards.forEach(function (card) {
      var cardLang = card.getAttribute('data-lang');
      var cardSector = card.getAttribute('data-sector');
      var matchLang = cardLang === currentLang;
      var matchSector = currentSector === 'all' || cardSector === currentSector;
      card.style.display = matchLang && matchSector ? '' : 'none';
    });
  }

  var featuredEn = document.getElementById('featured-en');
  var featuredKo = document.getElementById('featured-ko');
  var archiveTitle = document.getElementById('archive-title');
  var searchInput = document.getElementById('research-search');

  function setActiveLang(lang) {
    currentLang = lang;
    langToggles.forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (isActive) {
        btn.classList.add('is-active', 'bg-white', 'text-slate-900', 'shadow-sm');
        btn.classList.remove('text-slate-600');
      } else {
        btn.classList.remove('is-active', 'bg-white', 'text-slate-900', 'shadow-sm');
        btn.classList.add('text-slate-600');
      }
    });
    if (featuredEn) featuredEn.style.display = lang === 'en' ? '' : 'none';
    if (featuredKo) featuredKo.style.display = lang === 'ko' ? '' : 'none';
    if (archiveTitle) archiveTitle.textContent = lang === 'en' ? 'Research Archive' : '리서치 아카이브';
    if (searchInput) {
      var key = lang === 'en' ? 'placeholder-en' : 'placeholder-ko';
      var placeholder = searchInput.getAttribute('data-' + key);
      if (placeholder) searchInput.placeholder = placeholder;
    }
    applyFilters();
  }

  langToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveLang(btn.getAttribute('data-lang'));
    });
  });

  function setActiveSector(sector) {
    currentSector = sector;
    sectorTabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-sector') === sector;
      tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (isActive) {
        tab.classList.add('bg-slate-900', 'text-white');
        tab.classList.remove('text-slate-600');
      } else {
        tab.classList.remove('bg-slate-900', 'text-white');
        tab.classList.add('text-slate-600');
      }
    });
    applyFilters();
  }

  sectorTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setActiveSector(tab.getAttribute('data-sector'));
    });
  });

  // 초기 로드 시 선택 언어(EN)만 보이도록 적용
  setActiveLang('en');
})();
