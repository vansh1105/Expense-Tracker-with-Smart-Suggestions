// SmartSpend Express API Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = require('./middleware/auth');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Budget = require('./models/Budget');
const Goal = require('./models/Goal');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartspend';
const JWT_SECRET = process.env.JWT_SECRET || 'smartspend_jwt_secret_key_123';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully!'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- AUTHENTICATION ROUTES ---

// @route   POST api/auth/signup
// @desc    Register a new user
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({ username, email, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create default budget configuration for the new user
    const defaultBudget = new Budget({
      userId: user.id,
      total: 2500,
      categories: {
        food: 500,
        transport: 300,
        utilities: 400,
        entertainment: 400,
        healthcare: 300,
        shopping: 400,
        others: 200
      }
    });
    await defaultBudget.save();

    // Create a default Goal as requested: "Save ₹50,000 for a laptop"
    const defaultGoal = new Goal({
      userId: user.id,
      title: 'Save for Laptop',
      targetAmount: 50000,
      currentAmount: 12500, // starting progress
      category: 'shopping'
    });
    await defaultGoal.save();

    // Return JWT token
    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/auth/me
// @desc    Get current user profile details
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- EXPENSES CRUD ROUTES ---

// Get all user expenses
app.get('/api/expenses', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add new expense
app.post('/api/expenses', auth, async (req, res) => {
  const { title, amount, category, date, description } = req.body;
  try {
    const newExpense = new Expense({
      userId: req.user.id,
      title,
      amount,
      category,
      date,
      description
    });
    const expense = await newExpense.save();
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update expense
app.put('/api/expenses/:id', auth, async (req, res) => {
  const { title, amount, category, date, description } = req.body;
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });
    
    // Check owner
    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: { title, amount, category, date, description } },
      { new: true }
    );
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete expense
app.delete('/api/expenses/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });
    
    // Check owner
    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- BUDGET CONFIG ENDPOINTS ---

// Get budget settings
app.get('/api/budget', auth, async (req, res) => {
  try {
    let budget = await Budget.findOne({ userId: req.user.id });
    if (!budget) {
      // Setup default if none
      budget = new Budget({ userId: req.user.id });
      await budget.save();
    }
    res.json(budget);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save or Update budget settings
app.post('/api/budget', auth, async (req, res) => {
  const { total, categories } = req.body;
  try {
    let budget = await Budget.findOne({ userId: req.user.id });
    if (budget) {
      budget.total = total;
      budget.categories = categories;
      budget.updatedAt = Date.now();
      await budget.save();
    } else {
      budget = new Budget({
        userId: req.user.id,
        total,
        categories
      });
      await budget.save();
    }
    res.json(budget);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- SAVINGS GOALS CRUD ROUTING ---

// Get all savings goals
app.get('/api/goals', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add a goal
app.post('/api/goals', auth, async (req, res) => {
  const { title, targetAmount, currentAmount, category, deadline } = req.body;
  try {
    const newGoal = new Goal({
      userId: req.user.id,
      title,
      targetAmount,
      currentAmount,
      category,
      deadline
    });
    const goal = await newGoal.save();
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update goal (edit or add funds)
app.put('/api/goals/:id', auth, async (req, res) => {
  const { title, targetAmount, currentAmount, category, deadline } = req.body;
  try {
    let goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ msg: 'Goal not found' });

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (targetAmount !== undefined) updateFields.targetAmount = targetAmount;
    if (currentAmount !== undefined) updateFields.currentAmount = currentAmount;
    if (category !== undefined) updateFields.category = category;
    if (deadline !== undefined) updateFields.deadline = deadline;

    goal = await Goal.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete goal
app.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ msg: 'Goal not found' });

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Goal.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Goal removed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(require('path').resolve(__dirname, 'dist', 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => console.log(`SmartSpend backend server running on port ${PORT}`));
