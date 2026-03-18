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

function formatCategoryStats(stats) {
  if (!stats.length) {
    return "По категориям пока пусто.";
  }

  return stats.map((item) => `• ${item.category}: ${item.total} €`).join("\n");
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
