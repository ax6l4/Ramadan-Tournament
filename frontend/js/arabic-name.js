/**
 * Shared Arabic person-name validator (browser + Node).
 * Requires exactly five Arabic words so fake or partial names never
 * reach PostgreSQL.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArabicNameValidator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MSG_ENGLISH = 'يسمح بإدخال الأحرف العربية فقط';
  const MSG_FIVE_NAMES = 'يجب كتابة الاسم الكامل من خمسة أسماء';
  const MSG_INVALID = 'الرجاء إدخال اسم حقيقي صحيح';

  const REQUIRED_WORDS = 5;
  const MIN_WORD_LENGTH = 2;
  const MAX_LENGTH = 60;

  const ARABIC_LETTERS = '\u0621-\u063A\u0641-\u064A';
  const NAME_PATTERN = new RegExp('^[' + ARABIC_LETTERS + '\\s]+$');
  const WORD_PATTERN = new RegExp('^[' + ARABIC_LETTERS + ']{' + MIN_WORD_LENGTH + ',}$');

  const BLOCKED_NAMES = {
    تست: true,
    تيست: true,
    ادمن: true,
    أدمين: true,
    يوزر: true,
    اسم: true,
    فلان: true,
    علان: true,
    مجهول: true,
    لاعب: true,
    تجربة: true,
    ابجد: true,
    كلب: true,
    حمار: true,
    غبي: true,
    احمق: true,
    حقير: true,
    قذر: true,
    مستخدم: true,
  };

  function sanitizeName(value) {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u0640\u064B-\u0652]/g, '');
  }

  function hasRepeatedChars(value) {
    return /(.)\1{2,}/.test(value.replace(/ /g, ''));
  }

  function validateArabicPersonName(rawValue) {
    const value = sanitizeName(rawValue);

    if (!value) {
      return { valid: false, message: MSG_INVALID, value: '' };
    }

    if (/[A-Za-z]/.test(value)) {
      return { valid: false, message: MSG_ENGLISH, value };
    }

    if (/[0-9\u0660-\u0669]/.test(value) || !NAME_PATTERN.test(value)) {
      return { valid: false, message: MSG_ENGLISH, value };
    }

    const words = value.split(' ').filter(Boolean);
    if (words.length !== REQUIRED_WORDS) {
      return { valid: false, message: MSG_FIVE_NAMES, value };
    }

    if (value.length > MAX_LENGTH) {
      return { valid: false, message: MSG_INVALID, value };
    }

    if (hasRepeatedChars(value)) {
      return { valid: false, message: MSG_INVALID, value };
    }

    for (const word of words) {
      if (!WORD_PATTERN.test(word) || BLOCKED_NAMES[word]) {
        return { valid: false, message: MSG_INVALID, value };
      }
    }

    return { valid: true, message: '', value };
  }

  return {
    MSG_ENGLISH,
    MSG_FIVE_NAMES,
    MSG_INVALID,
    validateArabicPersonName,
    sanitizeName,
  };
});
