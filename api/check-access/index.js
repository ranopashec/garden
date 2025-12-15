const { validateInitData, extractUsername } = require('../../lib/telegram');

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
      return res.status(500).json({ error: 'Server configuration error: BOT_TOKEN not set' });
    }

    // Валидация initData
    if (!validateInitData(initData, botToken)) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    // Извлечение username
    const username = extractUsername(initData);
    
    if (!username) {
      return res.status(200).json({ 
        hasAccess: false,
        username: null
      });
    }

    // Получаем список разрешенных пользователей из переменной окружения
    const acceptedUsersEnv = process.env.ACCEPTED_USERS;
    
    if (!acceptedUsersEnv) {
      return res.status(500).json({ 
        error: 'Server configuration error: ACCEPTED_USERS not set' 
      });
    }

    // Парсим список разрешенных пользователей (через запятую)
    const acceptedUsernames = acceptedUsersEnv
      .split(',')
      .map(u => u.trim().replace(/^@/, '').toLowerCase())
      .filter(u => u);

    if (acceptedUsernames.length === 0) {
      return res.status(500).json({ 
        error: 'Server configuration error: No valid usernames in ACCEPTED_USERS' 
      });
    }

    // Проверяем, есть ли username в списке разрешенных
    const usernameLower = username.toLowerCase();
    const hasAccess = acceptedUsernames.includes(usernameLower);

    return res.status(200).json({ 
      hasAccess,
      username
    });
  } catch (error) {
    console.error('Error in check-access:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = handler;

