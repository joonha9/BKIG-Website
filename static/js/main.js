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

  // Search button: opens live search modal (handled in base.html inline script)
})();
