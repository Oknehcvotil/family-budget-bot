function formatDateForDb(date) {
  return date.toISOString();
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfTomorrow() {
  const today = getStartOfToday();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}

function getStartOfNextWeek() {
  const startOfWeek = getStartOfWeek();
  return new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 7,
  );
}

function getMonthRange(month, year) {
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    Number.isNaN(monthNumber) ||
    Number.isNaN(yearNumber) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    yearNumber < 2000 ||
    yearNumber > 2100
  ) {
    return null;
  }

  return {
    start: new Date(yearNumber, monthNumber - 1, 1),
    end: new Date(yearNumber, monthNumber, 1),
  };
}

function getYearRange(year) {
  const yearNumber = Number(year);

  if (Number.isNaN(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
    return null;
  }

  return {
    start: new Date(yearNumber, 0, 1),
    end: new Date(yearNumber + 1, 0, 1),
  };
}

module.exports = {
  formatDateForDb,
  getStartOfToday,
  getStartOfTomorrow,
  getStartOfWeek,
  getStartOfNextWeek,
  getMonthRange,
  getYearRange,
};
