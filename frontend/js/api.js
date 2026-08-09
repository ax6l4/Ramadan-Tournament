/**
 * طبقة التواصل مع واجهة API
 * قابلة لإعادة الاستخدام في كل صفحات الواجهة
 */

const API_BASE = '/api';

/**
 * طلب HTTP موحّد مع معالجة الأخطاء
 * @param {string} path
 * @param {object} options
 */
async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      (Array.isArray(payload?.errors) ? payload.errors.join(' — ') : null) ||
      'حدث خطأ أثناء الاتصال بالخادم';
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

/**
 * قراءة توكن الأدمن من التخزين المحلي
 */
function getAdminToken() {
  return localStorage.getItem('admin_token');
}

/**
 * حفظ توكن الأدمن
 */
function setAdminToken(token) {
  localStorage.setItem('admin_token', token);
}

/**
 * حذف جلسة الأدمن
 */
function clearAdminSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_email');
}

/**
 * رؤوس المصادقة للأدمن
 */
function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * عرض/إخفاء رسالة تنبيه داخل عنصر محدد
 */
function showAlert(element, message, type = 'info') {
  if (!element) return;
  element.textContent = message;
  element.className = `alert alert--${type} is-visible`;
}

function hideAlert(element) {
  if (!element) return;
  element.textContent = '';
  element.className = 'alert';
}
