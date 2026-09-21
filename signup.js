(() => {
  'use strict';

  /* =========================================================
     State
     ========================================================= */
  const state = {
    method: 'email',
    email: '',
    phone: '',
    password: '',
    agreeTerms: false,
    otpAttempts: 0,
    otpLockedUntil: 0,
    fullName: '',
    dobMonth: '', dobDay: '', dobYear: '',
    pronouns: '',
    pronounsCustom: '',
    stateName: '',
    city: '',
    interests: [],
    photoDataUrl: null,
    currentStep: 1,
  };

  const MAX_INTERESTS = 5;

  const STATE_CITY_DATA = {
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'],
    'New York': ['New York City', 'Buffalo', 'Albany', 'Rochester'],
    'Texas': ['Austin', 'Houston', 'Dallas', 'San Antonio'],
    'Illinois': ['Chicago', 'Springfield', 'Naperville'],
    'Colorado': ['Denver', 'Boulder', 'Colorado Springs'],
    'Washington': ['Seattle', 'Spokane', 'Tacoma'],
    'Georgia': ['Atlanta', 'Savannah', 'Athens'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  };

  const INTERESTS = ['Music', 'Fitness', 'Food', 'Gaming', 'Outdoors', 'Art', 'Books', 'Nightlife', 'Travel', 'Sports'];

  /* =========================================================
     Helpers
     ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setFieldError(fieldEl, hasError, message) {
    if (!fieldEl) return;
    fieldEl.classList.toggle('has-error', hasError);
    fieldEl.classList.toggle('has-success', !hasError && fieldEl.dataset.trackSuccess === 'true');
    if (hasError && message) {
      const msgEl = fieldEl.querySelector('.error-text .msg');
      if (msgEl) msgEl.textContent = message;
    }
  }

  function toast(message, type = 'info', duration = 3800) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ';
    el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  function simulateRequest({ minMs = 900, maxMs = 1400 } = {}) {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  function setButtonLoading(btn, isLoading) {
    btn.classList.toggle('is-loading', isLoading);
    btn.disabled = isLoading;
  }

  function trimmed(v) { return (v || '').trim(); }
  function isWhitespaceOnly(v) { return v.length > 0 && trimmed(v).length === 0; }

  /* =========================================================
     Stepper / panel navigation
     ========================================================= */
  function renderStepper() {
    $$('.step-node', $('#stepper')).forEach((node) => {
      const n = Number(node.dataset.step);
      node.classList.toggle('is-active', n === state.currentStep);
      node.classList.toggle('is-done', n < state.currentStep);
      const circleSpan = node.querySelector('.step-circle span');
      if (circleSpan) circleSpan.textContent = n;
    });
  }

  function goToStep(step) {
    state.currentStep = step;
    $$('.step-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel == step);
    });
    renderStepper();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToSuccess() {
    $$('.step-node', $('#stepper')).forEach((node) => node.classList.add('is-done'));
    $$('.step-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === 'success'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* =========================================================
     STEP 1 — Account
     ========================================================= */
  function initStep1() {
    const emailField = $('#field-email');
    const phoneField = $('#field-phone');
    const passwordField = $('#field-password');
    const emailInput = $('#email');
    const phoneInput = $('#phone');
    const passwordInput = $('#password');
    const strengthBar = $('#strengthBar');
    const strengthLabel = $('#strengthLabel');

    // Method tabs
    $$('.method-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.method-tabs button').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.method = btn.dataset.method;
        emailField.style.display = state.method === 'email' ? '' : 'none';
        phoneField.style.display = state.method === 'phone' ? '' : 'none';
        setFieldError(emailField, false);
        setFieldError(phoneField, false);
      });
    });

    function validateEmail(showError) {
      const val = trimmed(emailInput.value);
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const ok = re.test(val);
      if (showError) setFieldError(emailField, !ok, ok ? '' : (val === '' ? 'Email address is required.' : 'Enter a valid email address.'));
      return ok;
    }

    function formatPhoneDisplay(digits) {
      const d = digits.slice(0, 10);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    }

    phoneInput.addEventListener('input', () => {
      const digits = phoneInput.value.replace(/\D/g, '');
      phoneInput.value = formatPhoneDisplay(digits);
    });

    function validatePhone(showError) {
      const digits = phoneInput.value.replace(/\D/g, '');
      const ok = digits.length === 10;
      if (showError) setFieldError(phoneField, !ok, digits.length === 0 ? 'Phone number is required.' : 'Enter a valid 10-digit phone number.');
      return ok;
    }

    function scorePassword(pw) {
      let score = 0;
      if (pw.length >= 8) score++;
      if (/\d/.test(pw)) score++;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      return score; // 0-4
    }

    passwordInput.addEventListener('input', () => {
      const pw = passwordInput.value;
      const score = scorePassword(pw);
      const bars = $$('i', strengthBar);
      bars.forEach((b) => (b.className = ''));
      let label = 'Use 8+ characters with a number';
      if (pw.length > 0) {
        if (score <= 1) { bars[0].classList.add('on-weak'); label = 'Weak password'; }
        else if (score === 2) { bars[0].classList.add('on-fair'); bars[1].classList.add('on-fair'); label = 'Fair password'; }
        else { bars.forEach((b) => b.classList.add('on-strong')); label = 'Strong password'; }
      }
      strengthLabel.textContent = label;
    });

    function validatePassword(showError) {
      const pw = passwordInput.value;
      const ok = pw.length >= 8 && /\d/.test(pw) && !isWhitespaceOnly(pw);
      if (showError) setFieldError(passwordField, !ok, pw === '' ? 'Password is required.' : 'Password must be at least 8 characters and include a number.');
      return ok;
    }

    $('#togglePassword').addEventListener('click', () => {
      const isPw = passwordInput.type === 'password';
      passwordInput.type = isPw ? 'text' : 'password';
      $('#togglePassword').textContent = isPw ? 'HIDE' : 'SHOW';
    });

    emailInput.addEventListener('blur', () => validateEmail(true));
    emailInput.addEventListener('input', () => { if (emailField.classList.contains('has-error')) validateEmail(true); });
    phoneInput.addEventListener('blur', () => validatePhone(true));
    passwordInput.addEventListener('blur', () => validatePassword(true));
    passwordInput.addEventListener('input', () => { if (passwordField.classList.contains('has-error')) validatePassword(true); });

    const agreeTerms = $('#agreeTerms');
    const termsError = $('#termsError');
    agreeTerms.addEventListener('change', () => {
      if (agreeTerms.checked) termsError.style.display = 'none';
    });

    $('#step1Continue').addEventListener('click', async () => {
      const methodOk = state.method === 'email' ? validateEmail(true) : validatePhone(true);
      const pwOk = validatePassword(true);
      const termsOk = agreeTerms.checked;
      termsError.style.display = termsOk ? 'none' : 'flex';

      if (!methodOk || !pwOk || !termsOk) {
        if (!termsOk) toast('Please accept the Terms & Conditions to continue.', 'error');
        return;
      }

      const btn = $('#step1Continue');
      setButtonLoading(btn, true);
      await simulateRequest();
      setButtonLoading(btn, false);

      const emailVal = trimmed(emailInput.value).toLowerCase();
      const phoneDigits = phoneInput.value.replace(/\D/g, '');

      // Deterministic demo failure paths
      if (state.method === 'email' && emailVal === 'taken@example.com') {
        setFieldError(emailField, true, 'This email is already registered.');
        toast('That email is already in use. Try logging in instead.', 'error');
        return;
      }
      if (state.method === 'phone' && phoneDigits === '0000000000') {
        toast("Couldn't reach the server. Check your connection and try again.", 'error');
        return;
      }

      state.email = emailVal;
      state.phone = phoneDigits;
      state.password = passwordInput.value;
      state.agreeTerms = true;

      const target = state.method === 'email' ? maskEmail(state.email) : maskPhone(state.phone);
      $('#otpTargetText').innerHTML = `Code sent to <strong>${target}</strong>`;
      resetOtp();
      startResendCooldown();
      toast('Code sent!', 'success', 2400);
      goToStep(2);
    });
  }

  function maskEmail(email) {
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const visible = user.slice(0, 2);
    return `${visible}${'•'.repeat(Math.max(user.length - 2, 2))}@${domain}`;
  }
  function maskPhone(digits) {
    return `(•••) •••-${digits.slice(6)}`;
  }

  /* =========================================================
     STEP 2 — OTP Verify
     ========================================================= */
  let resendInterval = null;

  function resetOtp() {
    const boxes = $$('#otpBoxes input');
    boxes.forEach((b) => (b.value = ''));
    $('#otpBoxes').classList.remove('has-error');
    state.otpAttempts = 0;
    boxes[0].focus();
  }

  function startResendCooldown(seconds = 30) {
    const resendBtn = $('#resendBtn');
    const timerEl = $('#resendTimer');
    resendBtn.disabled = true;
    timerEl.style.display = '';
    let remaining = seconds;
    timerEl.textContent = `(${remaining}s)`;
    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = `(${remaining}s)`;
      if (remaining <= 0) {
        clearInterval(resendInterval);
        resendBtn.disabled = false;
        timerEl.style.display = 'none';
      }
    }, 1000);
  }

  function initStep2() {
    const boxes = $$('#otpBoxes input');
    const otpBoxesEl = $('#otpBoxes');

    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        box.value = box.value.replace(/\D/g, '').slice(0, 1);
        otpBoxesEl.classList.remove('has-error');
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
        digits.forEach((d, idx) => { if (boxes[idx]) boxes[idx].value = d; });
        const next = Math.min(digits.length, boxes.length - 1);
        boxes[next].focus();
      });
    });

    $('#editTarget').addEventListener('click', () => goToStep(1));
    $('#step2Back').addEventListener('click', () => goToStep(1));

    $('#resendBtn').addEventListener('click', () => {
      resetOtp();
      startResendCooldown();
      toast('New code sent.', 'success', 2200);
    });

    $('#step2Continue').addEventListener('click', async () => {
      if (Date.now() < state.otpLockedUntil) {
        const secsLeft = Math.ceil((state.otpLockedUntil - Date.now()) / 1000);
        toast(`Too many attempts. Try again in ${secsLeft}s.`, 'error');
        return;
      }
      const code = boxes.map((b) => b.value).join('');
      if (code.length < 6) {
        otpBoxesEl.classList.add('has-error');
        toast('Enter all 6 digits.', 'error', 2400);
        return;
      }

      const btn = $('#step2Continue');
      setButtonLoading(btn, true);
      await simulateRequest({ minMs: 700, maxMs: 1100 });
      setButtonLoading(btn, false);

      if (code !== '123456') {
        state.otpAttempts++;
        otpBoxesEl.classList.add('has-error');
        boxes.forEach((b) => (b.value = ''));
        boxes[0].focus();
        if (state.otpAttempts >= 3) {
          state.otpLockedUntil = Date.now() + 15000;
          toast('Too many incorrect attempts. Try again in 15s.', 'error', 4000);
        } else {
          toast('Incorrect code. Please try again.', 'error', 2600);
        }
        return;
      }

      state.otpAttempts = 0;
      toast('Verified!', 'success', 2000);
      goToStep(3);
    });
  }

  /* =========================================================
     STEP 3 — Profile
     ========================================================= */
  function populateDobSelects() {
    const monthSel = $('#dobMonth');
    const daySel = $('#dobDay');
    const yearSel = $('#dobYear');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    months.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1; opt.textContent = m;
      monthSel.appendChild(opt);
    });
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 100; y--) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      yearSel.appendChild(opt);
    }
    function rebuildDays() {
      const prevVal = daySel.value;
      daySel.innerHTML = '<option value="">Day</option>';
      const m = Number(monthSel.value) || 0;
      const y = Number(yearSel.value) || 2000;
      const daysInMonth = m ? new Date(y, m, 0).getDate() : 31;
      for (let d = 1; d <= daysInMonth; d++) {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        daySel.appendChild(opt);
      }
      if (prevVal && Number(prevVal) <= daysInMonth) daySel.value = prevVal;
    }
    monthSel.addEventListener('change', rebuildDays);
    yearSel.addEventListener('change', rebuildDays);
    rebuildDays();
  }

  function calcAge(y, m, d) {
    const today = new Date();
    let age = today.getFullYear() - y;
    const hasHadBirthdayThisYear = (today.getMonth() + 1 > m) || (today.getMonth() + 1 === m && today.getDate() >= d);
    if (!hasHadBirthdayThisYear) age--;
    return age;
  }

  function initStep3() {
    populateDobSelects();

    const nameField = $('#field-name');
    const nameInput = $('#fullName');
    const dobField = $('#field-dob');
    const dobErrorMsg = $('#dobErrorMsg');
    const pronounsField = $('#field-pronouns');
    const pronounsSelect = $('#pronouns');
    const pronounsCustomField = $('#field-pronouns-custom');
    const pronounsCustomInput = $('#pronounsCustom');

    nameInput.addEventListener('input', () => {
      nameInput.value = nameInput.value.replace(/[^A-Za-z\s'-]/g, '').slice(0, 50);
      if (nameField.classList.contains('has-error')) validateName(true);
    });
    nameInput.addEventListener('blur', () => validateName(true));

    function validateName(showError) {
      const val = nameInput.value;
      const ok = trimmed(val).length >= 2 && !isWhitespaceOnly(val);
      if (showError) setFieldError(nameField, !ok, val === '' ? 'Your name is required.' : 'Enter your name (letters only, 2–50 characters).');
      return ok;
    }

    function validateDob(showError) {
      const m = Number($('#dobMonth').value);
      const d = Number($('#dobDay').value);
      const y = Number($('#dobYear').value);
      if (!m || !d || !y) {
        if (showError) setFieldError(dobField, true, 'Enter your full date of birth.');
        return false;
      }
      const age = calcAge(y, m, d);
      if (age < 18) {
        if (showError) { dobErrorMsg.textContent = 'You must be 18 or older to join Extroverts.'; setFieldError(dobField, true); }
        return false;
      }
      if (age > 100) {
        if (showError) { dobErrorMsg.textContent = 'Enter a valid date of birth.'; setFieldError(dobField, true); }
        return false;
      }
      if (showError) setFieldError(dobField, false);
      return true;
    }
    ['dobMonth', 'dobDay', 'dobYear'].forEach((id) => {
      $('#' + id).addEventListener('change', () => { if (dobField.classList.contains('has-error')) validateDob(true); });
    });

    pronounsSelect.addEventListener('change', () => {
      pronounsCustomField.style.display = pronounsSelect.value === 'self-describe' ? '' : 'none';
      if (pronounsField.classList.contains('has-error')) validatePronouns(true);
    });

    function validatePronouns(showError) {
      const ok = pronounsSelect.value !== '';
      if (showError) setFieldError(pronounsField, !ok);
      return ok;
    }

    $('#step3Back').addEventListener('click', () => goToStep(2));

    $('#step3Continue').addEventListener('click', async () => {
      const nameOk = validateName(true);
      const dobOk = validateDob(true);
      const pronounsOk = validatePronouns(true);

      if (!nameOk || !dobOk || !pronounsOk) {
        if (dobOk === false && Number($('#dobYear').value)) {
          const age = calcAge(Number($('#dobYear').value), Number($('#dobMonth').value), Number($('#dobDay').value));
          if (age < 18) toast('You must be 18 or older to create an account.', 'error', 4200);
        }
        return;
      }

      const btn = $('#step3Continue');
      setButtonLoading(btn, true);
      await simulateRequest({ minMs: 500, maxMs: 800 });
      setButtonLoading(btn, false);

      state.fullName = trimmed(nameInput.value);
      state.dobMonth = $('#dobMonth').value;
      state.dobDay = $('#dobDay').value;
      state.dobYear = $('#dobYear').value;
      state.pronouns = pronounsSelect.value;
      state.pronounsCustom = trimmed(pronounsCustomInput.value);

      goToStep(4);
    });
  }

  /* =========================================================
     STEP 4 — Preferences
     ========================================================= */
  function initStep4() {
    const stateSelect = $('#stateSelect');
    const citySelect = $('#citySelect');
    const stateField = $('#field-state');
    const cityField = $('#field-city');
    const chipGrid = $('#chipGrid');
    const chipCounter = $('#chipCounter');
    const interestsField = $('#field-interests');

    Object.keys(STATE_CITY_DATA).forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      stateSelect.appendChild(opt);
    });

    stateSelect.addEventListener('change', () => {
      const cities = STATE_CITY_DATA[stateSelect.value] || [];
      citySelect.innerHTML = '';
      if (!cities.length) {
        citySelect.innerHTML = '<option value="">Select state first</option>';
        citySelect.disabled = true;
      } else {
        citySelect.disabled = false;
        citySelect.innerHTML = '<option value="">Select city</option>' + cities.map((c) => `<option value="${c}">${c}</option>`).join('');
      }
      if (stateField.classList.contains('has-error')) setFieldError(stateField, stateSelect.value === '');
    });

    INTERESTS.forEach((interest) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = interest;
      chip.addEventListener('click', () => {
        const idx = state.interests.indexOf(interest);
        if (idx > -1) {
          state.interests.splice(idx, 1);
          chip.classList.remove('is-selected');
        } else {
          if (state.interests.length >= MAX_INTERESTS) {
            toast(`You can pick up to ${MAX_INTERESTS} interests.`, 'error', 2400);
            return;
          }
          state.interests.push(interest);
          chip.classList.add('is-selected');
        }
        chipCounter.textContent = `Pick 1–5 that sound like you (${state.interests.length}/${MAX_INTERESTS} selected)`;
        $$('.chip', chipGrid).forEach((c) => {
          if (!c.classList.contains('is-selected')) c.disabled = state.interests.length >= MAX_INTERESTS;
        });
        if (interestsField.classList.contains('has-error')) setFieldError(interestsField, state.interests.length === 0);
      });
      chipGrid.appendChild(chip);
    });

    const dropzone = $('#dropzone');
    const photoInput = $('#photoInput');
    const preview = $('#photoPreview');
    const dropzoneText = $('#dropzoneText');
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB.', 'error'); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        dropzone.classList.add('has-file');
        dropzoneText.textContent = file.name;
        state.photoDataUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    $('#step4Back').addEventListener('click', () => goToStep(3));

    $('#step4Continue').addEventListener('click', async () => {
      const stateOk = stateSelect.value !== '';
      const cityOk = citySelect.value !== '';
      const interestsOk = state.interests.length > 0;
      setFieldError(stateField, !stateOk);
      setFieldError(cityField, !cityOk);
      setFieldError(interestsField, !interestsOk);
      if (!stateOk || !cityOk || !interestsOk) {
        toast('Fill in the highlighted fields to continue.', 'error');
        return;
      }

      const btn = $('#step4Continue');
      setButtonLoading(btn, true);
      await simulateRequest({ minMs: 1100, maxMs: 1600 });
      setButtonLoading(btn, false);

      state.stateName = stateSelect.value;
      state.city = citySelect.value;

      finishSignup();
    });
  }

  /* =========================================================
     Success
     ========================================================= */
  function finishSignup() {
    $('#successHeadline').textContent = `You're in, ${state.fullName.split(' ')[0]}!`;
    const pronounLabel = state.pronouns === 'self-describe' ? state.pronounsCustom : state.pronouns;
    const contact = state.method === 'email' ? state.email : `+1 ${state.phone}`;
    $('#profileSummary').innerHTML = `
      <div class="row"><span>Name</span><span>${state.fullName}</span></div>
      <div class="row"><span>Contact</span><span>${contact}</span></div>
      <div class="row"><span>Pronouns</span><span>${pronounLabel || '—'}</span></div>
      <div class="row"><span>Location</span><span>${state.city}, ${state.stateName}</span></div>
      <div class="row"><span>Interests</span><span>${state.interests.join(', ')}</span></div>
    `;
    goToSuccess();
  }

  /* =========================================================
     Init
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initStep1();
    initStep2();
    initStep3();
    initStep4();
  });
})();
