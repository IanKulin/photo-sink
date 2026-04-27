const DEFAULT_IDLE_HOURS = 24;
const idleHours = Number(process.env.SESSION_IDLE_TIMEOUT_HOURS ?? DEFAULT_IDLE_HOURS);
const IDLE_TIMEOUT_MS = idleHours * 60 * 60 * 1000;

export default function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect("/login");
  }

  const now = Date.now();
  const lastActivity = req.session.lastActivity ?? 0;

  if (now - lastActivity > IDLE_TIMEOUT_MS) {
    req.session.destroy(() => {});
    return res.redirect("/login");
  }

  req.session.lastActivity = now;
  res.locals.user = req.session.username;
  next();
}
