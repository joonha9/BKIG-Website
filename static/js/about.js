(function () {
  'use strict';

  var header = document.querySelector('.header');
  var aboutPage = document.querySelector('.about-page');
  var aboutContent = document.getElementById('about-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!aboutPage || !aboutContent) return;
    var triggerTop = aboutContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
