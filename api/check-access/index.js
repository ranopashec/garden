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

    // Пробуем несколько возможных путей к файлу accepted.md
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md'), // Локальная разработка
      path.join(process.cwd(), 'dist', 'notes', 'accepted.md'), // После сборки Eleventy
      path.join(process.cwd(), 'dist', 'accepted.md'), // В dist корне
      path.join(process.cwd(), 'accepted.md'), // В корне проекта
      path.join(__dirname, '..', '..', 'src', 'site', 'notes', 'accepted.md'), // Относительно API (локально)
      path.join(__dirname, '..', '..', 'dist', 'notes', 'accepted.md'), // Относительно API (после сборки)
    ];
    
    let acceptedUsernames = [];
    let acceptedFilePath = null;
    
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          acceptedFilePath = filePath;
          const acceptedContent = fs.readFileSync(filePath, 'utf8');
          console.log(`check-access: Found accepted.md at: ${filePath}`);
          console.log(`check-access: File content length: ${acceptedContent.length}`);
          
          // Парсим файл: каждая строка - это username (игнорируем пустые строки и комментарии)
          acceptedUsernames = acceptedContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')) // Игнорируем пустые строки и комментарии
            .map(line => line.replace(/^@/, '').toLowerCase()); // Убираем @ если есть и приводим к нижнему регистру
          
          console.log(`check-access: Parsed ${acceptedUsernames.length} usernames:`, acceptedUsernames);
          break;
        }
      } catch (error) {
        console.log(`check-access: Path not found or error: ${filePath}`, error.message);
        continue;
      }
    }
    
    if (!acceptedFilePath || acceptedUsernames.length === 0) {
      console.error('check-access: Could not find accepted.md file in any of the expected locations');
      return res.status(500).json({ 
        error: 'Could not read accepted.md file',
        triedPaths: possiblePaths
      });
    }

    // Проверяем, есть ли username в списке разрешенных
    const usernameLower = username.toLowerCase();
    const hasAccess = acceptedUsernames.includes(usernameLower);

    console.log(`check-access: Checking access for username "${username}" (normalized: "${usernameLower}")`);
    console.log(`check-access: Accepted usernames:`, acceptedUsernames);
    console.log(`check-access: Access result: ${hasAccess}`);

    return res.status(200).json({ 
      hasAccess,
      username,
      acceptedUsernames: acceptedUsernames.length,
      debug: process.env.NODE_ENV === 'development' ? {
        filePath: acceptedFilePath,
        parsedUsernames: acceptedUsernames,
        requestedUsername: usernameLower
      } : undefined
    });
  } catch (error) {
    console.error('Error in check-access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;

