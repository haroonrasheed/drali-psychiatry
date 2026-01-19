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
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('active');
      const isExpanded = nav.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', String(isExpanded));
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
});
