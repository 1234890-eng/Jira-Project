const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // ensures no two Super Admins have same username
  },
  password: {
    type: String,
    required: true,
  },
  email: String, // optional, but useful for forgot password
  resetToken: String,
  resetTokenExpires: Date
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
