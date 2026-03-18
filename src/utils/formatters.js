function formatExpenseList(expenses) {
  if (!expenses.length) {
    return "Расходов нет.";
  }

  return expenses
    .map((item) => {
      const date = new Date(item.created_at);
      const formattedDate = date.toLocaleString("ru-RU");
      const commentPart = item.comment ? ` — ${item.comment}` : "";

      return `• ${item.user_name}: ${item.amount} € — ${item.category}${commentPart} (${formattedDate})`;
    })
    .join("\n");
}

function formatCategoryStats(stats, total = 0) {
  if (!stats.length) {
    return "По категориям пока пусто.";
  }

  const totalAmount = Number(total) || 0;

  if (totalAmount <= 0) {
    return stats
      .map((item) => `• ${item.category}: ${Number(item.total) || 0} € (0.0%)`)
      .join("\n");
  }

  const precision = 10; // 1 знак после запятой (100% = 1000)

  const items = stats.map((item, index) => {
    const value = Number(item.total) || 0;
    const exact = (value / totalAmount) * 100;

    const scaled = exact * precision;
    const base = Math.floor(scaled);

    return {
      index,
      category: item.category,
      value,
      scaled,
      percent: base,
      remainder: scaled - base,
    };
  });

  const sumBase = items.reduce((sum, item) => sum + item.percent, 0);
  let diff = 100 * precision - sumBase;

  const sorted = [...items].sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < sorted.length && diff > 0; i += 1) {
    sorted[i].percent += 1;
    diff -= 1;
  }

  const finalItems = sorted.sort((a, b) => a.index - b.index);

  return finalItems
    .map((item) => {
      const percent = (item.percent / precision).toFixed(1);
      return `• ${item.category}: ${item.value} € (${percent}%)`;
    })
    .join("\n");
}

function formatUserStats(stats) {
  if (!stats.length) {
    return "По людям пока пусто.";
  }

  return stats.map((item) => `• ${item.user_name}: ${item.total} €`).join("\n");
}

function formatExpensePreview(expense) {
  const commentText = expense.comment
    ? `\n📝 Комментарий: ${expense.comment}`
    : "";

  return `💰 Сумма: ${expense.amount} €
📂 Категория: ${expense.category}${commentText}`;
}

module.exports = {
  formatExpenseList,
  formatCategoryStats,
  formatUserStats,
  formatExpensePreview,
};
