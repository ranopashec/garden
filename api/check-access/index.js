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
    console.log('check-access: Extracted username:', username);
    
    if (!username) {
      console.log('check-access: Username not found in initData');
      
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
    // Пробуем несколько возможных путей (для Vercel и локальной разработки)
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md'),
      path.join(__dirname, '..', '..', 'src', 'site', 'notes', 'accepted.md'),
      path.join(process.cwd(), 'accepted.md'),
    ];
    
    console.log('check-access: process.cwd():', process.cwd());
    console.log('check-access: __dirname:', __dirname);
    console.log('check-access: Trying paths:', possiblePaths);
    
    let acceptedUsernames = [];
    let acceptedFilePath = null;
    let fileReadError = null;
    
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          console.log('check-access: File found at:', filePath);
          acceptedFilePath = filePath;
          const acceptedContent = fs.readFileSync(filePath, 'utf8');
          console.log('check-access: File content (first 200 chars):', acceptedContent.substring(0, 200));
          
          // Парсим файл: каждая строка - это username (игнорируем пустые строки и комментарии)
          const allLines = acceptedContent.split('\n');
          console.log('check-access: Total lines in file:', allLines.length);
          
          acceptedUsernames = allLines
            .map((line, index) => {
              const trimmed = line.trim();
              if (index < 10) { // Логируем только первые 10 строк
                console.log(`check-access: Line ${index}: "${trimmed}" (length: ${trimmed.length})`);
              }
              return trimmed;
            })
            .filter(line => {
              const isValid = line && !line.startsWith('#');
              return isValid;
            })
            .map(line => {
              const cleaned = line.replace(/^@/, '').toLowerCase();
              return cleaned;
            });
          
          console.log('check-access: Parsed usernames:', acceptedUsernames);
          console.log('check-access: Number of accepted usernames:', acceptedUsernames.length);
          break; // Успешно прочитали файл
        } else {
          console.log('check-access: File not found at:', filePath);
        }
      } catch (error) {
        console.error(`check-access: Error reading from ${filePath}:`, error.message);
        fileReadError = error;
        continue; // Пробуем следующий путь
      }
    }
    
    if (!acceptedFilePath || acceptedUsernames.length === 0) {
      console.error('check-access: Could not read accepted.md from any path');
      console.error('check-access: Last error:', fileReadError?.message);
      return res.status(500).json({ 
        error: 'Could not read accepted.md file',
        debug: {
          triedPaths: possiblePaths,
          lastError: fileReadError?.message,
          cwd: process.cwd(),
          dirname: __dirname
        }
      });
    }
    
    if (acceptedUsernames.length === 0) {
      console.error('check-access: No usernames found in accepted.md');
      return res.status(500).json({ 
        error: 'No usernames found in accepted.md file',
        debug: 'File was read but no valid usernames were parsed'
      });
    }

    // Проверяем, есть ли username в списке разрешенных
    const usernameLower = username.toLowerCase();
    console.log('check-access: Comparing username:', usernameLower);
    console.log('check-access: Against list:', acceptedUsernames);
    
    const hasAccess = acceptedUsernames.includes(usernameLower);
    console.log('check-access: Access result:', hasAccess);

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

