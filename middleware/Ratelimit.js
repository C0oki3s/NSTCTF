const rateLimit = require("express-rate-limit");

const createRateLimitMiddleware = (options = {}) => {
  const rateLimitConfig = {
    windowMs: 3 * 60 * 1000, // 3 minutes
    max: 50, // limit each user to 50 requests per windowMs
    message:
      "Oops! You've hit the rate limit. Take a breather and try again soon!",
    ...options,
  };
  const windowMinutes = rateLimitConfig.windowMs / (60 * 1000);

  return rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    message: rateLimitConfig.message,
    keyGenerator: (req) => {
      // Use the user's sub as the unique key for rate limiting
      return req.user && req.user.sub ? req.user.sub : req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(429).send(`
  <html>
    <head>
      <title>Rate Limiting Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <h1 style="color: #f44336;">Oh, how we loved the good ol' days when we agreed on no rate limiting...</h1>
      <p>But surprise! 🎉 You've now got rate limiting on your dashboard! Because, you know, why not make things more interesting, right? 😉</p>
      
      <p>We decided that each user can only make up to <strong>${rateLimitConfig.max}</strong> requests in a ${windowMinutes}-minute window. Sounds fun, doesn't it?</p>
      
      <p>Don't worry, we're not <em>that</em> mean. If you hit the limit, we'll just let you know:</p>
      <p><em>${rateLimitConfig.message}</em></p>
      
      <p>And, of course, here's a fun gif to help lighten the mood! 🎉</p>
      <img src="https://media.giphy.com/media/3o7TKPhCpqFus4gJxG/giphy.gif" alt="Fun gif" style="max-width: 100%; border: none;"/>

      <h2>Rate limiting is in place! 🎉</h2>
    </body>
  </html>
`);
    },
  });
};

module.exports = createRateLimitMiddleware;
