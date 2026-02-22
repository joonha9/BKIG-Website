(function () {
  'use strict';

  var header = document.querySelector('.header');
  var partnershipPage = document.querySelector('.partnership-page');
  var partnershipContent = document.getElementById('partnership-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!partnershipPage || !partnershipContent) return;
    var triggerTop = partnershipContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
