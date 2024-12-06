const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      default: "NST BANK",
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    money: {
      type: Number,
      default: 500, // Static value
      min: 0,
    },
    pdfs: {
      type: [String], // Array of PDF URLs
      default: [],
      validate: {
        validator: function (v) {
          return v.every((url) => /^(https?:\/\/).*\.pdf$/.test(url));
        },
        message: (props) => `Some PDF URLs are invalid!`,
      },
    },
    accessToken: {
      type: String, // Store the access token
      required: true, // Make this required if you want to ensure the token is always present
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
