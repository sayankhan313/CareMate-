import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { startMedicineReminderScheduler, stopMedicineReminderScheduler } from "./modules/notification/medicine-reminder.scheduler.js";

const port = Number(env.PORT) || 5001;
let isShuttingDown = false;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`CareMate+ backend running on http://0.0.0.0:${port}`);
  startMedicineReminderScheduler();
});

const shutdown = (signal: string) => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down CareMate+ backend.`);
  stopMedicineReminderScheduler();

  const forceShutdownTimer = setTimeout(() => {
    console.error("CareMate+ backend shutdown timed out.");
    process.exit(1);
  }, 10_000);

  forceShutdownTimer.unref();

  server.close(() => {
    void prisma.$disconnect().finally(() => {
      clearTimeout(forceShutdownTimer);
      process.exit(0);
    });
  });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));