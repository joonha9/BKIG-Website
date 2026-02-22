(function () {
  'use strict';

  var header = document.querySelector('.header');
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  var navLinks = document.querySelectorAll('.nav-link');
  var searchBtn = document.querySelector('.nav-search');

  // Header: switch to glass + dark text when scrolled (index / join_us / legal pages)
  var universitiesSection = document.getElementById('universities');
  var joinPage = document.querySelector('.join-us-page');
  var joinPageContent = joinPage ? joinPage.querySelector('.bg-white') : null;
  var legalContent = document.getElementById('legal-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    var triggerTop;

    if (joinPage && joinPageContent) {
      // Join Us: scrolled when white main content reaches header
      triggerTop = joinPageContent.getBoundingClientRect().top;
      if (triggerTop <= headerHeight) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      return;
    }

    if (legalContent) {
      // Terms of Use / Privacy Policy: scrolled when main content reaches header
      triggerTop = legalContent.getBoundingClientRect().top;
      if (triggerTop <= headerHeight) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      return;
    }

    if (universitiesSection) {
      // Index: scrolled when Participating Universities section is in view
      triggerTop = universitiesSection.getBoundingClientRect().top;
      if (triggerTop <= headerHeight) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu: new full-screen overlay (fintech style) on small viewports
  var mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  var mobileNavClose = document.getElementById('mobile-nav-close');
  var mobileJoinTrigger = document.getElementById('mobile-join-trigger');
  var mobileJoinPanel = document.getElementById('mobile-join-panel');
  var mobileNavContactBtn = document.getElementById('mobile-nav-contact-btn');
  var mobileBreakpoint = window.matchMedia('(max-width: 900px)');

  function closeMobileNav() {
    if (mobileNavOverlay) {
      mobileNavOverlay.classList.remove('is-open');
      mobileNavOverlay.setAttribute('aria-hidden', 'true');
    }
    if (menuToggle) menuToggle.classList.remove('is-active');
    document.body.classList.remove('menu-open');
    if (nav) nav.classList.remove('is-open');
    var accordion = document.querySelector('.mobile-nav-accordion');
    if (accordion) accordion.classList.remove('is-open');
    if (mobileJoinTrigger) mobileJoinTrigger.setAttribute('aria-expanded', 'false');
  }

  function openMobileNav() {
    if (mobileNavOverlay) {
      mobileNavOverlay.classList.add('is-open');
      mobileNavOverlay.setAttribute('aria-hidden', 'false');
    }
    if (menuToggle) menuToggle.classList.add('is-active');
    document.body.classList.add('menu-open');
    var accordion = document.querySelector('.mobile-nav-accordion');
    if (accordion) accordion.classList.remove('is-open');
    if (mobileJoinTrigger) mobileJoinTrigger.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle && mobileNavOverlay) {
    menuToggle.addEventListener('click', function () {
      if (!mobileBreakpoint.matches) return;
      if (mobileNavOverlay.classList.contains('is-open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeMobileNav);
  }

  if (mobileJoinTrigger && mobileJoinPanel) {
    var accordionEl = document.querySelector('.mobile-nav-accordion');
    mobileJoinTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (!accordionEl) return;
      var isOpen = accordionEl.classList.toggle('is-open');
      mobileJoinTrigger.setAttribute('aria-expanded', isOpen);
    });
  }

  if (mobileNavOverlay) {
    var overlayLinks = mobileNavOverlay.querySelectorAll('a[href]');
    overlayLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        closeMobileNav();
      });
    });
    if (mobileNavContactBtn) {
      mobileNavContactBtn.addEventListener('click', function () {
        closeMobileNav();
      });
    }
  }

  // Terminal modal: open on Terminal click, close on X or overlay click
  var terminalModal = document.getElementById('terminal-modal');
  var terminalCloseBtn = document.querySelector('.terminal-modal-close');
  var terminalTriggers = document.querySelectorAll('.terminal-trigger');

  function openTerminalModal() {
    if (!terminalModal) return;
    var errEl = document.getElementById('terminal-login-error');
    if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
    var formState = document.getElementById('terminal-form-state');
    var connectingState = document.getElementById('terminal-connecting-state');
    if (formState) formState.classList.remove('hidden');
    if (connectingState) connectingState.classList.add('hidden');
    terminalModal.classList.remove('hidden');
    terminalModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeTerminalModal() {
    if (!terminalModal) return;
    terminalModal.classList.add('hidden');
    terminalModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  terminalTriggers.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      if (mobileNavOverlay && mobileNavOverlay.classList.contains('is-open')) closeMobileNav();
      openTerminalModal();
    });
  });

  if (terminalCloseBtn) {
    terminalCloseBtn.addEventListener('click', closeTerminalModal);
  }

  if (terminalModal) {
    terminalModal.addEventListener('click', function (e) {
      if (!e.target.closest('.terminal-modal-box')) closeTerminalModal();
    });
  }

  // 로그인 페이지 리다이렉트 시 모달 자동 오픈
  if (window.location.search.indexOf('terminal=login') !== -1) {
    openTerminalModal();
  }

  // Terminal 로그인 폼: Connect 클릭 시 3초간 "Connecting to the Terminal" 스피너 표시 후 로그인 요청
  var terminalLoginForm = document.getElementById('terminal-login-form');
  var terminalLoginError = document.getElementById('terminal-login-error');
  var terminalFormState = document.getElementById('terminal-form-state');
  var terminalConnectingState = document.getElementById('terminal-connecting-state');
  var terminalConnectingTimeout = null;

  function showTerminalForm() {
    if (terminalFormState) terminalFormState.classList.remove('hidden');
    if (terminalConnectingState) terminalConnectingState.classList.add('hidden');
  }
  function showTerminalConnecting() {
    if (terminalFormState) terminalFormState.classList.add('hidden');
    if (terminalConnectingState) terminalConnectingState.classList.remove('hidden');
  }

  if (terminalLoginForm) {
    terminalLoginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (terminalLoginError) {
        terminalLoginError.classList.add('hidden');
        terminalLoginError.textContent = '';
      }
      var analystId = (document.getElementById('terminal-analyst-id') && document.getElementById('terminal-analyst-id').value) ? document.getElementById('terminal-analyst-id').value.trim() : '';
      var password = (document.getElementById('terminal-password') && document.getElementById('terminal-password').value) ? document.getElementById('terminal-password').value : '';
      showTerminalConnecting();
      if (terminalConnectingTimeout) clearTimeout(terminalConnectingTimeout);
      terminalConnectingTimeout = setTimeout(function () {
        terminalConnectingTimeout = null;
        fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analyst_id: analystId, password: password })
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); })
          .then(function (result) {
            if (result.ok && result.data && result.data.success) {
              window.open('/terminal', '_blank', 'noopener,noreferrer');
              closeTerminalModal();
            } else {
              showTerminalForm();
              if (terminalLoginError) {
                terminalLoginError.textContent = (result.data && result.data.message) ? result.data.message : 'Invalid ID or Password';
                terminalLoginError.classList.remove('hidden');
              }
            }
          })
          .catch(function () {
            showTerminalForm();
            if (terminalLoginError) {
              terminalLoginError.textContent = 'Invalid ID or Password';
              terminalLoginError.classList.remove('hidden');
            }
          });
      }, 3000);
    });
  }

  // Search button: opens live search modal (handled in base.html inline script)
})();
