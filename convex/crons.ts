import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Crons quotidiens immonpl. 08:00 UTC = 04:00 Guadeloupe (hors heures
// cabinet). Horaires décalés pour éviter le chevauchement.
const crons = cronJobs();

crons.daily(
  "referentials-refresh",
  { hourUTC: 8, minuteUTC: 0 },
  internal.referentials.refreshAll,
  {},
);

crons.daily(
  "casedrafts-cleanup",
  { hourUTC: 8, minuteUTC: 30 },
  internal.caseDrafts.cleanupExpired,
  {},
);

crons.daily(
  "secibfetchlog-purge",
  { hourUTC: 9, minuteUTC: 0 },
  internal.secibFetchLog.purgeOld,
  {},
);

export default crons;
