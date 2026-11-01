// Runs once in Jest's parent process, before the workers start, so they inherit it. (A setup file
// can't do this: tests see a copy of process.env that Date never reads.)
// One time zone with daylight saving for every run, local and CI, so date tests cross real clock
// changes (Europe moves the clock on 2026-03-29 and 2026-10-25) instead of passing trivially in UTC.
module.exports = () => {
  process.env.TZ = 'Europe/Belgrade';
};
