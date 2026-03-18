const categories = [
  { key: "apartment", label: "Квартира" },
  { key: "utilities", label: "Коммунальные" },
  { key: "fun", label: "Развлечения" },
  { key: "products", label: "Продукты" },
  { key: "clothes", label: "Одежда" },
  { key: "other", label: "Разное" },
];

const categoryMap = Object.fromEntries(
  categories.map((category) => [category.key, category.label]),
);

const categoriesHint = categories.map((item) => `• ${item.label}`).join("\n");

module.exports = {
  categories,
  categoryMap,
  categoriesHint,
};
