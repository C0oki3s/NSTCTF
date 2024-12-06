const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const { signInUser } = require("./Controller/Cognito");
const cookieParser = require("cookie-parser");
const User = require("./models/NST"); // Import the User model
const jwt = require("jsonwebtoken");
const authCheck = require("./middleware/ValidateToken");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const html_to_pdf = require("html-pdf-node");
const createRateLimitMiddleware = require("./middleware/Ratelimit");
const sanitizerMiddleware = require("./middleware/xss");
require("dotenv").config();

const app = express();
app.use(cookieParser());
const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SEC,
  },
});

// Connect to MongoDB
try {
  mongoose.connect(
    "mongodb+srv://meticulousorbit:QrtPjErgFiDgLe3p@orbitshield.rq7a2br.mongodb.net/bankdb"
  );
  console.log("DB connected");
} catch (error) {
  console.log(error.message);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as view engine
app.set("view engine", "ejs");

app.use(sanitizerMiddleware);

const sanitizeInput = (input) => {
  const dangerousPatterns = [
    "--",
    ";",
    "/*",
    "*/",
    "union",
    "select",
    "insert",
    "drop",
    "update",
    "delete",
    "or",
    "=",
    "'",
  ];
  for (let pattern of dangerousPatterns) {
    if (input.toLowerCase().includes(pattern)) {
      return false; // Input contains dangerous patterns
    }
  }
  return true; // Safe input
};

// Routes
app.get("/", (req, res) => {
  res.render("signin", { error: null });
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide both email and password" });
  }

  if (!sanitizeInput(email) || !sanitizeInput(password)) {
    return res
      .status(400)
      .json({ error: "Dude, don't spam SQL payloads its anti SQL server" });
  }

  try {
    // Cognito sign-in
    let { accessToken, idToken, refreshToken } = await signInUser(
      email,
      password
    );
    let decodeToken = jwt.decode(idToken);
    const email_db = decodeToken["custom:email_db"];
    let user = await User.findOne({ email: email_db });

    if (!user) {
      user = new User({
        email: email_db,
        pdfs: [],
        money: email_db === "manager@nstbank.com" ? 137770000 : 0,
        accessToken,
      });
      await user.save();
    } else {
      // If user already exists, update the access token
      user.accessToken = accessToken;
      await user.save();
    }
    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("idToken", idToken, { httpOnly: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    res.json({
      accessToken,
      idToken,
      refreshToken,
      UserDetails: {
        email: email_db,
      },
    });
  } catch (error) {
    res.status(401).send(`
  <html>
    <head>
      <title>Authentication Failed</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333; text-align: center; padding: 20px;">
      <h1 style="color: #f44336;">Oops! Authentication Failed 😅</h1>
      <p>Oh, come on... you had ONE job! Just type in the correct user ID and password. How hard could it be?</p>
      
      <p>But hey, we all make mistakes. Here's a friendly suggestion: double-check your credentials and give it another shot.</p>
      
      <p><em>Still struggling?</em> Maybe it's time to consider that your memory isn't what it used to be. Don't worry, we won't tell anyone! 😜</p>
      
      <h3 style="color: #333;">Meanwhile, enjoy this comforting gif while you ponder life's mysteries:</h3>
      <img src="https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif" alt="Encouraging gif" style="max-width: 100%; border: none;"/>
      
      <p style="margin-top: 20px;">Need help? Contact our support team. Or, you know, just try logging in again with the <strong>right</strong> credentials. 😉</p>
    </body>
  </html>
`);
  }
});

app.use(createRateLimitMiddleware());

app.get("/dashboard", authCheck, async (req, res) => {
  try {
    const email = req.user["custom:email_db"];
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.render("dashboard", { user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/reports", authCheck, (req, res) => {
  const email = req.user["custom:email_db"];
  if (email === "manager@nstbank.com") {
    res.render("reports", { error: null });
  } else {
    return res.status(400).json({
      error:
        "So Close but need to login with manager@nstbank.com account Hint2: Your_account@nstbank.com",
      status: 400,
    });
  }
});

app.post("/reports", authCheck, async (req, res) => {
  const email = req.user["custom:email_db"];
  if (email != "manager@nstbank.com") {
    return res.status(400).json({
      error:
        "So Close but need to login with manager account Hint2: manager@nstbank.com",
      status: 400,
    });
  }

  const { manager_name, money, branch, address } = req.body;
  const userSub = req.user.sub;

  // Data for the PDF content
  const reportData = `
    <h1>${branch} End of Day Report</h1>
    <p>Manager: ${manager_name}</p>
    <p>Money: $${money}</p>
    <p>Branch Address: ${address}</p>
  `;

  const file = { content: reportData };

  // PDF options
  const options = {
    format: "A4",
    margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span class='title'></span>",
    printBackground: true,
  };

  try {
    // Generate PDF from HTML content
    let pdfBuffer = await html_to_pdf.generatePdf(file, options);

    // Generate unique filename with user's sub and timestamp
    const fileName = `reports/${userSub}/end_of_day_report_${Date.now()}.pdf`;

    // S3 upload parameters
    const uploadParams = {
      Bucket: "nstctf",
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    // Upload to S3
    await s3Client.send(new PutObjectCommand(uploadParams));

    const pdfUrl = `https://nstctf.s3.amazonaws.com/${fileName}`;

    // Find and update user in database
    await User.findOneAndUpdate(
      { email: req.user.email },
      { $push: { pdfs: pdfUrl } },
      { new: true }
    );

    // Render confirmation page
    res.render("avreports", {
      message: "Report Generated Successfully!",
      pdfLink: pdfUrl,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

app.get("/read", authCheck, async (req, res) => {
  try {
    const user_check = await User.findOne({
      email: req.user["custom:email_db"],
    });
    const user = await User.findOne({
      email: req.user.email,
    });

    if (!user_check) {
      return res.status(404).json({ error: "User not found" });
    }

    // Render the read page with user's PDFs
    res.render("read", {
      user: user,
      pdfs: user.pdfs || [],
    });
  } catch (error) {
    console.error("Error fetching PDFs:", error);
    res.status(500).send("Error retrieving reports");
  }
});

app.get("/api/pdfs", authCheck, async (req, res) => {
  try {
    // Find the current user
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user's PDFs
    res.json({ pdfs: user.pdfs || [] });
  } catch (error) {
    console.error("Error fetching PDFs:", error);
    res.status(500).json({ error: "Error retrieving reports" });
  }
});

app.get("/flag", authCheck, (req, res) => {
  res.render("flag", { message: null });
});

app.post("/flag", authCheck, async (req, res) => {
  const { flag } = req.body;

  if (!flag) {
    return res.status(400).json({ message: "Flag is required" });
  }

  try {
    const userEmail = req.user.email;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (flag === "NSTBank{SecureTr4ns4ct10ns_2024}") {
      user.flag = true;
      await user.save();
      res.render("flag", {
        message: "🎉 Congratulations! You've submitted the correct flag!",
      });
    } else {
      res.render("flag", { message: "❌ Incorrect flag. Please try again." });
    }
  } catch (err) {
    console.error("Error updating flag:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(80, () => {
  console.log("Server running on http://localhost:3000");
});
