const categories = [
  {
    key: "housing",
    label: "Жилье и коммунальные услуги",
    icon: "🏠",
    shortLabel: "Жилье",
  },
  {
    key: "products",
    label: "Продукты",
    icon: "🛒",
    shortLabel: "Продукты",
  },
  {
    key: "fun",
    label: "Развлечения",
    icon: "🎉",
    shortLabel: "Развлечения",
  },
  {
    key: "restaurants",
    label: "Кафе и рестораны",
    icon: "🍽️",
    shortLabel: "Кафе",
  },
  {
    key: "household",
    label: "Быт",
    icon: "🧹",
    shortLabel: "Быт",
  },
  {
    key: "transport",
    label: "Транспорт",
    icon: "🚗",
    shortLabel: "Транспорт",
  },
  {
    key: "clothes",
    label: "Одежда и обувь",
    icon: "👕",
    shortLabel: "Одежда",
  },
  {
    key: "kids",
    label: "Дети",
    icon: "🧸",
    shortLabel: "Дети",
  },
  {
    key: "health",
    label: "Здоровье",
    icon: "💊",
    shortLabel: "Здоровье",
  },
  {
    key: "other",
    label: "Другое",
    icon: "📦",
    shortLabel: "Другое",
  },
];

const categoryMap = Object.fromEntries(
  categories.map((category) => [category.key, category.label]),
);

const categoryButtonMap = Object.fromEntries(
  categories.map((category) => [
    category.key,
    `${category.icon} ${category.shortLabel || category.label}`,
  ]),
);

const categoriesHint = categories
  .map((item) => `• ${item.icon} ${item.label}`)
  .join("\n");

module.exports = {
  categories,
  categoryMap,
  categoryButtonMap,
  categoriesHint,
};
