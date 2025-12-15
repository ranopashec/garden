const { validateInitData, extractUsername } = require('../../lib/telegram');
const fs = require('fs');
const path = require('path');

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

    // Извлечение username
    const username = extractUsername(initData);
    if (!username) {
      console.log('check-access: Username not found in initData');
      return res.status(200).json({ 
        hasAccess: false,
        username: null,
        reason: 'Username not found in Telegram profile'
      });
    }

    console.log(`check-access: Extracted username: ${username}`);

    // Читаем файл accepted.md из папки notes
    // На Vercel все файлы из репозитория доступны, путь относительно корня проекта
    const acceptedFilePath = path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md');
    
    let acceptedUsernames = [];
    try {
      const acceptedContent = fs.readFileSync(acceptedFilePath, 'utf8');
      console.log(`check-access: Reading accepted.md from: ${acceptedFilePath}`);
      
      // Парсим файл: каждая строка - это username (игнорируем пустые строки и комментарии)
      acceptedUsernames = acceptedContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // Игнорируем пустые строки и комментарии
        .map(line => line.replace(/^@/, '').toLowerCase()); // Убираем @ если есть и приводим к нижнему регистру
      
      console.log(`check-access: Parsed ${acceptedUsernames.length} usernames:`, acceptedUsernames);
    } catch (error) {
      console.error('check-access: Error reading accepted.md:', error);
      return res.status(500).json({ 
        error: 'Could not read accepted.md file',
        path: acceptedFilePath
      });
    }
    
    if (acceptedUsernames.length === 0) {
      console.error('check-access: No usernames found in accepted.md');
      return res.status(500).json({ error: 'No usernames found in accepted.md file' });
    }

    // Проверяем, есть ли username в списке разрешенных
    const usernameLower = username.toLowerCase();
    const hasAccess = acceptedUsernames.includes(usernameLower);

    console.log(`check-access: Checking access for username "${username}" (normalized: "${usernameLower}")`);
    console.log(`check-access: Accepted usernames:`, acceptedUsernames);
    console.log(`check-access: Access result: ${hasAccess}`);

    return res.status(200).json({ 
      hasAccess,
      username
    });
  } catch (error) {
    console.error('Error in check-access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;

