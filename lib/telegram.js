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
      console.error('checkUserInGroup: BOT_TOKEN not set');
      return false;
    }
    
    if (!userId) {
      console.error('checkUserInGroup: userId is required');
      return false;
    }
    
    if (!groupId) {
      console.error('checkUserInGroup: groupId is required');
      return false;
    }
    
    const bot = new TelegramBot(botToken, { polling: false });
    
    console.log(`checkUserInGroup: Checking user ${userId} in group ${groupId}`);
    
    const member = await bot.getChatMember(groupId, userId);
    
    console.log(`checkUserInGroup: Member status: ${member.status}`);
    
    // Проверяем статус участника
    const hasAccess = ['member', 'administrator', 'creator'].includes(member.status);
    
    console.log(`checkUserInGroup: Access granted: ${hasAccess}`);
    
    return hasAccess;
  } catch (error) {
    console.error('checkUserInGroup: Error checking group membership:', error);
    
    // Обрабатываем специфичные ошибки
    if (error.response) {
      const errorCode = error.response.statusCode;
      const errorDescription = error.response.body?.description || error.message;
      
      console.error(`checkUserInGroup: Telegram API error ${errorCode}: ${errorDescription}`);
      
      // Если бот не в группе или нет прав
      if (errorCode === 400 && errorDescription?.includes('chat not found')) {
        console.error('checkUserInGroup: Bot is not a member of the group or group not found');
      } else if (errorCode === 403) {
        console.error('checkUserInGroup: Bot does not have permission to check members');
      }
    }
    
    return false;
  }
}

module.exports = {
  validateInitData,
  extractUserId,
  checkUserInGroup
};

