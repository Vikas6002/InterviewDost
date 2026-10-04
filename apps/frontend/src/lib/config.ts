export const BACKEND_URL: string = (() => {
  try {
    return process.env.BACKEND_URL || "http://localhost:3001";
  } catch {
    return "http://localhost:3001";
  }
})();
