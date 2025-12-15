# Telegram Mini App - Digital Garden

Минималистичный digital garden встроенный в Telegram как Mini App с поддержкой приватных статей.

## Возможности

- ✅ Создание сайта из markdown заметок с гиперссылками
- ✅ Интеграция с Telegram WebApp API
- ✅ Приватные статьи (доступ только для участников закрытой группы)
- ✅ Защита от копирования текста
- ✅ Запрет масштабирования страницы
- ✅ Стили в стиле Telegram/Apple
- ✅ Callouts с скругленными углами (12px)
- ✅ Кнопка "Поделиться" для шаринга статей
- ✅ Работа с папкой `src/site/notes` как с Obsidian vault

## Настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env.local`:

```env
BOT_TOKEN=your_bot_token_here
PRIVATE_GROUP_ID=123456789  # ИЛИ используйте PRIVATE_GROUP_USERNAME
PRIVATE_GROUP_USERNAME=mygroup  # Опционально: username группы без @ (например: mygroup)
BOT_USERNAME=your_bot_username  # Опционально: username бота без @ (например: mybot)
```

**Как получить BOT_TOKEN:**
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен бота

**Как получить PRIVATE_GROUP_ID или PRIVATE_GROUP_USERNAME:**

**Вариант 1: По ID группы (для любых групп)**
1. Добавьте бота в группу/канал
2. Отправьте любое сообщение в группу
3. Используйте API: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
4. Найдите `chat.id` в ответе (для групп это отрицательное число, например: `-123456789`)

**Вариант 2: По username группы (только для публичных групп с username)**
1. Убедитесь, что группа имеет публичный username (например, `@mygroup`)
2. Установите `PRIVATE_GROUP_USERNAME=mygroup` (без @)
3. Бот должен быть участником группы

**Примечание:** Если указаны оба параметра (`PRIVATE_GROUP_ID` и `PRIVATE_GROUP_USERNAME`), приоритет имеет `PRIVATE_GROUP_USERNAME`.

### 3. Настройка в Vercel

1. Добавьте переменные окружения в настройках проекта Vercel:
   - `BOT_TOKEN` - токен бота (обязательно)
   - `PRIVATE_GROUP_ID` - ID закрытой группы (обязательно, если не используется PRIVATE_GROUP_USERNAME)
   - `PRIVATE_GROUP_USERNAME` - username группы без @ (опционально, альтернатива PRIVATE_GROUP_ID)
   - `BOT_USERNAME` - username бота без @ (опционально, но рекомендуется для работы кнопки "Поделиться")

2. Убедитесь, что функция `api/check-access` использует Node.js 22.x

## Использование папки notes как Obsidian Vault

### Настройка Obsidian

1. Откройте Obsidian
2. Выберите "Open folder as vault"
3. Укажите путь: `src/site/notes` (относительно корня проекта)
4. Теперь вы можете работать с заметками напрямую в Obsidian

### Структура заметок

Все `.md` файлы в папке `src/site/notes` автоматически обрабатываются и публикуются на сайте.

**Пример структуры:**
```
src/site/notes/
├── index.md              # Главная страница (index: true)
├── Запросы.md
├── Кейсы.md
├── Методика.md
└── Моя биография.md
```

### Frontmatter для статей

**Публичная статья:**
```yaml
---
title: "Публичная статья"
access: "public"
permalink: "Запросы"  # Без слэшей - они добавляются автоматически
---
```
`permalink` определяет URL статьи. Если указан `permalink: "Запросы"`, то URL будет `/Запросы/`. Этот permalink также используется в ссылке для шаринга (вместо длинного пути).

**Приватная статья:**
```yaml
---
title: "Приватная статья"
access: "private"
permalink: "Приватная"  # Без слэшей
---
```

**Главная страница:**
```yaml
---
title: "Главная"
access: "public"
index: true  # Указывает, что это главная страница
---
```
Для главной страницы используйте `index: true` вместо `permalink`. URL будет `/`.

**Статья без permalink (используется имя файла):**
```yaml
---
title: "Статья"
access: "public"
---
```
Если `permalink` не указан, используется имя файла. Если файл называется `Кейсы.md`, то URL будет `/notes/Кейсы/`.

### Синтаксис ссылок

Используйте стандартный синтаксис Obsidian для внутренних ссылок:

```markdown
[[Название статьи]]           # Ссылка на статью
[[Название статьи|Текст ссылки]]  # Ссылка с кастомным текстом
[[Название статьи#Заголовок]]  # Ссылка на заголовок в статье
```

### Callouts

Используйте синтаксис Obsidian callouts:

```markdown
> [!info] Заголовок
> Содержимое callout

> [!warning]+ Раскрытый callout
> Содержимое

> [!tip]- Свёрнутый callout
> Содержимое
```

**Доступные типы callouts:**
- `info`, `todo`
- `tip`, `hint`, `important`
- `success`, `check`, `done`
- `question`, `help`, `faq`
- `warning`, `caution`, `attention`
- `failure`, `fail`, `missing`
- `danger`, `error`
- `bug`
- `example`
- `quote`, `cite`
- `abstract`, `summary`, `tldr`

## Функция "Поделиться"

Внизу каждой статьи есть кнопка "Поделиться", которая:

1. Создаёт ссылку для открытия статьи в мини-приложении
2. Формат ссылки: `https://t.me/YourBot/YourApp?startapp=article_path`
3. При открытии ссылки мини-приложение автоматически переходит на нужную статью

**Как это работает:**
- При нажатии на кнопку открывается диалог шаринга Telegram
- Ссылка содержит параметр `start_param` с путём к статье
- При открытии ссылки мини-приложение читает `start_param` и перенаправляет на статью

## Запуск локально

```bash
npm start
```

Сайт будет доступен по адресу `http://localhost:8080`

## Сборка

```bash
npm run build
```

Собранный сайт будет в папке `dist/`

## Структура проекта

```
garden/
├── api/
│   └── check-access/          # Vercel Function для проверки доступа
│       └── index.js
├── lib/
│   └── telegram.js            # Вспомогательные функции для Telegram
├── src/
│   └── site/
│       ├── _includes/
│       │   ├── components/
│       │   │   ├── accessGate.njk      # Компонент проверки доступа
│       │   │   ├── shareButton.njk     # Кнопка поделиться
│       │   │   └── telegramAuth.njk   # Компонент защиты от копирования
│       │   └── layouts/
│       │       └── index.njk            # Основной layout
│       └── notes/                      # Markdown заметки (ваш Obsidian vault)
└── vercel.json                 # Конфигурация Vercel
```

## Защита контента

Приложение использует несколько уровней защиты:
- Telegram WebApp API (`disableSelection()`)
- Meta viewport (`user-scalable=no`)
- CSS (`user-select: none`)
- JavaScript (блокировка событий копирования)

## Стили

Интерфейс выполнен в стиле Telegram/Apple:
- Скругленные углы (12px для callouts, 8px для мелких элементов)
- Цветовая схема Telegram
- Плавные анимации
- Адаптивный дизайн

## Рабочий процесс

1. **Создание/редактирование статей:**
   - Откройте папку `src/site/notes` в Obsidian
   - Создавайте и редактируйте `.md` файлы
   - Используйте стандартный синтаксис Obsidian

2. **Публикация:**
   - Запустите `npm run build` для сборки
   - Или используйте `npm start` для разработки с автоперезагрузкой

3. **Деплой:**
   - Push в репозиторий
   - Vercel автоматически соберёт и задеплоит сайт

## Лицензия

ISC
