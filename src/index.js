require("dotenv").config();
const { createBot } = require("./bot");
const { initDb } = require("./database/db");

async function main() {
  await initDb();

  const bot = createBot();

  await bot.launch();
  console.log("Бот запущен");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
