const crypto = require('crypto');

/**
 * Валидация initData от Telegram WebApp
 * @param {string} initData - initData строка от Telegram
 * @param {string} botToken - токен бота
 * @returns {boolean}
 */
function validateInitData(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating initData:', error);
    return false;
  }
}

/**
 * Извлечение username из initData
 * @param {string} initData - initData строка от Telegram
 * @returns {string|null}
 */
function extractUsername(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.username || null;
    }
    return null;
  } catch (error) {
    console.error('Error extracting username:', error);
    return null;
  }
}

module.exports = {
  validateInitData,
  extractUsername
};

