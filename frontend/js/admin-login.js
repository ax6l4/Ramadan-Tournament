/**
 * تسجيل دخول الأدمن باسم المستخدم وكلمة المرور
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-btn');

  // إن كانت الجلسة موجودة مسبقاً انتقل للوحة التحكم
  if (getAdminToken()) {
    window.location.href = './dashboard.html';
    return;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert(alertBox);

    const formData = new FormData(form);
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');

    if (!username || !password) {
      showAlert(alertBox, 'أدخل اسم المستخدم وكلمة المرور', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ التحقق...';

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      setAdminToken(result.data.token);
      localStorage.setItem(
        'admin_email',
        result.data.admin.username || result.data.admin.email
      );
      window.location.href = './dashboard.html';
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'دخول';
    }
  });
});
