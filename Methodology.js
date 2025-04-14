const mongoose = require('mongoose');

const methodologySchema = new mongoose.Schema({
  boardName: { type: String, required: true },
  taskTitle: { type: String, required: true },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['new', 'high'], required: true },
  status: { type: String, enum: ['new', 'high', 'blocked'], required: true },
  wipLimit: { type: Number, required: true },
  issueType: { type: String, enum: ['yes', 'no'], required: true },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String }
}, { timestamps: true });

// Add validation to require blockedReason if isBlocked is true
methodologySchema.pre('save', function (next) {
  if (this.isBlocked && !this.blockedReason) {
    return next(new Error('Blocked reason is required if status is blocked.'));
  }
  next();
});

module.exports = mongoose.model('Methodology', methodologySchema);
