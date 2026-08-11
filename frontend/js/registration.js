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
  const nameCountEl = document.getElementById('name-count');
  const nameHintEl = document.getElementById('name-hint');

  let registrationOpen = true;

  initPage();
  updateNameMeter();

  fullNameInput?.addEventListener('input', updateNameMeter);

  // فتح واجهة التسجيل من المستطيل
  openRegisterBtn?.addEventListener('click', () => {
    showRegisterView();
  });

  // العودة للشاشة الأولى
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

    const nameParts = payload.full_name.split(/\s+/).filter(Boolean);

    if (/[A-Za-z]/.test(payload.full_name)) {
      showAlert(
        alertBox,
        'الاسم يجب أن يكون باللغة العربية فقط — غير مسموح بالإنجليزية',
        'error'
      );
      fullNameInput?.focus();
      return;
    }

    if (nameParts.length !== 5) {
      showAlert(
        alertBox,
        'يجب إدخال خمسة أسماء بالضبط (مثال: عبدالرحمن فهد سالم علي الزيدي)',
        'error'
      );
      fullNameInput?.focus();
      return;
    }

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
      updateNameMeter();
      showAlert(alertBox, 'لقد تم التسجيل بنجاح', 'success');
    } catch (error) {
      const message =
        error.status === 409
          ? 'هذا الاسم الخماسي مسجّل مسبقاً — لا يمكن تكراره'
          : error.message;
      showAlert(alertBox, message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تأكيد التسجيل';
    }
  });

  /**
   * إظهار واجهة التسجيل وإخفاء الشاشة الأولى
   */
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

  /**
   * العودة للعنوان الكبير ومستطيل التسجيل
   */
  function showLandingView() {
    landingScreen?.classList.remove('is-hidden');
    if (registerView) registerView.hidden = true;
    hideAlert(alertBox);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNameMeter() {
    const value = String(fullNameInput?.value || '')
      .trim()
      .replace(/\s+/g, ' ');
    const count = value ? value.split(' ').filter(Boolean).length : 0;

    if (nameCountEl) {
      nameCountEl.textContent = `${count} / 5`;
    }

    if (!nameHintEl) return;

    nameHintEl.classList.remove('is-ok', 'is-error');

    if (count === 0) {
      nameHintEl.textContent =
        'خمسة أسماء عربية بالضبط — غير مسموح بالإنجليزية';
      return;
    }

    if (count === 5) {
      nameHintEl.textContent = 'عدد الأسماء صحيح';
      nameHintEl.classList.add('is-ok');
      return;
    }

    nameHintEl.textContent =
      count < 5
        ? `باقي ${5 - count} للوصول إلى خمسة أسماء`
        : 'الاسم أكثر من خمسة — احذف الزائد';
    nameHintEl.classList.add('is-error');
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
      // نسمح بعرض الصفحة؛ الخطأ يظهر عند محاولة التسجيل
      console.warn('تعذر تحميل الإعدادات', error);
    }
  }
});
