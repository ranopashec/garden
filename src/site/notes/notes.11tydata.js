const { transliterate } = require('../../helpers/translit');

module.exports = {
  eleventyComputed: {
    layout: () => "layouts/index.njk",
    permalink: (data) => {
      // Если это главная страница
      if (data.index === true) {
        return "/";
      }
      
      // Если указан permalink в frontmatter (без слэшей)
      if (data.permalink) {
        // Убираем слэши в начале и конце, транслитерируем, затем добавляем слэши программно
        let cleanPermalink = data.permalink.replace(/^\/+|\/+$/g, '').trim();
        // Транслитерируем кириллицу в латиницу
        cleanPermalink = transliterate(cleanPermalink);
        return `/${cleanPermalink}/`;
      }
      
      // По умолчанию используем fileSlug (транслитерированный)
      const fileSlug = transliterate(data.page.fileSlug);
      return `/notes/${fileSlug}/`;
    },
    access: (data) => {
      // Обрабатываем access из frontmatter
      // Возвращаем значение из frontmatter или undefined (что означает "none")
      // "public" - показывать всем
      // "private" - показывать только разрешённым пользователям
      // "none" или отсутствует - не показывать никому
      return data.access;
    },
    // Сохраняем оригинальный permalink для внутреннего использования
    originalPermalink: (data) => {
      if (data.index === true) {
        return "/";
      }
      if (data.permalink) {
        let cleanPermalink = data.permalink.replace(/^\/+|\/+$/g, '').trim();
        return `/${cleanPermalink}/`;
      }
      return `/notes/${data.page.fileSlug}/`;
    },
  },
};
