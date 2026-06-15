document.addEventListener('DOMContentLoaded', () => {
  // ── Intake Form Dropdown ──
  const intakeForms = {
    adult: [
      { label: 'New Patient Packet', file: 'New Patient Package.pdf' }
    ],
    adolescent: [
      { label: 'New Patient Packet', file: 'New Patient Package.pdf' },
      { label: 'ADHD Rating Scale IV — With Adolescent Prompts', file: 'ADHD Rating Scale IV with Adolescent Prompts.pdf' }
    ]
  };

  const typeSelect   = document.getElementById('intake-type-select');
  const formGroup    = document.getElementById('intake-form-group');
  const formSelect   = document.getElementById('intake-form-select');
  const dlBtn        = document.getElementById('intake-download-btn');
  const preview      = document.getElementById('intake-selected-preview');
  const previewName  = document.getElementById('intake-selected-name');

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const forms = intakeForms[typeSelect.value] || [];
      formSelect.innerHTML = '<option value="" disabled selected>Select a form...</option>';
      forms.forEach(({ label, file }) => {
        const opt = document.createElement('option');
        opt.value = file;
        opt.textContent = label;
        formSelect.appendChild(opt);
      });
      formGroup.hidden = false;
      dlBtn.classList.add('intake-btn-disabled');
      preview.hidden = true;
    });

    formSelect.addEventListener('change', () => {
      if (formSelect.value) {
        dlBtn.href = formSelect.value;
        dlBtn.download = formSelect.value;
        dlBtn.classList.remove('intake-btn-disabled');
        previewName.textContent = formSelect.options[formSelect.selectedIndex].text;
        preview.hidden = false;
      }
    });
  }


  // Google Apps Script Web App endpoint (shared across forms)
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNRYbovo9BBizFYJC2Vmqayjamkmv17OvERDeyo3iVV9b7bdkT9AzXgPrCYYnFbLyirw/exec';
  const formatDetailsMessage = (details) =>
    details
      .filter(([, value]) => String(value || '').trim())
      .map(([label, value]) => `${label}: ${String(value).trim()}`)
      .join('\n');

  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.nav');
  const year = document.getElementById('year');
  const topbar = document.querySelector('.topbar');
  const appointmentOverlay = document.querySelector('[data-appointment-overlay]');
  const appointmentClose = appointmentOverlay ? appointmentOverlay.querySelector('[data-appointment-close]') : null;
  const appointmentTriggers = document.querySelectorAll('[data-open-appointment]');
  const appointmentName = appointmentOverlay ? appointmentOverlay.querySelector('#modal-name') : null;

  if (menuToggle && nav) {
    const navDropdowns = nav.querySelectorAll('.nav-dropdown');

    const closeNavDropdowns = () => {
      navDropdowns.forEach((dropdown) => {
        dropdown.classList.remove('open');
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    };

    const setNavOpen = (open) => {
      nav.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open) closeNavDropdowns();
    };

    // Add a dedicated close control inside the mobile menu (mobile/tablet only)
    const shouldShowMobileClose = () => window.matchMedia('(max-width: 900px)').matches;

    const ensureMobileClose = () => {
      const existing = nav.querySelector('.mobile-menu-close');
      if (shouldShowMobileClose()) {
        if (!existing) {
          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'mobile-menu-close';
          closeBtn.setAttribute('aria-label', 'Close menu');
          closeBtn.textContent = '×';
          closeBtn.addEventListener('click', () => setNavOpen(false));
          nav.appendChild(closeBtn);
        }
      } else if (existing) {
        existing.remove();
      }
    };

    ensureMobileClose();
    window.addEventListener('resize', ensureMobileClose);

    menuToggle.addEventListener('click', () => {
      const isExpanded = nav.classList.contains('active');
      setNavOpen(!isExpanded);
    });

    navDropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector('.nav-dropdown-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        closeNavDropdowns();
        if (!isOpen) {
          dropdown.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });

      dropdown.querySelectorAll('.nav-dropdown-item').forEach((item) => {
        item.addEventListener('click', () => closeNavDropdowns());
      });
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (nav.classList.contains('active')) setNavOpen(false);
      });
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) closeNavDropdowns();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        setNavOpen(false);
      }
      if (e.key === 'Escape') closeNavDropdowns();
    });
  }

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (topbar) {
    const heroFull = document.querySelector('.hero-full');
    const hero = heroFull || document.querySelector('.hero');
    const navHeight = topbar.offsetHeight || 0;

    const toggleScrolled = () => {
      const heroHeight = heroFull ? heroFull.offsetHeight : (hero ? hero.offsetHeight : 0);
      const threshold = heroFull ? Math.max(1, heroHeight * 0.02 - navHeight) : 0;
      if (window.scrollY > threshold || !heroFull) {
        topbar.classList.add('scrolled');
      } else {
        topbar.classList.remove('scrolled');
      }
    };

    toggleScrolled();
    window.addEventListener('scroll', toggleScrolled, { passive: true });
  }

  // Appointment modal
  const openAppointment = () => {
    if (!appointmentOverlay) return;
    appointmentOverlay.classList.add('open');
    appointmentOverlay.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    if (appointmentName) appointmentName.focus();
  };

  const closeAppointment = () => {
    if (!appointmentOverlay) return;
    appointmentOverlay.classList.remove('open');
    appointmentOverlay.setAttribute('hidden', '');
    document.body.classList.remove('modal-open');
  };

  if (appointmentTriggers.length && appointmentOverlay) {
    appointmentTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openAppointment();
      });
    });
  }

  if (appointmentOverlay) {
    appointmentOverlay.addEventListener('click', (e) => {
      if (e.target === appointmentOverlay) closeAppointment();
    });
  }

  if (appointmentClose) {
    appointmentClose.addEventListener('click', closeAppointment);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appointmentOverlay && appointmentOverlay.classList.contains('open')) {
      closeAppointment();
    }
  });

  // ── Shared form submission ──
  //
  // Submit a payload to the Apps Script endpoint. Returns one of:
  //   'sent'     — CORS response read and confirmed OK
  //   'queued'   — CORS blocked; delivered via no-cors fallback (cannot be confirmed,
  //                but this is the normal path for Apps Script, which omits CORS headers)
  //   'rejected' — CORS response read and the server reported a failure
  //   'error'    — the request could not be dispatched at all (offline, etc.)
  const submitToScript = async (payload) => {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers, body });
      const data = await response.json().catch(() => ({}));
      return response.ok && data.ok !== false ? 'sent' : 'rejected';
    } catch (error) {
      // CORS error (expected for Apps Script) — retry opaque so the request still lands.
      try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers, body });
        return 'queued';
      } catch (err) {
        return 'error';
      }
    }
  };

  // Wire up a single form. `build(formData)` must return an outbound payload object,
  // or a falsy value when the form is invalid (in which case `messages.invalid` shows).
  const attachForm = (form, { build, messages, statusSelector = '.form-status' }) => {
    const statusEl = form.querySelector(statusSelector);
    const submitBtn = form.querySelector('button[type="submit"]');

    const setStatus = (message, state) => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.remove('success', 'error', 'pending');
      if (state) statusEl.classList.add(state);
    };

    const setSending = (sending) => {
      if (!submitBtn) return;
      if (sending) {
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
      } else {
        submitBtn.textContent = submitBtn.dataset.originalText || submitBtn.textContent;
        submitBtn.disabled = false;
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = build(new FormData(form));
      if (!payload) {
        setStatus(messages.invalid, 'error');
        return;
      }

      setStatus('Sending...', 'pending');
      setSending(true);
      try {
        const result = await submitToScript(payload);
        if (result === 'sent' || result === 'queued') {
          setStatus(messages.success, 'success');
          form.reset();
        } else if (result === 'rejected') {
          setStatus(messages.rejected, 'error');
        } else {
          setStatus(messages.error, 'error');
        }
      } finally {
        setSending(false);
      }
    });
  };

  // Attach every matching form on the page using a shared config per form type.
  const attachAll = (selector, config) =>
    document.querySelectorAll(selector).forEach((form) => attachForm(form, config));

  const trimmed = (formData, key) => (formData.get(key) || '').toString().trim();

  // Contact / quick appointment form
  attachAll('[data-contact-form]', {
    build: (formData) => {
      const payload = {
        name: trimmed(formData, 'name'),
        email: trimmed(formData, 'email'),
        phone: trimmed(formData, 'phone'),
        message: trimmed(formData, 'message'),
      };
      if (!payload.name || !payload.email || !payload.message) return null;
      return payload;
    },
    messages: {
      invalid: 'Please complete name, email, and message.',
      success: 'Thank you. Your request was sent.',
      rejected: 'We could not send your request. Please try again or call the clinic.',
      error: 'Network error. Please try again or call the clinic.',
    },
  });

  // New patient appointment request (modal + inline forms)
  attachAll('[data-new-patient-form], [data-new-patient-form-inline]', {
    build: (formData) => {
      const p = {
        firstName: trimmed(formData, 'firstName'),
        lastName: trimmed(formData, 'lastName'),
        phone: trimmed(formData, 'phone'),
        email: trimmed(formData, 'email'),
        provider: trimmed(formData, 'provider'),
        appointmentType: trimmed(formData, 'appointmentType'),
        insurance: trimmed(formData, 'insurance'),
        concern: trimmed(formData, 'concern'),
        location: trimmed(formData, 'location'),
        heardAbout: trimmed(formData, 'heardAbout'),
      };
      if (Object.values(p).some((v) => !v)) return null;
      return {
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
        phone: p.phone,
        message: formatDetailsMessage([
          ['First Name', p.firstName],
          ['Last Name', p.lastName],
          ['Phone', p.phone],
          ['Email', p.email],
          ['Provider', p.provider],
          ['Appointment Type', p.appointmentType],
          ['Insurance', p.insurance],
          ['Location', p.location],
          ['How You Heard About Us', p.heardAbout],
          ['Concern', p.concern],
        ]),
        formType: trimmed(formData, 'formType') || 'new_patient',
        ...p,
      };
    },
    messages: {
      invalid: 'Please complete all required fields.',
      success: 'Thank you. Your request was sent.',
      rejected: 'We could not send your request. Please try again or call the clinic.',
      error: 'Network error. Please try again or call the clinic.',
    },
  });

  // Cancel appointment
  attachAll('[data-cancel-form]', {
    build: (formData) => {
      const p = {
        firstName: trimmed(formData, 'firstName'),
        lastName: trimmed(formData, 'lastName'),
        dob: trimmed(formData, 'dob'),
        phone: trimmed(formData, 'phone'),
        provider: trimmed(formData, 'provider'),
        appointmentDate: trimmed(formData, 'appointmentDate'),
        appointmentTime: trimmed(formData, 'appointmentTime'),
        appointmentType: trimmed(formData, 'appointmentType'),
        location: trimmed(formData, 'location'),
        reason: trimmed(formData, 'reason'),
      };
      if (Object.values(p).some((v) => !v)) return null;
      return {
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: '',
        phone: p.phone,
        message: formatDetailsMessage([
          ['First Name', p.firstName],
          ['Last Name', p.lastName],
          ['Date of Birth', p.dob],
          ['Phone', p.phone],
          ['Provider', p.provider],
          ['Appointment Date', p.appointmentDate],
          ['Appointment Time', p.appointmentTime],
          ['Appointment Type', p.appointmentType],
          ['Location', p.location],
          ['Reason', p.reason],
        ]),
        formType: trimmed(formData, 'formType') || 'cancel_appointment',
        ...p,
      };
    },
    messages: {
      invalid: 'Please complete all required fields.',
      success: 'Thank you. Your cancellation request was sent.',
      rejected: 'We could not send your request. Please call the clinic.',
      error: 'Network error. Please try again or call the clinic.',
    },
  });

  // Medication refill request
  attachAll('[data-refill-form]', {
    build: (formData) => {
      const p = {
        firstName: trimmed(formData, 'firstName'),
        lastName: trimmed(formData, 'lastName'),
        dob: trimmed(formData, 'dob'),
        phone: trimmed(formData, 'phone'),
        provider: trimmed(formData, 'provider'),
        medication: trimmed(formData, 'medication'),
        dosage: trimmed(formData, 'dosage'),
        pharmacyName: trimmed(formData, 'pharmacyName'),
        pharmacyPhone: trimmed(formData, 'pharmacyPhone'),
        concern: trimmed(formData, 'concern'),
      };
      if (Object.values(p).some((v) => !v)) return null;
      return {
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: '',
        phone: p.phone,
        message: formatDetailsMessage([
          ['First Name', p.firstName],
          ['Last Name', p.lastName],
          ['Date of Birth', p.dob],
          ['Phone', p.phone],
          ['Provider', p.provider],
          ['Medication', p.medication],
          ['Dosage', p.dosage],
          ['Pharmacy Name', p.pharmacyName],
          ['Pharmacy Phone', p.pharmacyPhone],
          ['Concern', p.concern],
        ]),
        formType: trimmed(formData, 'formType') || 'refill_request',
        ...p,
      };
    },
    messages: {
      invalid: 'Please complete all required fields.',
      success: 'Thank you. Your refill request was sent.',
      rejected: 'We could not send your request. Please call the clinic.',
      error: 'Network error. Please try again or call the clinic.',
    },
  });

  // Billing questions
  attachAll('[data-billing-form]', {
    build: (formData) => {
      const p = {
        firstName: trimmed(formData, 'firstName'),
        lastName: trimmed(formData, 'lastName'),
        dob: trimmed(formData, 'dob'),
        phone: trimmed(formData, 'phone'),
        concern: trimmed(formData, 'concern'),
      };
      if (Object.values(p).some((v) => !v)) return null;
      return {
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: '',
        phone: p.phone,
        message: formatDetailsMessage([
          ['First Name', p.firstName],
          ['Last Name', p.lastName],
          ['Date of Birth', p.dob],
          ['Phone', p.phone],
          ['Question', p.concern],
        ]),
        formType: trimmed(formData, 'formType') || 'billing_questions',
        ...p,
      };
    },
    messages: {
      invalid: 'Please complete all required fields.',
      success: 'Thank you. Your billing question was sent.',
      rejected: 'We could not send your request. Please call the clinic.',
      error: 'Network error. Please try again or call the clinic.',
    },
  });

  // Chatbox toggle
  const chatToggle = document.querySelector('.chat-toggle');
  const chatbox = document.getElementById('chatbox');
  const chatClose = document.querySelector('.chatbox-close');
  const chatForm = document.querySelector('[data-chat-form]');

  const setChatOpen = (open) => {
    if (!chatbox || !chatToggle) return;
    chatbox.classList.toggle('open', open);
    chatToggle.setAttribute('aria-expanded', String(open));
  };

  if (chatToggle && chatbox) {
    chatToggle.addEventListener('click', () => {
      const isOpen = chatbox.classList.contains('open');
      setChatOpen(!isOpen);
    });
  }

  if (chatClose) {
    chatClose.addEventListener('click', () => setChatOpen(false));
  }

  if (chatForm) {
    attachForm(chatForm, {
      statusSelector: '.chatbox-status',
      build: (formData) => {
        const payload = {
          name: trimmed(formData, 'name'),
          email: trimmed(formData, 'email'),
          phone: trimmed(formData, 'phone'),
          message: trimmed(formData, 'message'),
          source: 'chat',
        };
        if (!payload.name || !payload.email || !payload.message) return null;
        return payload;
      },
      messages: {
        invalid: 'Please add your name, email, and message.',
        success: 'Thanks! We received your message and will respond soon.',
        rejected: 'Unable to send right now. Please call the clinic.',
        error: 'Network error. Please call the clinic.',
      },
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatbox && chatbox.classList.contains('open')) {
      setChatOpen(false);
    }
  });

  // ── Back-to-top button ──
  // Created here so it appears on every page; CSS keeps it mobile-only and
  // reveals it only after the user has scrolled down.
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'scroll-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path d="M12 5 5 12M12 5l7 7M12 5v14" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(toTop);

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const toggleToTop = () => {
    toTop.classList.toggle('visible', window.scrollY > 400);
  };
  toggleToTop();
  window.addEventListener('scroll', toggleToTop, { passive: true });
});
