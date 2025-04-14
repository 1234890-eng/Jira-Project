const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // optional
});

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
