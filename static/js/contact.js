(function () {
  'use strict';

  // Contact page: header turns white when scrolled (same pattern as donation/join_us)
  var header = document.querySelector('.header');
  var contactPage = document.querySelector('.contact-page');
  var heroSection = contactPage ? contactPage.querySelector('section') : null;
  var headerHeight = 72;

  function onScroll() {
    if (!header || !heroSection) return;
    var heroBottom = heroSection.getBoundingClientRect().bottom;
    if (heroBottom <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
