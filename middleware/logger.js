const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;

  console.log(`[${timestamp}] ${method} ${url}`);

  res.on('finish', () => {
    console.log(`[${timestamp}] ${method} ${url} - ${res.statusCode}`);
  });

  next();
};

module.exports = requestLogger;
