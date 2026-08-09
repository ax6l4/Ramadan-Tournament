/**
 * معالج أخطاء مركزي لـ Express
 */

/**
 * وسيط لالتقاط الأخطاء غير المعالجة وإرجاع رد موحّد
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? 'حدث خطأ في الخادم'
        : err.message || 'حدث خطأ غير متوقع',
  });
}

/**
 * وسيط للمسارات غير الموجودة
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
