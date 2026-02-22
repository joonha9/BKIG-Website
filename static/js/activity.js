(function () {
  'use strict';

  var header = document.querySelector('.header');
  var activityPage = document.querySelector('.activity-page');
  var activityContent = document.getElementById('activity-content');
  var headerHeight = 72;

  function onScroll() {
    if (!header) return;
    if (!activityPage || !activityContent) return;
    var triggerTop = activityContent.getBoundingClientRect().top;
    if (triggerTop <= headerHeight) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Track Record accordion */
  var accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panelId = btn.getAttribute('aria-controls');
      var panel = document.getElementById(panelId);
      var arrow = btn.querySelector('.accordion-arrow');
      var isExpanded = btn.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        panel.classList.remove('accordion-panel-open');
        arrow.classList.remove('accordion-arrow-open');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        accordionHeaders.forEach(function (other) {
          var otherPanelId = other.getAttribute('aria-controls');
          var otherPanel = document.getElementById(otherPanelId);
          var otherArrow = other.querySelector('.accordion-arrow');
          otherPanel.classList.remove('accordion-panel-open');
          otherArrow.classList.remove('accordion-arrow-open');
          other.setAttribute('aria-expanded', 'false');
        });
        panel.classList.add('accordion-panel-open');
        arrow.classList.add('accordion-arrow-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
