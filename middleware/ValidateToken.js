const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { SimpleJwksCache } = require("aws-jwt-verify/jwk");
const { SimpleJsonFetcher } = require("aws-jwt-verify/https");
const jwt = require("jsonwebtoken");
const User = require("../models/NST"); // Import the User model

const verifier = CognitoJwtVerifier.create(
  {
    userPoolId: "us-east-1_yLq07nFjp", // Replace with your User Pool ID
    tokenUse: "id", // "access" for access tokens or "id" for ID tokens
    clientId: "1jpo6nviamf5obo8cluuo8e0j3", // Replace with your Client ID
  },
  {
    jwksCache: new SimpleJwksCache({
      fetcher: new SimpleJsonFetcher({
        defaultRequestOptions: {
          responseTimeout: 5000, // Timeout set to 5000 ms (5 seconds)
        },
      }),
    }),
  }
);

const removeAccessTokenFromDB = async (email) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: email },
      { $unset: { accessToken: "" } },
      { new: true }
    );
  } catch (error) {
    console.error("Error removing access token from DB:", error.message);
  }
};

const authCheck = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Extract the token from "Bearer <token>" format
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.idToken) {
    token = req.cookies.idToken;
  }

  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const payload = await verifier.verify(token);

    req.user = payload;

    next();
  } catch (err) {
    try {
      const decodetoken = jwt.decode(req.cookies.idToken) || null;
      const email_db = decodetoken["custom:email_db"];

      if (email_db) {
        // Remove the access token from the DB
        await removeAccessTokenFromDB(email_db);
      }
      return res.redirect("/");
    } catch (error) {
      return res.status(401).json({ error: "Authorization Invalid Token" });
    }
  }
};

module.exports = authCheck;
