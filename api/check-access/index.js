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
      return res.status(200).json({ 
        hasAccess: false,
        username: null,
        debug: 'Username not found in Telegram profile'
      });
    }

    // Читаем файл accepted.md из папки notes
    const acceptedFilePath = path.join(process.cwd(), 'src', 'site', 'notes', 'accepted.md');
    console.log('check-access: Reading file from:', acceptedFilePath);
    
    let acceptedUsernames = [];
    try {
      const acceptedContent = fs.readFileSync(acceptedFilePath, 'utf8');
      console.log('check-access: File content (first 200 chars):', acceptedContent.substring(0, 200));
      
      // Парсим файл: каждая строка - это username (игнорируем пустые строки и комментарии)
      const allLines = acceptedContent.split('\n');
      console.log('check-access: Total lines in file:', allLines.length);
      
      acceptedUsernames = allLines
        .map((line, index) => {
          const trimmed = line.trim();
          console.log(`check-access: Line ${index}: "${trimmed}" (length: ${trimmed.length})`);
          return trimmed;
        })
        .filter(line => {
          const isValid = line && !line.startsWith('#');
          if (!isValid) {
            console.log(`check-access: Filtered out line: "${line}"`);
          }
          return isValid;
        })
        .map(line => {
          const cleaned = line.replace(/^@/, '').toLowerCase();
          console.log(`check-access: Cleaned username: "${line}" -> "${cleaned}"`);
          return cleaned;
        });
      
      console.log('check-access: Parsed usernames:', acceptedUsernames);
      console.log('check-access: Number of accepted usernames:', acceptedUsernames.length);
    } catch (error) {
      console.error('check-access: Error reading accepted.md:', error);
      console.error('check-access: Error stack:', error.stack);
      return res.status(500).json({ 
        error: 'Could not read accepted.md file',
        debug: error.message
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
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;

