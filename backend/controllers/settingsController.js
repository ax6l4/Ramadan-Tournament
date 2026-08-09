/**
 * منطق إعدادات الموقع
 */

const {
  getPublicSettingsRows,
  getAllSettings,
  upsertSetting,
} = require('../db/database');
const { sanitizeText } = require('../utils/validators');

const EDITABLE_SETTINGS = [
  'registration_open',
  'registration_closed_message',
  'site_title',
];

async function getPublicSettings(req, res, next) {
  try {
    const rows = await getPublicSettingsRows();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return res.json({
      success: true,
      data: {
        registration_open: settings.registration_open === '1',
        registration_closed_message:
          settings.registration_closed_message || 'التسجيل مغلق حالياً',
        site_title: settings.site_title || 'فريق الروضة',
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    const rows = await getAllSettings();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = {
        value: row.value,
        updated_at: row.updated_at,
      };
    }

    return res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const body = req.body || {};
    const updates = {};

    if (body.registration_open !== undefined) {
      const open =
        body.registration_open === true ||
        body.registration_open === 1 ||
        body.registration_open === '1';
      updates.registration_open = open ? '1' : '0';
    }

    if (body.registration_closed_message !== undefined) {
      const message = sanitizeText(body.registration_closed_message);
      if (!message || message.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'رسالة إغلاق التسجيل يجب أن تكون بين 1 و 300 حرف',
        });
      }
      updates.registration_closed_message = message;
    }

    if (body.site_title !== undefined) {
      const title = sanitizeText(body.site_title);
      if (!title || title.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'عنوان الموقع يجب أن يكون بين 1 و 100 حرف',
        });
      }
      updates.site_title = title;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد إعدادات لتحديثها',
      });
    }

    for (const key of Object.keys(updates)) {
      if (!EDITABLE_SETTINGS.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `الإعداد غير مسموح: ${key}`,
        });
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      await upsertSetting(key, value);
    }

    return res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: { updated: updates },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPublicSettings,
  getSettings,
  updateSettings,
};
