export function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, path, query } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`\x1b[34m[HTTP]\x1b[0m ${method} ${path} ${statusColor}${res.statusCode}\x1b[0m ${ms}ms`);
  });

  next();
}
