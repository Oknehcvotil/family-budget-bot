# family-budget-bot

A Telegram bot for family expense tracking. Supports adding expenses by category, monthly limits, period reports, and access control per user.

## Requirements

- Node.js 20+
- npm

## Installation

```bash
git clone https://github.com/Oknehcvotil/family-budget-bot.git
cd family-budget-bot
npm ci
```

## Configuration

Create a `.env` file in the project root:

```env
BOT_TOKEN=your_telegram_bot_token

# Telegram user IDs allowed to use the bot (comma-separated)
ALLOWED_USER_IDS=111111111,222222222

# Individual user IDs (used for display names and gender)
KIRILL_ID=111111111
LILIA_ID=222222222

# Admin user ID (can run /cleardb and see the admin menu button)
ADMIN_USER_ID=111111111
```

> To get your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

## Running

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

## Commands

| Command    | Description                                      |
| ---------- | ------------------------------------------------ |
| `/start`   | Welcome message + main menu                      |
| `/help`    | Help and available commands                      |
| `/add`     | Add an expense                                   |
| `/delete`  | Delete your last expense                         |
| `/today`   | Report for today                                 |
| `/week`    | Report for the current week                      |
| `/month`   | Pick a month to report on                        |
| `/year`    | Pick a year to report on                         |
| `/all`     | Report for all time                              |
| `/limit`   | View or set monthly spending limit               |
| `/cleardb` | ⚠️ Admin only — clear all data from the database |

## Adding an expense

1. Send `/add` or tap **Add expense** in the menu.
2. Enter the amount and an optional comment:
   ```
   150
   150 coffee
   45 taxi home
   ```
3. Select a category from the inline keyboard.

## Expense categories

🏠 Housing · 🛒 Groceries · 🎉 Entertainment · 🍽️ Cafes & Restaurants · 🧹 Household · 👗 Clothing · 💊 Health · 🚗 Transport · ✈️ Travel · 📦 Other

## Project structure

```
src/
  bot.js              # Bot setup and handler registration
  index.js            # Entry point
  config/             # Categories, users, months, env
  constants/          # Message templates
  database/           # SQLite access layer (budget.db)
  handlers/           # Command and action handlers
  keyboards/          # Inline and reply keyboard builders
  services/           # Business logic (expenses, limits, reports)
  state/              # Per-user state (input flow)
  utils/              # Auth, date helpers, formatters
```

## Deployment

The bot uses **long polling** and stores data in a local **SQLite file** (`budget.db`), so it must run on a persistent server — not a serverless platform.

**Recommended: VPS + PM2**

```bash
npm install -g pm2
npm ci
pm2 start src/index.js --name family-budget-bot
pm2 save
pm2 startup
```
