const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');

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
 * Извлечение user_id из initData
 * @param {string} initData - initData строка от Telegram
 * @returns {number|null}
 */
function extractUserId(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Проверка членства пользователя в группе
 * @param {number} userId - ID пользователя Telegram
 * @param {string} groupId - ID группы/канала
 * @returns {Promise<boolean>}
 */
async function checkUserInGroup(userId, groupId) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('BOT_TOKEN not set');
      return false;
    }
    
    const bot = new TelegramBot(botToken);
    const member = await bot.getChatMember(groupId, userId);
    
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
}

module.exports = {
  validateInitData,
  extractUserId,
  checkUserInGroup
};

