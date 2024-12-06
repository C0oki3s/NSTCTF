const sanitizeHtml = (input) => {
  if (!input || typeof input !== "string") {
    return input;
  }

  const allowedTags = ["iframe"];
  const tagRegex = /<\/?([a-zA-Z0-9]+)\b[^>]*>/g;

  return input.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return match;
    }
    return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });
};

const sanitizerMiddleware = (req, res, next) => {
  for (const key in req.query) {
    if (req.query.hasOwnProperty(key)) {
      req.query[key] = sanitizeHtml(req.query[key]);
    }
  }

  if (req.body && typeof req.body === "object") {
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        req.body[key] = sanitizeHtml(req.body[key]);
      }
    }
  }

  for (const key in req.params) {
    if (req.params.hasOwnProperty(key)) {
      req.params[key] = sanitizeHtml(req.params[key]);
    }
  }

  next();
};

module.exports = sanitizerMiddleware;
