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

  // -------------------------------------------------------------------------
  // Contact Executive Team modal
  // -------------------------------------------------------------------------
  var modal = document.getElementById('partnership-contact-modal');
  var openBtn = document.getElementById('partnership-contact-btn');
  var closeBtn = document.getElementById('partnership-modal-close');
  var cancelBtn = document.getElementById('partnership-modal-cancel');
  var form = document.getElementById('partnership-contact-form');
  var successToast = document.getElementById('partnership-success-toast');

  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function showSuccess() {
    if (successToast) {
      successToast.classList.remove('hidden');
      setTimeout(function () {
        successToast.classList.add('hidden');
      }, 4000);
    } else {
      alert('문의가 접수되었습니다. 감사합니다.');
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      openModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var companyEl = document.getElementById('partnership-company');
      var nameEl = document.getElementById('partnership-name');
      var emailEl = document.getElementById('partnership-email');
      var subjectEl = document.getElementById('partnership-subject');
      var messageEl = document.getElementById('partnership-message');
      var submitBtn = form.querySelector('button[type="submit"]');
      if (!companyEl || !nameEl || !emailEl || !subjectEl || !messageEl) return;

      var payload = {
        company_name: (companyEl.value || '').trim(),
        name: (nameEl.value || '').trim(),
        email: (emailEl.value || '').trim(),
        subject: (subjectEl.value || '').trim(),
        message: (messageEl.value || '').trim()
      };
      if (!payload.company_name || !payload.name || !payload.email || !payload.subject || !payload.message) {
        alert('모든 필드를 입력해 주세요.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '전송 중…';
      }

      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            form.reset();
            closeModal();
            showSuccess();
          } else {
            alert(result.data.message || result.data.error || '전송에 실패했습니다. 다시 시도해 주세요.');
          }
        })
        .catch(function () {
          alert('네트워크 오류입니다. 다시 시도해 주세요.');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
          }
        });
    });
  }
})();
