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
      // Пробуем прочитать список разрешенных для отображения
      let acceptedUsernames = [];
      try {
        const acceptedFilePath = path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md');
        const acceptedContent = fs.readFileSync(acceptedFilePath, 'utf8');
        acceptedUsernames = acceptedContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
          .map(line => line.replace(/^@/, '').toLowerCase());
      } catch (e) {
        // Игнорируем ошибку чтения файла
      }
      
      return res.status(200).json({ 
        hasAccess: false,
        username: null,
        debug: {
          error: 'Username not found in Telegram profile',
          acceptedUsernames: acceptedUsernames
        }
      });
    }

    // Читаем файл accepted.md из папки notes
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md'),
      path.join(__dirname, '..', '..', 'src', 'site', 'notes', 'accepted.md'),
      path.join(process.cwd(), 'accepted.md'),
    ];
    
    let acceptedUsernames = [];
    let acceptedFilePath = null;
    let fileReadError = null;
    
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          acceptedFilePath = filePath;
          const acceptedContent = fs.readFileSync(filePath, 'utf8');
          
          // Парсим файл: каждая строка - это username (игнорируем пустые строки и комментарии)
          acceptedUsernames = acceptedContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => line.replace(/^@/, '').toLowerCase());
          
          break; // Успешно прочитали файл
        }
      } catch (error) {
        fileReadError = error;
        continue; // Пробуем следующий путь
      }
    }
    
    if (!acceptedFilePath || acceptedUsernames.length === 0) {
      console.error('check-access: Could not read accepted.md');
      return res.status(500).json({ 
        error: 'Could not read accepted.md file',
        debug: {
          triedPaths: possiblePaths,
          lastError: fileReadError?.message
        }
      });
    }

    // Проверяем, есть ли username в списке разрешенных
    const hasAccess = acceptedUsernames.includes(username.toLowerCase());

    return res.status(200).json({ 
      hasAccess,
      username,
      debug: {
        requestedUsername: usernameLower,
        acceptedUsernames: acceptedUsernames,
        match: hasAccess
      }
    });
  } catch (error) {
    console.error('Error in check-access:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = handler;

