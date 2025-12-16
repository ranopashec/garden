# Настройка Supabase для проверки доступа

Эта инструкция поможет настроить Supabase для проверки доступа к приватным страницам.

## Шаг 1: Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект или используйте существующий
3. Запомните URL проекта и API ключи

## Шаг 2: Создание таблицы в базе данных

1. Откройте SQL Editor в панели управления Supabase
2. Выполните следующий SQL запрос для создания таблицы:

```sql
-- Создание таблицы для разрешённых пользователей
CREATE TABLE IF NOT EXISTS allowed_users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Создание индекса для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram_id ON allowed_users(telegram_id);

-- Создание индекса для проверки срока действия
CREATE INDEX IF NOT EXISTS idx_allowed_users_expires_at ON allowed_users(expires_at);

-- Включение Row Level Security (RLS)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Политика: разрешить чтение всем (так как мы используем anon key)
-- В продакшене рекомендуется использовать service_role key для более строгого контроля
CREATE POLICY "Allow public read access" ON allowed_users
  FOR SELECT
  USING (true);
```

## Шаг 3: Добавление пользователей

Добавьте пользователей, которым разрешён доступ, в таблицу `allowed_users`:

```sql
-- Добавление пользователя с указанием срока действия доступа
-- Замените 123456789 на реальный Telegram ID пользователя
-- Замените '2025-12-31 23:59:59+00' на дату окончания доступа (формат: YYYY-MM-DD HH:MM:SS+TZ)
INSERT INTO allowed_users (telegram_id, expires_at) 
VALUES (123456789, '2025-12-31 23:59:59+00')
ON CONFLICT (telegram_id) 
DO UPDATE SET expires_at = EXCLUDED.expires_at;
```

**Примеры дат:**
- Доступ на 1 месяц: `NOW() + INTERVAL '1 month'`
- Доступ на 1 год: `NOW() + INTERVAL '1 year'`
- Доступ до конкретной даты: `'2025-12-31 23:59:59+00'`

```sql
-- Пример: доступ на 1 год с текущего момента
INSERT INTO allowed_users (telegram_id, expires_at) 
VALUES (123456789, NOW() + INTERVAL '1 year')
ON CONFLICT (telegram_id) 
DO UPDATE SET expires_at = EXCLUDED.expires_at;
```

Или через веб-интерфейс Supabase:
1. Откройте Table Editor
2. Выберите таблицу `allowed_users`
3. Нажмите "Insert row"
4. Введите:
   - **telegram_id**: ID пользователя из Telegram (число, например: 123456789)
   - **expires_at**: Дата и время окончания доступа (например: 2025-12-31 23:59:59+00)
5. Сохраните

**Как узнать Telegram ID пользователя:**
- Откройте бота [@userinfobot](https://t.me/userinfobot) в Telegram
- Бот покажет ваш Telegram ID

## Шаг 4: Получение API ключей

1. В панели управления Supabase перейдите в Settings → API
2. Найдите следующие значения:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **anon/public key** (это ключ, который начинается с `eyJ...`)
   - **service_role key** (секретный ключ, который также начинается с `eyJ...`)

**Важно:** Если RLS политики блокируют доступ, используйте `service_role` ключ вместо `anon` ключа. Service role key обходит RLS и имеет полный доступ к данным.

## Шаг 5: Настройка переменных окружения в Vercel

1. Откройте проект в Vercel Dashboard
2. Перейдите в Settings → Environment Variables
3. Добавьте следующие переменные:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Опционально, но рекомендуется для обхода RLS
```

**Примечание:** Если вы используете `SUPABASE_SERVICE_ROLE_KEY`, API будет использовать его вместо `SUPABASE_ANON_KEY`. Service role key обходит RLS политики и имеет полный доступ к данным.

4. Убедитесь, что переменные добавлены для всех окружений (Production, Preview, Development)
5. После добавления переменных **передеплойте проект**

## Шаг 6: Проверка работы

1. Убедитесь, что ваш Telegram ID добавлен в таблицу `allowed_users` с актуальной датой окончания доступа
2. Откройте приватную страницу через Telegram Mini App
3. Если всё настроено правильно, страница должна открыться

## Важные замечания

- **Telegram ID**: Используется уникальный ID пользователя из Telegram (число, например: 123456789)
- **Срок действия**: Доступ предоставляется только до указанной даты в поле `expires_at`. После истечения срока доступ будет автоматически заблокирован
- **Обновление доступа**: Для продления доступа обновите поле `expires_at` для существующего пользователя
- **Безопасность**: Текущая настройка использует `anon` ключ. Для более строгого контроля доступа рекомендуется использовать `service_role` ключ на сервере

## Troubleshooting

### Проблема: Доступ не предоставляется

1. Проверьте, что Telegram ID в базе данных совпадает с ID пользователя из Telegram
2. Убедитесь, что дата в поле `expires_at` ещё не истекла (должна быть в будущем)
3. Проверьте логи в Vercel Dashboard → Functions
4. Убедитесь, что переменные окружения установлены правильно
5. Проверьте консоль браузера на наличие ошибок

### Проблема: API возвращает ошибку 500

1. Проверьте, что таблица `allowed_users` создана
2. Убедитесь, что RLS политики настроены правильно
3. Проверьте логи в Supabase Dashboard → Logs

### Проблема: Telegram ID не определяется

1. Убедитесь, что приложение открыто через Telegram Mini App (не в обычном браузере)
2. Проверьте, что пользователь авторизован в Telegram
3. Проверьте консоль браузера на наличие ошибок

### Проблема: Доступ истёк

1. Проверьте поле `expires_at` в базе данных - дата должна быть в будущем
2. Для продления доступа обновите `expires_at` на новую дату
3. Пользователю нужно перезагрузить страницу после обновления доступа

