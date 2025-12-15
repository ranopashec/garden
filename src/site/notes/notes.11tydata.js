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
        // Убираем слэши в начале и конце, затем добавляем их программно
        let cleanPermalink = data.permalink.replace(/^\/+|\/+$/g, '');
        return `/${cleanPermalink}/`;
      }
      
      // По умолчанию используем fileSlug
      return `/notes/${data.page.fileSlug}/`;
    },
    access: (data) => {
      // Обрабатываем access из frontmatter
      // По умолчанию "public", если не указано
      return data.access || "public";
    },
    shareParam: (data) => {
      // Чистый permalink для шаринга (без слэшей, пробелов и лишних символов)
      let param;
      if (data.index === true) {
        param = "index";
      } else if (data.permalink) {
        param = data.permalink.replace(/^\/+|\/+$/g, '').trim();
      } else {
        param = data.page.fileSlug;
      }
      // Убираем все лишние пробелы и символы новой строки
      return param.replace(/\s+/g, '').replace(/\n/g, '');
    },
  },
};
