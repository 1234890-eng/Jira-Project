const mongoose = require('mongoose');
const clientSchema = new mongoose.Schema({
  organizationName: String,
  email: String,
  organizationType: String,
  gstNumber: String,
  registrationNumber: String,
  isActive: {
    type: Boolean,
    default: true
  }
});
