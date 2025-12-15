const { validateInitData, extractUserId } = require('../../lib/telegram');
const TelegramBot = require('node-telegram-bot-api');

async function handler(req, res) {
  // Разрешаем CORS для Telegram WebApp
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('group-members: BOT_TOKEN not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Валидация initData
    if (!validateInitData(initData, botToken)) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    // Извлечение user_id
    const userId = extractUserId(initData);
    if (!userId) {
      return res.status(400).json({ error: 'Could not extract user ID' });
    }

    // Получаем идентификатор группы
    const groupUsername = process.env.PRIVATE_GROUP_USERNAME;
    const groupId = process.env.PRIVATE_GROUP_ID;
    
    let groupIdentifier = null;
    
    if (groupUsername) {
      groupIdentifier = groupUsername;
    } else if (groupId) {
      groupIdentifier = groupId;
    } else {
      return res.status(500).json({ error: 'Group identifier not configured' });
    }

    // Нормализуем groupIdentifier
    if (!groupIdentifier.startsWith('@') && !groupIdentifier.match(/^-?\d+$/)) {
      groupIdentifier = '@' + groupIdentifier;
    }

    const bot = new TelegramBot(botToken, { polling: false });

    console.log(`group-members: Fetching members for group ${groupIdentifier}`);

    // Получаем список администраторов (это работает для большинства групп)
    // Для получения всех участников нужны специальные права
    let members = [];
    
    try {
      const administrators = await bot.getChatAdministrators(groupIdentifier);
      members = administrators.map(admin => ({
        id: admin.user.id,
        username: admin.user.username || null,
        first_name: admin.user.first_name || null,
        last_name: admin.user.last_name || null,
        status: admin.status
      }));
      
      console.log(`group-members: Found ${members.length} administrators`);
    } catch (error) {
      console.error('group-members: Error getting administrators:', error);
      // Если не удалось получить администраторов, пробуем получить информацию о группе
      try {
        const chat = await bot.getChat(groupIdentifier);
        members = [{
          id: chat.id,
          title: chat.title,
          username: chat.username || null,
          type: chat.type
        }];
      } catch (err) {
        console.error('group-members: Error getting chat info:', err);
        return res.status(500).json({ error: 'Could not fetch group information' });
      }
    }

    // Также пробуем получить информацию о текущем пользователе в группе
    try {
      const member = await bot.getChatMember(groupIdentifier, userId);
      const currentUser = {
        id: member.user.id,
        username: member.user.username || null,
        first_name: member.user.first_name || null,
        last_name: member.user.last_name || null,
        status: member.status
      };
      
      // Добавляем текущего пользователя, если его ещё нет в списке
      if (!members.find(m => m.id === currentUser.id)) {
        members.push(currentUser);
      }
    } catch (error) {
      console.error('group-members: Error getting current user info:', error);
    }

    return res.status(200).json({ 
      members,
      groupIdentifier,
      count: members.length
    });
  } catch (error) {
    console.error('Error in group-members:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

module.exports = handler;

