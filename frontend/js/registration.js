/**
 * منطق الصفحة الرئيسية والتسجيل
 * 1) شاشة العنوان الكبير + مستطيل "تسجيل"
 * 2) بعد الضغط تظهر واجهة التسجيل
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const alertBox = document.getElementById('form-alert');
  const closedBox = document.getElementById('closed-state');
  const panel = document.getElementById('register-panel');
  const landingScreen = document.getElementById('landing-screen');
  const registerView = document.getElementById('register-view');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const backToLandingBtn = document.getElementById('back-to-landing-btn');
  const closedMessageEl = document.getElementById('closed-message');
  const submitBtn = document.getElementById('submit-btn');
  const fullNameInput = document.getElementById('full_name');
  const nameHintEl = document.getElementById('name-hint');

  let registrationOpen = true;

  initPage();
  updateNameHint();

  fullNameInput?.addEventListener('input', updateNameHint);

  openRegisterBtn?.addEventListener('click', () => {
    showRegisterView();
  });

  backToLandingBtn?.addEventListener('click', () => {
    showLandingView();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert(alertBox);

    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get('full_name') || '').trim().replace(/\s+/g, ' '),
      phone: String(formData.get('phone') || '').trim(),
      is_team_leader: formData.get('is_team_leader') === 'yes',
      sport: String(formData.get('sport') || ''),
    };

    const nameCheck = ArabicNameValidator.validateArabicPersonName(payload.full_name);
    if (!nameCheck.valid) {
      showAlert(alertBox, nameCheck.message, 'error');
      updateNameHint();
      fullNameInput?.focus();
      return;
    }
    payload.full_name = nameCheck.value;

    if (!payload.phone) {
      showAlert(alertBox, 'رقم الهاتف مطلوب', 'error');
      return;
    }

    if (!payload.sport) {
      showAlert(alertBox, 'اختر الرياضة', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ التسجيل...';

    try {
      await apiRequest('/players', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      form.reset();
      updateNameHint();
      showAlert(alertBox, 'لقد تم التسجيل بنجاح', 'success');
    } catch (error) {
      const message =
        error.status === 409
          ? 'هذا الاسم مسجّل مسبقاً — لا يمكن تكراره'
          : error.message;
      showAlert(alertBox, message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تأكيد التسجيل';
    }
  });

  function updateNameHint() {
    if (!nameHintEl) return;

    const raw = String(fullNameInput?.value || '');
    nameHintEl.classList.remove('is-ok', 'is-error');

    if (!raw.trim()) {
      nameHintEl.textContent = 'اكتب الاسم الكامل من خمسة أسماء عربية';
      return;
    }

    const result = ArabicNameValidator.validateArabicPersonName(raw);
    if (result.valid) {
      nameHintEl.textContent = 'الاسم صحيح';
      nameHintEl.classList.add('is-ok');
      return;
    }

    nameHintEl.textContent = result.message;
    nameHintEl.classList.add('is-error');
  }

  function showRegisterView() {
    landingScreen?.classList.add('is-hidden');
    if (registerView) registerView.hidden = false;

    if (!registrationOpen) {
      if (panel) panel.hidden = true;
      if (closedBox) closedBox.hidden = false;
    } else {
      if (panel) panel.hidden = false;
      if (closedBox) closedBox.hidden = true;
      fullNameInput?.focus();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showLandingView() {
    landingScreen?.classList.remove('is-hidden');
    if (registerView) registerView.hidden = true;
    hideAlert(alertBox);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function initPage() {
    try {
      const result = await apiRequest('/settings/public');
      const data = result.data;
      registrationOpen = Boolean(data.registration_open);

      if (closedMessageEl && data.registration_closed_message) {
        closedMessageEl.textContent = data.registration_closed_message;
      }
    } catch (error) {
      console.warn('تعذر تحميل الإعدادات', error);
    }
  }
});
