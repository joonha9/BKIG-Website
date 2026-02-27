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

  // -------------------------------------------------------------------------
  // Contact form: submit via API, show success modal
  // -------------------------------------------------------------------------
  var contactForm = document.getElementById('contact-form');
  var successModal = document.getElementById('contact-success-modal');

  function showSuccessModal() {
    if (!successModal) return;
    successModal.classList.remove('hidden');
    successModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function hideSuccessModal() {
    if (!successModal) return;
    successModal.classList.add('hidden');
    successModal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function closeModalOnClick(e) {
    if (e.target.hasAttribute('data-contact-modal-close')) hideSuccessModal();
  }

  if (successModal) {
    successModal.addEventListener('click', closeModalOnClick);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !successModal.classList.contains('hidden')) hideSuccessModal();
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('contact-name');
      var emailEl = document.getElementById('contact-email');
      var subjectEl = document.getElementById('contact-subject');
      var messageEl = document.getElementById('contact-message');
      var submitBtn = contactForm.querySelector('button[type="submit"]');
      if (!nameEl || !emailEl || !subjectEl || !messageEl) return;

      var payload = {
        name: (nameEl.value || '').trim(),
        email: (emailEl.value || '').trim(),
        subject: (subjectEl.value || '').trim(),
        message: (messageEl.value || '').trim()
      };
      if (!payload.name || !payload.email || !payload.subject || !payload.message) {
        alert('Please fill in all fields.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok) {
            contactForm.reset();
            showSuccessModal();
          } else {
            alert(result.data.message || result.data.error || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () {
          alert('Network error. Please try again.');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send Message <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"/></svg>';
          }
        });
    });
  }
})();
