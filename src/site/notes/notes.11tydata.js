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
      // По умолчанию "public", если не указано
      return data.access || "public";
    },
    shareParam: (data) => {
      // Чистый permalink для шаринга (транслитерированный, без слэшей, пробелов и лишних символов)
      let param;
      if (data.index === true) {
        param = "index";
      } else if (data.permalink) {
        param = data.permalink.replace(/^\/+|\/+$/g, '').trim();
        // Транслитерируем кириллицу в латиницу
        param = transliterate(param);
      } else {
        param = data.page.fileSlug;
        // Транслитерируем кириллицу в латиницу
        param = transliterate(param);
      }
      // Убираем все лишние пробелы и символы новой строки
      return param.replace(/\s+/g, '').replace(/\n/g, '');
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
