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

  // Donation modal
  var donateModal = document.getElementById('donate-modal');
  var donateOpenBtn = document.getElementById('donate-open-btn');
  var donateCloseBtn = document.getElementById('donate-modal-close');
  var donateOverlay = document.getElementById('donate-modal-overlay');
  var donateForm = document.getElementById('donate-form');

  function openDonateModal() {
    if (donateModal) {
      donateModal.classList.remove('hidden');
      if (donateOpenBtn) donateOpenBtn.setAttribute('aria-expanded', 'true');
    }
  }
  function closeDonateModal() {
    if (donateModal) {
      donateModal.classList.add('hidden');
      if (donateOpenBtn) donateOpenBtn.setAttribute('aria-expanded', 'false');
    }
  }

  var thankYouModal = document.getElementById('donate-thankyou-modal');
  var thankYouOverlay = document.getElementById('donate-thankyou-overlay');
  var thankYouOk = document.getElementById('donate-thankyou-ok');

  function openThankYouModal() {
    if (thankYouModal) thankYouModal.classList.remove('hidden');
  }
  function closeThankYouModal() {
    if (thankYouModal) thankYouModal.classList.add('hidden');
  }

  if (donateOpenBtn) donateOpenBtn.addEventListener('click', openDonateModal);
  if (donateCloseBtn) donateCloseBtn.addEventListener('click', closeDonateModal);
  if (donateOverlay) donateOverlay.addEventListener('click', closeDonateModal);
  if (thankYouOk) thankYouOk.addEventListener('click', closeThankYouModal);
  if (thankYouOverlay) thankYouOverlay.addEventListener('click', closeThankYouModal);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (thankYouModal && !thankYouModal.classList.contains('hidden')) {
      closeThankYouModal();
    } else if (donateModal && !donateModal.classList.contains('hidden')) {
      closeDonateModal();
    }
  });

  if (donateForm) {
    donateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('donate-name');
      var emailEl = document.getElementById('donate-email');
      var amountEl = document.getElementById('donate-amount');
      var name = nameEl ? nameEl.value.trim() : '';
      var email = emailEl ? emailEl.value.trim() : '';
      var amount = amountEl ? amountEl.value.trim() : '';
      if (!name || !email || !amount) return;

      var submitBtn = donateForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '제출 중…';
      }
      fetch('https://faccting.com/bkig/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_slug: 'bkig', name: name, email: email, amount: amount }),
        credentials: 'same-origin',
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (result.ok) {
            closeDonateModal();
            donateForm.reset();
            openThankYouModal();
          } else {
            if (typeof alert === 'function') alert(result.data.message || result.data.error || '제출에 실패했습니다.');
          }
        })
        .catch(function () {
          if (typeof alert === 'function') alert('네트워크 오류가 발생했습니다.');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '기부 신청하기';
          }
        });
    });
  }
})();
