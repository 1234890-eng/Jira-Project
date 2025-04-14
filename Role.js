const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9 _-]+$/
  }
});

module.exports = mongoose.model('Role', roleSchema);
