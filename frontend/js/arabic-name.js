/**
 * Shared Arabic person-name validator (browser + Node).
 * Rejects English, digits, symbols, jokes, and placeholder names
 * before any database insert.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArabicNameValidator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const INVALID_MESSAGE = 'يرجى كتابة اسم عربي حقيقي';
  const MIN_LETTERS = 3;
  const MAX_LENGTH = 50;
  const MIN_WORDS = 2;
  const MAX_WORDS = 6;

  // Letters only: ء to ي, excluding tatweel and Arabic digits
  const ARABIC_LETTERS = '\u0621-\u063A\u0641-\u064A';
  const NAME_PATTERN = new RegExp('^[' + ARABIC_LETTERS + '\\s]+$');
  const LETTER_PATTERN = new RegExp('[' + ARABIC_LETTERS + ']', 'g');

  const ALLOWED_PARTICLES = {
    بن: true,
    بنت: true,
    ابن: true,
    آل: true,
    ال: true,
  };

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
    ادمنيستريتور: true,
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

  function letterCount(value) {
    const matches = value.match(LETTER_PATTERN);
    return matches ? matches.length : 0;
  }

  function hasRepeatedChars(value) {
    return /(.)\1{2,}/.test(value.replace(/ /g, ''));
  }

  function looksRandom(words) {
    return words.some((word) => {
      if (ALLOWED_PARTICLES[word]) {
        return false;
      }
      const unique = new Set(word.split('')).size;
      return word.length >= 6 && unique <= 2;
    });
  }

  function validateArabicPersonName(rawValue) {
    const value = sanitizeName(rawValue);

    if (!value) {
      return { valid: false, message: INVALID_MESSAGE, value: '' };
    }

    if (/[A-Za-z0-9]/.test(value) || !NAME_PATTERN.test(value)) {
      return { valid: false, message: INVALID_MESSAGE, value };
    }

    if (letterCount(value) < MIN_LETTERS || value.length > MAX_LENGTH) {
      return { valid: false, message: INVALID_MESSAGE, value };
    }

    const words = value.split(' ').filter(Boolean);
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) {
      return { valid: false, message: INVALID_MESSAGE, value };
    }

    if (hasRepeatedChars(value) || looksRandom(words)) {
      return { valid: false, message: INVALID_MESSAGE, value };
    }

    const compact = value.replace(/ /g, '');
    if (BLOCKED_NAMES[compact]) {
      return { valid: false, message: INVALID_MESSAGE, value };
    }

    for (const word of words) {
      if (BLOCKED_NAMES[word]) {
        return { valid: false, message: INVALID_MESSAGE, value };
      }
      if (!ALLOWED_PARTICLES[word] && word.length < 2) {
        return { valid: false, message: INVALID_MESSAGE, value };
      }
    }

    return { valid: true, message: '', value };
  }

  return {
    INVALID_MESSAGE,
    validateArabicPersonName,
    sanitizeName,
  };
});
