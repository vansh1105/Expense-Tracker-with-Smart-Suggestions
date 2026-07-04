const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  total: {
    type: Number,
    required: true,
    default: 2500
  },
  categories: {
    food: { type: Number, default: 500 },
    transport: { type: Number, default: 300 },
    utilities: { type: Number, default: 400 },
    entertainment: { type: Number, default: 400 },
    healthcare: { type: Number, default: 300 },
    shopping: { type: Number, default: 400 },
    others: { type: Number, default: 200 }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Budget', BudgetSchema);
