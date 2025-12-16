const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    // Убеждаемся, что telegramId это число (Telegram ID всегда число)
    const telegramIdNum = typeof telegramId === 'string' ? parseInt(telegramId, 10) : telegramId;
    
    if (isNaN(telegramIdNum)) {
      return res.status(400).json({ error: 'Invalid Telegram ID format' });
    }

    // Получаем переменные окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Создаём клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Проверяем наличие telegram_id в базе данных и срок действия доступа
    // Предполагаем, что таблица называется 'allowed_users' с колонками 'telegram_id' и 'expires_at'
    const now = new Date().toISOString();
    
    // Сначала проверяем есть ли пользователь вообще (даже с истёкшей подпиской)
    console.log('API: Checking access for telegramId:', telegramIdNum, 'type:', typeof telegramIdNum);
    
    // Пробуем запрос как с числом, так и со строкой (на случай если в БД хранится строка)
    let { data: userData, error: userError } = await supabase
      .from('allowed_users')
      .select('telegram_id, expires_at')
      .eq('telegram_id', telegramIdNum)
      .maybeSingle();

    console.log('API: Query result (as number):', JSON.stringify({ userData, userError }));

    // Если не нашли, пробуем как строку
    if (!userData && !userError) {
      console.log('API: Trying as string:', String(telegramIdNum));
      const { data: userDataStr, error: userErrorStr } = await supabase
        .from('allowed_users')
        .select('telegram_id, expires_at')
        .eq('telegram_id', String(telegramIdNum))
        .maybeSingle();
      
      if (userDataStr) {
        userData = userDataStr;
        console.log('API: Found as string:', JSON.stringify(userData));
      } else {
        console.log('API: Not found as string either');
      }
    }

    if (userError) {
      console.error('Supabase query error:', userError);
      return res.status(500).json({ error: 'Database query error', details: userError.message });
    }

    // Проверяем, действительна ли подписка
    const nowDate = new Date(now);
    const expiresDate = userData ? new Date(userData.expires_at) : null;
    const hasAccess = userData ? (expiresDate && expiresDate >= nowDate) : false;
    const expiresAt = userData?.expires_at || null;

    console.log('API: Access check result:', {
      hasAccess: hasAccess,
      expiresAt: expiresAt,
      now: now,
      expiresDate: expiresDate?.toISOString(),
      comparison: expiresDate ? (expiresDate >= nowDate) : false,
      userDataFound: !!userData,
      userDataTelegramId: userData?.telegram_id,
      userDataTelegramIdType: userData?.telegram_id ? typeof userData.telegram_id : 'N/A'
    });

    return res.status(200).json({ 
      hasAccess: hasAccess || false, // Всегда возвращаем boolean
      telegramId: telegramIdNum,
      expiresAt,
      debug: {
        userDataFound: !!userData,
        expiresAtRaw: expiresAt,
        now: now,
        expiresDate: expiresDate?.toISOString(),
        userDataTelegramId: userData?.telegram_id,
        userDataTelegramIdType: userData?.telegram_id ? typeof userData.telegram_id : 'N/A',
        searchedAs: typeof telegramIdNum
      }
    });

  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

