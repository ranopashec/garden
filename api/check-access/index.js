const { validateInitData, extractUserId, checkUserInGroup } = require('../../lib/telegram');

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
      console.error('BOT_TOKEN not set');
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

    // Проверка группы (используем глобальный PRIVATE_GROUP_ID)
    const groupId = process.env.PRIVATE_GROUP_ID;
    if (!groupId) {
      console.error('check-access: PRIVATE_GROUP_ID not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log(`check-access: Checking access for user ${userId} in group ${groupId}`);

    const hasAccess = await checkUserInGroup(userId, groupId);

    console.log(`check-access: Access result for user ${userId}: ${hasAccess}`);

    return res.status(200).json({ 
      hasAccess,
      userId 
    });
  } catch (error) {
    console.error('Error in check-access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;

