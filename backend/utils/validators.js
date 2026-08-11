/**
 * دوال التحقق من المدخلات — قابلة لإعادة الاستخدام
 * اسم اللاعب يُفحص هنا أيضاً حتى لا يعتمد الخادم على الواجهة فقط
 */

const {
  validateArabicPersonName,
} = require('../../frontend/js/arabic-name');

/** القيم المسموحة للرياضة */
const ALLOWED_SPORTS = ['football', 'volleyball', 'both'];

/**
 * تنظيف النص من المسافات الزائدة
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Player names must be real Arabic names. This runs on the server so
 * invalid values cannot reach PostgreSQL even if the UI is bypassed.
 */
function validateFullName(fullName) {
  return validateArabicPersonName(fullName);
}

/**
 * التحقق من رقم الهاتف (صيغة خليجية/عامة مرنة)
 * @param {unknown} phone
 * @returns {{ valid: boolean, message?: string, value?: string }}
 */
function validatePhone(phone) {
  const value = sanitizeText(phone).replace(/[\s\-()]/g, '');

  if (!value) {
    return { valid: false, message: 'رقم الهاتف مطلوب' };
  }

  // يقبل أرقاماً اختيارية بـ + وطول منطقي
  if (!/^\+?\d{8,15}$/.test(value)) {
    return {
      valid: false,
      message: 'رقم الهاتف غير صالح',
    };
  }

  return { valid: true, value };
}

/**
 * التحقق من حالة قائد الفريق
 * @param {unknown} isTeamLeader
 * @returns {{ valid: boolean, message?: string, value?: number }}
 */
function validateTeamLeader(isTeamLeader) {
  if (typeof isTeamLeader === 'boolean') {
    return { valid: true, value: isTeamLeader ? 1 : 0 };
  }

  if (isTeamLeader === 1 || isTeamLeader === '1' || isTeamLeader === 'yes' || isTeamLeader === 'true') {
    return { valid: true, value: 1 };
  }

  if (isTeamLeader === 0 || isTeamLeader === '0' || isTeamLeader === 'no' || isTeamLeader === 'false') {
    return { valid: true, value: 0 };
  }

  return {
    valid: false,
    message: 'حقل قائد الفريق يجب أن يكون نعم أو لا',
  };
}

/**
 * التحقق من اختيار الرياضة
 * @param {unknown} sport
 * @returns {{ valid: boolean, message?: string, value?: string }}
 */
function validateSport(sport) {
  const value = sanitizeText(sport).toLowerCase();

  if (!ALLOWED_SPORTS.includes(value)) {
    return {
      valid: false,
      message: 'الرياضة يجب أن تكون: football أو volleyball أو both',
    };
  }

  return { valid: true, value };
}

/**
 * التحقق من اسم مستخدم الأدمن
 * @param {unknown} username
 * @returns {{ valid: boolean, message?: string, value?: string }}
 */
function validateUsername(username) {
  const value = sanitizeText(username);

  if (!value) {
    return { valid: false, message: 'اسم المستخدم مطلوب' };
  }

  if (value.length < 3 || value.length > 60) {
    return {
      valid: false,
      message: 'اسم المستخدم غير صالح',
    };
  }

  return { valid: true, value };
}

/**
 * التحقق من كلمة المرور
 * @param {unknown} password
 * @returns {{ valid: boolean, message?: string, value?: string }}
 */
function validatePassword(password) {
  if (typeof password !== 'string' || !password) {
    return { valid: false, message: 'كلمة المرور مطلوبة' };
  }

  if (password.length < 6) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    };
  }

  return { valid: true, value: password };
}

/**
 * التحقق الكامل من بيانات اللاعب
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[], data?: object }}
 */
function validatePlayerPayload(body) {
  const errors = [];
  const data = {};

  const nameResult = validateFullName(body?.full_name ?? body?.fullName);
  if (!nameResult.valid) {
    errors.push(nameResult.message);
  } else {
    data.full_name = nameResult.value;
  }

  const phoneResult = validatePhone(body?.phone);
  if (!phoneResult.valid) {
    errors.push(phoneResult.message);
  } else {
    data.phone = phoneResult.value;
  }

  const leaderResult = validateTeamLeader(
    body?.is_team_leader ?? body?.isTeamLeader
  );
  if (!leaderResult.valid) {
    errors.push(leaderResult.message);
  } else {
    data.is_team_leader = leaderResult.value;
  }

  const sportResult = validateSport(body?.sport);
  if (!sportResult.valid) {
    errors.push(sportResult.message);
  } else {
    data.sport = sportResult.value;
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

module.exports = {
  ALLOWED_SPORTS,
  sanitizeText,
  validateFullName,
  validatePhone,
  validateTeamLeader,
  validateSport,
  validateUsername,
  validatePassword,
  validatePlayerPayload,
};
