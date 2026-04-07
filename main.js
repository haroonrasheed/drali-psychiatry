document.addEventListener('DOMContentLoaded', () => {
  // Google Apps Script Web App endpoint (shared across forms)
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNRYbovo9BBizFYJC2Vmqayjamkmv17OvERDeyo3iVV9b7bdkT9AzXgPrCYYnFbLyirw/exec';

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

  // Contact/appointment form handling (Google Apps Script endpoint)
  const attachContactForms = () => {
    const forms = document.querySelectorAll('[data-contact-form]');
    if (!forms.length) return;

    const isValid = (payload) => {
      return payload.name && payload.email && payload.message;
    };

    forms.forEach((form) => {
      const statusEl = form.querySelector('.form-status');
      const submitBtn = form.querySelector('button[type="submit"]');

      const setStatus = (message, state) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.remove('success', 'error', 'pending');
        if (state) statusEl.classList.add(state);
      };

      const setSendingState = (sending) => {
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
        const formData = new FormData(form);
        const payload = {
          name: (formData.get('name') || '').trim(),
          email: (formData.get('email') || '').trim(),
          phone: (formData.get('phone') || '').trim(),
          message: (formData.get('message') || '').trim(),
        };

        if (!isValid(payload)) {
          setStatus('Please complete name, email, and message.', 'error');
          return;
        }

        setStatus('Sending...', 'pending');
        setSendingState(true);

        try {
          const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          // If CORS blocks reading the response, treat opaque as success fallback
          if (response.type === 'opaque') {
            setStatus('Thank you. Your request was sent.', 'success');
            form.reset();
          } else {
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.ok !== false) {
              setStatus('Thank you. Your request was sent.', 'success');
              form.reset();
            } else {
              setStatus('We could not send your request. Please try again or call the clinic.', 'error');
            }
          }
        } catch (error) {
          // Retry with no-cors as a final fallback
          try {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            setStatus('Thank you. Your request was sent.', 'success');
            form.reset();
          } catch (err) {
            setStatus('Network error. Please try again or call the clinic.', 'error');
          }
        } finally {
          setSendingState(false);
        }
      });
    });
  };

  attachContactForms();

  const newPatientForm = document.querySelector('[data-new-patient-form]');
  if (newPatientForm) {
    const newPatientStatus = newPatientForm.querySelector('.form-status');
    const newPatientSubmit = newPatientForm.querySelector('button[type="submit"]');

    const setNewPatientStatus = (message, state) => {
      if (!newPatientStatus) return;
      newPatientStatus.textContent = message;
      newPatientStatus.classList.remove('success', 'error', 'pending');
      if (state) newPatientStatus.classList.add(state);
    };

    const setNewPatientSending = (sending) => {
      if (!newPatientSubmit) return;
      if (sending) {
        newPatientSubmit.dataset.originalText = newPatientSubmit.textContent;
        newPatientSubmit.textContent = 'Sending...';
        newPatientSubmit.disabled = true;
      } else {
        newPatientSubmit.textContent = newPatientSubmit.dataset.originalText || newPatientSubmit.textContent;
        newPatientSubmit.disabled = false;
      }
    };

    newPatientForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(newPatientForm);
      const payload = {
        firstName: (formData.get('firstName') || '').trim(),
        lastName: (formData.get('lastName') || '').trim(),
        phone: (formData.get('phone') || '').trim(),
        email: (formData.get('email') || '').trim(),
        provider: (formData.get('provider') || '').trim(),
        appointmentType: (formData.get('appointmentType') || '').trim(),
        insurance: (formData.get('insurance') || '').trim(),
        concern: (formData.get('concern') || '').trim(),
        location: (formData.get('location') || '').trim(),
        heardAbout: (formData.get('heardAbout') || '').trim(),
      };

      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.phone ||
        !payload.email ||
        !payload.provider ||
        !payload.appointmentType ||
        !payload.insurance ||
        !payload.concern ||
        !payload.location ||
        !payload.heardAbout
      ) {
        setNewPatientStatus('Please complete all required fields.', 'error');
        return;
      }

      const outbound = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.email,
        phone: payload.phone,
        message: payload.concern,
        formType: (formData.get('formType') || 'new_patient').toString(),
        ...payload,
      };

      setNewPatientStatus('Sending...', 'pending');
      setNewPatientSending(true);

      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
        });

        if (response.type === 'opaque') {
          setNewPatientStatus('Thank you. Your request was sent.', 'success');
          newPatientForm.reset();
        } else {
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok !== false) {
            setNewPatientStatus('Thank you. Your request was sent.', 'success');
            newPatientForm.reset();
          } else {
            setNewPatientStatus('We could not send your request. Please try again or call the clinic.', 'error');
          }
        }
      } catch (error) {
        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outbound),
          });
          setNewPatientStatus('Thank you. Your request was sent.', 'success');
          newPatientForm.reset();
        } catch (err) {
          setNewPatientStatus('Network error. Please try again or call the clinic.', 'error');
        }
      } finally {
        setNewPatientSending(false);
      }
    });
  }

  const cancelForm = document.querySelector('[data-cancel-form]');
  if (cancelForm) {
    const cancelStatus = cancelForm.querySelector('.form-status');
    const cancelSubmit = cancelForm.querySelector('button[type="submit"]');

    const setCancelStatus = (message, state) => {
      if (!cancelStatus) return;
      cancelStatus.textContent = message;
      cancelStatus.classList.remove('success', 'error', 'pending');
      if (state) cancelStatus.classList.add(state);
    };

    const setCancelSending = (sending) => {
      if (!cancelSubmit) return;
      if (sending) {
        cancelSubmit.dataset.originalText = cancelSubmit.textContent;
        cancelSubmit.textContent = 'Sending...';
        cancelSubmit.disabled = true;
      } else {
        cancelSubmit.textContent = cancelSubmit.dataset.originalText || cancelSubmit.textContent;
        cancelSubmit.disabled = false;
      }
    };

    cancelForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(cancelForm);
      const payload = {
        firstName: (formData.get('firstName') || '').trim(),
        lastName: (formData.get('lastName') || '').trim(),
        dob: (formData.get('dob') || '').trim(),
        phone: (formData.get('phone') || '').trim(),
        provider: (formData.get('provider') || '').trim(),
        appointmentDate: (formData.get('appointmentDate') || '').trim(),
        appointmentTime: (formData.get('appointmentTime') || '').trim(),
        appointmentType: (formData.get('appointmentType') || '').trim(),
        location: (formData.get('location') || '').trim(),
        reason: (formData.get('reason') || '').trim(),
      };

      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.dob ||
        !payload.phone ||
        !payload.provider ||
        !payload.appointmentDate ||
        !payload.appointmentTime ||
        !payload.appointmentType ||
        !payload.location ||
        !payload.reason
      ) {
        setCancelStatus('Please complete all required fields.', 'error');
        return;
      }

      const outbound = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: '',
        phone: payload.phone,
        message: payload.reason,
        formType: (formData.get('formType') || 'cancel_appointment').toString(),
        ...payload,
      };

      setCancelStatus('Sending...', 'pending');
      setCancelSending(true);

      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
        });

        if (response.type === 'opaque') {
          setCancelStatus('Thank you. Your cancellation request was sent.', 'success');
          cancelForm.reset();
        } else {
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok !== false) {
            setCancelStatus('Thank you. Your cancellation request was sent.', 'success');
            cancelForm.reset();
          } else {
            setCancelStatus('We could not send your request. Please call the clinic.', 'error');
          }
        }
      } catch (error) {
        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outbound),
          });
          setCancelStatus('Thank you. Your cancellation request was sent.', 'success');
          cancelForm.reset();
        } catch (err) {
          setCancelStatus('Network error. Please try again or call the clinic.', 'error');
        }
      } finally {
        setCancelSending(false);
      }
    });
  }

  const refillForm = document.querySelector('[data-refill-form]');
  if (refillForm) {
    const refillStatus = refillForm.querySelector('.form-status');
    const refillSubmit = refillForm.querySelector('button[type="submit"]');

    const setRefillStatus = (message, state) => {
      if (!refillStatus) return;
      refillStatus.textContent = message;
      refillStatus.classList.remove('success', 'error', 'pending');
      if (state) refillStatus.classList.add(state);
    };

    const setRefillSending = (sending) => {
      if (!refillSubmit) return;
      if (sending) {
        refillSubmit.dataset.originalText = refillSubmit.textContent;
        refillSubmit.textContent = 'Sending...';
        refillSubmit.disabled = true;
      } else {
        refillSubmit.textContent = refillSubmit.dataset.originalText || refillSubmit.textContent;
        refillSubmit.disabled = false;
      }
    };

    refillForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(refillForm);
      const payload = {
        firstName: (formData.get('firstName') || '').trim(),
        lastName: (formData.get('lastName') || '').trim(),
        dob: (formData.get('dob') || '').trim(),
        phone: (formData.get('phone') || '').trim(),
        provider: (formData.get('provider') || '').trim(),
        medication: (formData.get('medication') || '').trim(),
        dosage: (formData.get('dosage') || '').trim(),
        pharmacyName: (formData.get('pharmacyName') || '').trim(),
        pharmacyPhone: (formData.get('pharmacyPhone') || '').trim(),
        concern: (formData.get('concern') || '').trim(),
      };

      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.dob ||
        !payload.phone ||
        !payload.provider ||
        !payload.medication ||
        !payload.dosage ||
        !payload.pharmacyName ||
        !payload.pharmacyPhone ||
        !payload.concern
      ) {
        setRefillStatus('Please complete all required fields.', 'error');
        return;
      }

      const outbound = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: '',
        phone: payload.phone,
        message: payload.concern,
        formType: (formData.get('formType') || 'refill_request').toString(),
        ...payload,
      };

      setRefillStatus('Sending...', 'pending');
      setRefillSending(true);

      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
        });

        if (response.type === 'opaque') {
          setRefillStatus('Thank you. Your refill request was sent.', 'success');
          refillForm.reset();
        } else {
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok !== false) {
            setRefillStatus('Thank you. Your refill request was sent.', 'success');
            refillForm.reset();
          } else {
            setRefillStatus('We could not send your request. Please call the clinic.', 'error');
          }
        }
      } catch (error) {
        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outbound),
          });
          setRefillStatus('Thank you. Your refill request was sent.', 'success');
          refillForm.reset();
        } catch (err) {
          setRefillStatus('Network error. Please try again or call the clinic.', 'error');
        }
      } finally {
        setRefillSending(false);
      }
    });
  }

  const billingForm = document.querySelector('[data-billing-form]');
  if (billingForm) {
    const billingStatus = billingForm.querySelector('.form-status');
    const billingSubmit = billingForm.querySelector('button[type="submit"]');

    const setBillingStatus = (message, state) => {
      if (!billingStatus) return;
      billingStatus.textContent = message;
      billingStatus.classList.remove('success', 'error', 'pending');
      if (state) billingStatus.classList.add(state);
    };

    const setBillingSending = (sending) => {
      if (!billingSubmit) return;
      if (sending) {
        billingSubmit.dataset.originalText = billingSubmit.textContent;
        billingSubmit.textContent = 'Sending...';
        billingSubmit.disabled = true;
      } else {
        billingSubmit.textContent = billingSubmit.dataset.originalText || billingSubmit.textContent;
        billingSubmit.disabled = false;
      }
    };

    billingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(billingForm);
      const payload = {
        firstName: (formData.get('firstName') || '').trim(),
        lastName: (formData.get('lastName') || '').trim(),
        dob: (formData.get('dob') || '').trim(),
        phone: (formData.get('phone') || '').trim(),
        concern: (formData.get('concern') || '').trim(),
      };

      if (!payload.firstName || !payload.lastName || !payload.dob || !payload.phone || !payload.concern) {
        setBillingStatus('Please complete all required fields.', 'error');
        return;
      }

      const outbound = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: '',
        phone: payload.phone,
        message: payload.concern,
        formType: (formData.get('formType') || 'billing_questions').toString(),
        ...payload,
      };

      setBillingStatus('Sending...', 'pending');
      setBillingSending(true);

      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
        });

        if (response.type === 'opaque') {
          setBillingStatus('Thank you. Your billing question was sent.', 'success');
          billingForm.reset();
        } else {
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok !== false) {
            setBillingStatus('Thank you. Your billing question was sent.', 'success');
            billingForm.reset();
          } else {
            setBillingStatus('We could not send your request. Please call the clinic.', 'error');
          }
        }
      } catch (error) {
        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outbound),
          });
          setBillingStatus('Thank you. Your billing question was sent.', 'success');
          billingForm.reset();
        } catch (err) {
          setBillingStatus('Network error. Please try again or call the clinic.', 'error');
        }
      } finally {
        setBillingSending(false);
      }
    });
  }

  // Chatbox toggle and dummy submit
  const chatToggle = document.querySelector('.chat-toggle');
  const chatbox = document.getElementById('chatbox');
  const chatClose = document.querySelector('.chatbox-close');
  const chatForm = document.querySelector('[data-chat-form]');
  const chatStatus = chatForm ? chatForm.querySelector('.chatbox-status') : null;
  const chatSubmitBtn = chatForm ? chatForm.querySelector('button[type="submit"]') : null;

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
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(chatForm);
      const name = (formData.get('name') || '').trim();
      const email = (formData.get('email') || '').trim();
      const phone = (formData.get('phone') || '').trim();
      const message = (formData.get('message') || '').trim();

      if (!name || !email || !message) {
        if (chatStatus) chatStatus.textContent = 'Please add your name, email, and message.';
        return;
      }

      const setChatStatus = (text) => {
        if (chatStatus) chatStatus.textContent = text;
      };

      const setChatSending = (sending) => {
        if (!chatSubmitBtn) return;
        if (sending) {
          chatSubmitBtn.dataset.originalText = chatSubmitBtn.textContent;
          chatSubmitBtn.textContent = 'Sending...';
          chatSubmitBtn.disabled = true;
        } else {
          chatSubmitBtn.textContent = chatSubmitBtn.dataset.originalText || chatSubmitBtn.textContent;
          chatSubmitBtn.disabled = false;
        }
      };

      setChatStatus('Sending...');
      setChatSending(true);

      const payload = { name, email, phone, message, source: 'chat' };

      const sendRequest = async (mode) => {
        return fetch(SCRIPT_URL, {
          method: 'POST',
          mode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      };

      (async () => {
        try {
          const response = await sendRequest('cors');
          if (response.type === 'opaque') {
            setChatStatus('Thanks! We received your message and will respond soon.');
            chatForm.reset();
            return;
          }
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok !== false) {
            setChatStatus('Thanks! We received your message and will respond soon.');
            chatForm.reset();
          } else {
            setChatStatus('Unable to send right now. Please call the clinic.');
          }
        } catch (err) {
          try {
            await sendRequest('no-cors');
            setChatStatus('Thanks! We received your message and will respond soon.');
            chatForm.reset();
          } catch (e2) {
            setChatStatus('Network error. Please call the clinic.');
          }
        } finally {
          setChatSending(false);
        }
      })();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatbox && chatbox.classList.contains('open')) {
      setChatOpen(false);
    }
  });
});
