# Инструкция по деплою на Vercel

## Подготовка

### 1. Убедитесь, что проект готов к деплою

Проверьте, что у вас есть:
- ✅ Все зависимости установлены (`npm install`)
- ✅ Проект собирается локально (`npm run build`)
- ✅ Файл `vercel.json` настроен
- ✅ Переменные окружения определены

### 2. Подготовьте Git репозиторий

Если у вас ещё нет Git репозитория:

```bash
# Инициализируйте репозиторий
git init

# Добавьте все файлы
git add .

# Сделайте первый коммит
git commit -m "Initial commit"
```

### 3. Создайте репозиторий на GitHub/GitLab/Bitbucket

1. Создайте новый репозиторий на GitHub (или другом Git-хостинге)
2. Подключите локальный репозиторий к удалённому:

```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

## Деплой на Vercel

### Способ 1: Через веб-интерфейс Vercel (рекомендуется)

1. **Откройте [vercel.com](https://vercel.com)**
   - Войдите через GitHub/GitLab/Bitbucket

2. **Создайте новый проект**
   - Нажмите "Add New..." → "Project"
   - Выберите ваш репозиторий
   - Vercel автоматически определит настройки из `vercel.json`

3. **Настройте переменные окружения**
   - В разделе "Environment Variables" добавьте:
     - `BOT_TOKEN` = ваш токен бота
     - `PRIVATE_GROUP_ID` = ID закрытой группы
   - Выберите "Apply to all environments" (Production, Preview, Development)

4. **Настройте сборку (если нужно)**
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Деплой**
   - Нажмите "Deploy"
   - Дождитесь завершения сборки
   - Получите URL вашего сайта

### Способ 2: Через Vercel CLI

1. **Установите Vercel CLI**

```bash
npm install -g vercel
```

2. **Войдите в Vercel**

```bash
vercel login
```

3. **Деплой проекта**

```bash
# Первый деплой (интерактивный)
vercel

# Последующие деплои
vercel --prod
```

4. **Настройте переменные окружения**

```bash
# Добавить переменную
vercel env add BOT_TOKEN
vercel env add PRIVATE_GROUP_ID

# Применить к production
vercel env pull .env.local
```

## Настройка Telegram Mini App

После деплоя на Vercel:

1. **Получите URL вашего сайта**
   - Например: `https://your-project.vercel.app`

2. **Настройте Mini App в BotFather**
   - Откройте [@BotFather](https://t.me/BotFather)
   - Отправьте `/newapp` или `/myapps`
   - Выберите вашего бота
   - Укажите:
     - Title: название вашего приложения
     - Description: описание
     - Photo: загрузите иконку (опционально)
     - **Web App URL**: `https://your-project.vercel.app`
     - Short name: короткое имя для ссылки

3. **Проверьте работу**
   - Откройте бота в Telegram
   - Нажмите на кнопку Mini App
   - Убедитесь, что сайт открывается

## Настройка домена (опционально)

1. **В настройках проекта Vercel**
   - Перейдите в Settings → Domains
   - Добавьте ваш домен
   - Следуйте инструкциям по настройке DNS

2. **Обновите Web App URL в BotFather**
   - Используйте новый домен вместо `vercel.app`

## Обновление сайта

После каждого изменения в коде:

```bash
# Закоммитьте изменения
git add .
git commit -m "Update content"

# Запушьте в репозиторий
git push

# Vercel автоматически задеплоит новую версию
```

Или используйте Vercel CLI:

```bash
vercel --prod
```

## Проверка работы API

После деплоя проверьте, что API endpoint работает:

```bash
# Замените на ваш URL
curl -X POST https://your-project.vercel.app/api/check-access \
  -H "Content-Type: application/json" \
  -d '{"initData": "test"}'
```

Должен вернуться ответ (даже если с ошибкой - это значит endpoint работает).

## Troubleshooting

### Проблема: Сборка падает

**Решение:**
- Проверьте логи сборки в Vercel Dashboard
- Убедитесь, что все зависимости в `package.json`
- Проверьте, что Node.js версия совпадает (22.x)

### Проблема: API не работает

**Решение:**
- Проверьте, что переменные окружения установлены
- Убедитесь, что `vercel.json` правильно настроен
- Проверьте логи функций в Vercel Dashboard

### Проблема: Сайт не открывается в Telegram

**Решение:**
- Проверьте, что Web App URL правильный в BotFather
- Убедитесь, что сайт доступен по HTTPS
- Проверьте, что нет ошибок в консоли браузера

### Проблема: Переменные окружения не работают

**Решение:**
- Убедитесь, что переменные добавлены для всех окружений
- После добавления переменных передеплойте проект
- Проверьте, что имена переменных точно совпадают

## Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

