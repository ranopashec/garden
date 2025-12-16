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
    const { data, error } = await supabase
      .from('allowed_users')
      .select('telegram_id, expires_at')
      .eq('telegram_id', telegramId)
      .gte('expires_at', now) // expires_at >= now (доступ ещё действителен)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database query error' });
    }

    // Если пользователь найден и срок действия не истёк - доступ разрешён
    const hasAccess = !!data;

    return res.status(200).json({ 
      hasAccess,
      telegramId,
      expiresAt: data?.expires_at || null
    });

  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

