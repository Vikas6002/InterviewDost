export const BACKEND_URL = (() => {
  try { return process.env.BACKEND_URL; } catch { return "http://localhost:3001"; }
})();
