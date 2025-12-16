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
    
    // Важно: service_role key используется ТОЛЬКО на сервере (Vercel serverless function)
    // Клиент НЕ имеет доступа к этому ключу - он хранится в переменных окружения Vercel
    // Если RLS политика не работает с anon key, используем service_role как fallback
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('API: Using Supabase key type:', usingServiceRole ? 'service_role (server-side only, ✅ secure)' : 'anon');
    
    if (usingServiceRole) {
      console.log('API: Note: service_role key bypasses RLS - this is safe as it runs server-side only');
    }

    // Создаём клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Проверяем наличие telegram_id в базе данных и срок действия доступа
    // Предполагаем, что таблица называется 'allowed_users' с колонками 'telegram_id' и 'expires_at'
    const now = new Date().toISOString();
    
    // Сначала проверяем есть ли пользователь вообще (даже с истёкшей подпиской)
    console.log('API: Checking access for telegramId:', telegramIdNum, 'type:', typeof telegramIdNum);
    
    // Пробуем разные варианты запроса
    let userData = null;
    let userError = null;
    
    // Вариант 1: как число
    console.log('API: Trying query as number:', telegramIdNum);
    let { data: data1, error: error1 } = await supabase
      .from('allowed_users')
      .select('telegram_id, expires_at')
      .eq('telegram_id', telegramIdNum);
    
    console.log('API: Query as number result:', { 
      dataLength: data1?.length, 
      data: data1, 
      error: error1 
    });
    
    if (data1 && data1.length > 0) {
      userData = data1[0];
      console.log('API: Found as number:', userData);
    } else if (!error1) {
      // Вариант 2: как строка
      console.log('API: Trying query as string:', String(telegramIdNum));
      let { data: data2, error: error2 } = await supabase
        .from('allowed_users')
        .select('telegram_id, expires_at')
        .eq('telegram_id', String(telegramIdNum));
      
      console.log('API: Query as string result:', { 
        dataLength: data2?.length, 
        data: data2, 
        error: error2 
      });
      
      if (data2 && data2.length > 0) {
        userData = data2[0];
        console.log('API: Found as string:', userData);
      } else {
        userError = error2;
      }
    } else {
      userError = error1;
    }
    
    // Вариант 3: попробуем получить все записи для отладки (только первые 5)
    if (!userData && !userError) {
      console.log('API: Trying to get all records for debugging...');
      let { data: allData, error: allError } = await supabase
        .from('allowed_users')
        .select('*')
        .limit(5);
      
      console.log('API: All records sample:', { 
        count: allData?.length, 
        sample: allData,
        error: allError,
        errorDetails: allError ? JSON.stringify(allError) : null
      });
      
      // Если RLS блокирует, попробуем проверить политики
      if (allError) {
        console.log('API: RLS Error detected:', allError.message);
        console.log('API: Error code:', allError.code);
        console.log('API: Error details:', allError.details);
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

