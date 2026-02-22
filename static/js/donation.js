(function () {
  'use strict';

  var header = document.querySelector('.header');
  var donationPage = document.querySelector('.donation-page');
  var donationContent = donationPage ? document.getElementById('donation-content') : null;
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!donationPage || !donationContent) return;
    var triggerTop = donationContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
