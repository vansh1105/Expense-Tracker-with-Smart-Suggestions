/**
 * Expense Tracker - Main Controller
 * Orchestrates CRUD, filters, state, CSV handling, modals, and updates charts and analytics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- MERN API config ---
  const API_URL = 'http://localhost:5000/api';
  let activeGoalIdForFunds = null;

  // Helper for auth headers
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  // API Call helper
  async function apiCall(endpoint, method = 'GET', body = null) {
    const config = {
      method,
      headers: getHeaders()
    };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_URL}${endpoint}`, config);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.msg || `Request failed with code ${response.status}`);
    }
    return response.json();
  }

  // --- App State ---
  let expenses = [];
  let goals = [];
  let budget = {
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
  };
  let currentMonthKey = ''; // Format: YYYY-MM
  let editingExpenseId = null;
  let activeTab = 'dashboard';

  // --- HTML Elements ---
  const tabButtons = document.querySelectorAll('.nav-item button');
  const views = document.querySelectorAll('.app-view');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const monthSelector = document.getElementById('month-selector');
  const addExpenseBtn = document.getElementById('add-expense-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const importCsvBtn = document.getElementById('import-csv-btn');
  
  // Modals
  const expenseModal = document.getElementById('expense-modal');
  const budgetModal = document.getElementById('budget-modal');
  const importModal = document.getElementById('import-modal');
  const modalCloseBtns = document.querySelectorAll('.modal-close-btn, .btn-close-modal');
  
  // Forms
  const expenseForm = document.getElementById('expense-form');
  const budgetForm = document.getElementById('budget-form');
  const csvImportForm = document.getElementById('csv-import-form');
  
  // Dashboard Metrics
  const totalSpendVal = document.getElementById('total-spend-val');
  const totalBudgetVal = document.getElementById('total-budget-val');
  const budgetPercentVal = document.getElementById('budget-percent-val');
  const budgetProgressBar = document.getElementById('budget-progress-bar');
  const dailyAverageVal = document.getElementById('daily-average-val');
  const topCategoryVal = document.getElementById('top-category-val');
  const highestSpendDayVal = document.getElementById('highest-spend-day-val');
  
  // Transactions Page
  const transactionTableBody = document.getElementById('transaction-table-body');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const startDateFilter = document.getElementById('start-date-filter');
  const endDateFilter = document.getElementById('end-date-filter');
  
  // Suggestions & Banners
  const suggestionsContainer = document.getElementById('suggestions-container');
  const globalAlertBanner = document.getElementById('global-alert-banner');
  const alertBannerText = document.getElementById('alert-banner-text');
  const closeAlertBannerBtn = document.getElementById('close-alert-banner');

  // Budget setup input items
  const totalBudgetInput = document.getElementById('budget-total-input');

  // AI Chatbot UI elements
  const aiChatToggleFab = document.getElementById('ai-chat-toggle-fab');
  const aiChatDrawer = document.getElementById('ai-chat-drawer');
  const aiChatCloseBtn = document.getElementById('ai-chat-close-btn');
  const aiSettingsToggleBtn = document.getElementById('ai-settings-toggle-btn');
  const aiApiConfigPanel = document.getElementById('ai-api-config-panel');
  const aiApiKeyInput = document.getElementById('ai-api-key-input');
  const aiApiKeySaveBtn = document.getElementById('ai-api-key-save-btn');
  const aiChatMessages = document.getElementById('ai-chat-messages');
  const aiChatForm = document.getElementById('ai-chat-form');
  const aiChatInput = document.getElementById('ai-chat-input');
  
  // --- Sample Mock Data ---
  const sampleExpenses = [
    { id: '1', title: 'Weekly Grocery Shopping', amount: 142.50, category: 'food', date: '', description: 'Whole Foods organic groceries' },
    { id: '2', title: 'Monthly Electric Bill', amount: 185.00, category: 'utilities', date: '', description: 'Summer air conditioning costs' },
    { id: '3', title: 'Petrol Refuel', amount: 65.00, category: 'transport', date: '', description: 'Full tank unleaded' },
    { id: '4', title: 'Movie Night & Snacks', amount: 48.00, category: 'entertainment', date: '', description: 'Cinema tickets and popcorn' },
    { id: '5', title: 'Gym Membership', amount: 60.00, category: 'entertainment', date: '', description: 'Monthly fitness subscription' },
    { id: '6', title: 'Prescription Refill', amount: 35.00, category: 'healthcare', date: '', description: 'Allergy medication' },
    { id: '7', title: 'Designer Shoes', amount: 245.00, category: 'shopping', date: '', description: 'Leather boots sale' },
    { id: '8', title: 'Dinner at Steakhouse', amount: 120.00, category: 'food', date: '', description: 'Anniversary celebration' },
    { id: '9', title: 'Uber Commute', amount: 28.50, category: 'transport', date: '', description: 'Travel to client office' },
    { id: '10', title: 'Internet Fiber Bill', amount: 80.00, category: 'utilities', date: '', description: 'High speed home internet' }
  ];

  // --- Toast System ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'danger') iconName = 'ban';

    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 50);
    
    // Animate out & remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Initialize App ---
  async function init() {
    // Determine current month key
    const today = new Date();
    currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Setup Month Selector options
    populateMonthSelectorOptions(today);
    monthSelector.value = currentMonthKey;

    // Load theme
    const savedTheme = localStorage.getItem('expense-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);

    // Initialize Charts Manager
    ChartsManager.init('categoryChartCanvas', 'trendChartCanvas', savedTheme === 'dark');

    // Attach Event Listeners
    setupEventListeners();

    // Check if token exists
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await loadUserData();
      } catch (err) {
        console.error('Session expired or server error:', err);
        localStorage.removeItem('token');
        showAuthOverlay();
      }
    } else {
      showAuthOverlay();
    }

    // Load AI Advisor status
    if (aiApiKeyInput) {
      aiApiKeyInput.value = AIService.getApiKey();
    }
    addWelcomeMessage();
  }

  function showAuthOverlay() {
    document.getElementById('auth-overlay').classList.add('active');
  }

  function hideAuthOverlay() {
    document.getElementById('auth-overlay').classList.remove('active');
  }

  async function loadUserData() {
    hideAuthOverlay();
    try {
      // Get user profile
      const user = await apiCall('/auth/me');
      document.getElementById('user-display-name').textContent = user.username;
      
      const initials = user.username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('user-avatar-initials').textContent = initials || 'U';

      // Load expenses
      expenses = await apiCall('/expenses');

      // Load budget
      const budgetData = await apiCall('/budget');
      budget = {
        total: budgetData.total,
        categories: budgetData.categories
      };

      // Load goals
      goals = await apiCall('/goals');

      // Render Everything
      renderAll();
    } catch (err) {
      showToast(`Error loading data: ${err.message}`, 'danger');
      throw err;
    }
  }

  // Populate Month Selector with current + past 6 months
  function populateMonthSelectorOptions(baseDate) {
    monthSelector.innerHTML = '';
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 0; i < 8; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthSelector.appendChild(option);
    }
  }

  // Update theme toggle UI elements
  function updateThemeToggleUI(theme) {
    const isDark = theme === 'dark';
    themeToggleBtn.innerHTML = isDark 
      ? '<i data-lucide="sun"></i> Light Mode' 
      : '<i data-lucide="moon"></i> Dark Mode';
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Render Functions ---
  function renderAll() {
    renderDashboard();
    renderTransactionsTable();
    renderBudgetSetup();
    renderGoals();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ChartsManager.update(expenses, budget, currentMonthKey, isDark);
    
    // Recalculate and update icons via Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 1. Render Dashboard tab metrics and list
  function renderDashboard() {
    const currentMonthExpenses = AnalyticsEngine.getExpensesForMonth(expenses, currentMonthKey);
    const totalSpent = AnalyticsEngine.calculateTotalSpend(currentMonthExpenses);
    
    // Update metric counters
    totalSpendVal.textContent = `₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalBudgetVal.textContent = `₹${(budget.total || 0).toLocaleString('en-IN')}`;
    
    // Progress calculation
    const pct = budget.total > 0 ? Math.round((totalSpent / budget.total) * 100) : 0;
    budgetPercentVal.textContent = `${pct}%`;
    
    // Style and fill progress bar
    budgetProgressBar.className = 'progress-bar-fill';
    budgetProgressBar.style.width = `${Math.min(pct, 100)}%`;
    if (pct >= 100) {
      budgetProgressBar.classList.add('danger');
    } else if (pct >= 85) {
      budgetProgressBar.classList.add('warning');
    } else {
      budgetProgressBar.classList.add('normal');
    }

    // Daily Average
    const forecast = AnalyticsEngine.calculateMonthEndForecast(expenses, currentMonthKey, budget.total);
    dailyAverageVal.textContent = `₹${forecast.dailyAverage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // AI Spending Prediction Display
    const aiPredictionVal = document.getElementById('ai-prediction-val');
    const predictionTagStatus = document.getElementById('prediction-tag-status');
    if (aiPredictionVal && predictionTagStatus) {
      aiPredictionVal.textContent = `You'll spend approximately ₹${forecast.forecastAmount.toLocaleString('en-IN')} by the end of the month.`;
      if (budget.total > 0) {
        if (forecast.forecastAmount > budget.total) {
          predictionTagStatus.textContent = 'Budget Risk';
          predictionTagStatus.className = 'category-badge cat-food';
        } else {
          predictionTagStatus.textContent = 'On Track';
          predictionTagStatus.className = 'category-badge cat-healthcare';
        }
      } else {
        predictionTagStatus.textContent = 'No Limit';
        predictionTagStatus.className = 'category-badge cat-others';
      }
    }

    // Top Category
    const categorySpend = AnalyticsEngine.calculateSpendByCategory(currentMonthExpenses);
    const topCat = Object.keys(categorySpend).reduce((a, b) => categorySpend[a] > categorySpend[b] ? a : b, null);
    if (topCat && categorySpend[topCat] > 0) {
      topCategoryVal.textContent = topCat.charAt(0).toUpperCase() + topCat.slice(1);
    } else {
      topCategoryVal.textContent = 'None';
    }

    // Highest Spend Day of Week
    if (currentMonthExpenses.length > 0) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const daySpends = Array(7).fill(0);
      currentMonthExpenses.forEach(e => {
        daySpends[new Date(e.date).getDay()] += Number(e.amount);
      });
      const topDayIdx = daySpends.reduce((maxIdx, currentSum, idx, arr) => currentSum > arr[maxIdx] ? idx : maxIdx, 0);
      highestSpendDayVal.textContent = daySpends[topDayIdx] > 0 ? days[topDayIdx] : 'N/A';
    } else {
      highestSpendDayVal.textContent = 'N/A';
    }

    // Global Alert Banner check
    if (pct >= 100) {
      globalAlertBanner.style.display = 'flex';
      alertBannerText.textContent = `CRITICAL WARNING: You have exceeded your monthly budget by ₹${Math.round(totalSpent - budget.total).toLocaleString('en-IN')}! Please review your smart insights below.`;
    } else if (pct >= 85) {
      globalAlertBanner.style.display = 'flex';
      alertBannerText.textContent = `WARNING: You have consumed ${pct}% of your monthly budget. Only ₹${Math.round(budget.total - totalSpent).toLocaleString('en-IN')} remains.`;
    } else {
      globalAlertBanner.style.display = 'none';
    }

    // Suggestions / Saving insights
    renderInsightsList();
  }

  // Render Savings Goals List
  function renderGoals() {
    const container = document.getElementById('goals-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (goals.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">No active goals yet. Click 'New Goal' to start saving!</div>`;
      return;
    }

    goals.forEach(goal => {
      const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
      const div = document.createElement('div');
      div.className = 'goal-item';
      div.innerHTML = `
        <div class="goal-info-row">
          <span class="goal-title-text">${escapeHtml(goal.title)}</span>
          <span class="goal-amounts-text">
            ₹${goal.currentAmount.toLocaleString('en-IN')} / <span class="goal-target-val">₹${goal.targetAmount.toLocaleString('en-IN')}</span>
          </span>
        </div>
        <div class="goal-progress-container">
          <div class="goal-progress-bar-bg">
            <div class="goal-progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="goal-actions-row">
            <span class="goal-percent-text">${percent}% Saved</span>
            <div class="goal-buttons">
              <button class="btn-goal-action add-funds" data-id="${goal._id}">
                <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add Funds
              </button>
              <button class="btn-goal-action delete-goal" data-id="${goal._id}">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    // Attach goal event listeners
    container.querySelectorAll('.add-funds').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openAddFundsModal(id);
      });
    });

    container.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteGoal(id);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Render Smart Saving Insights Panel
  function renderInsightsList() {
    suggestionsContainer.innerHTML = '';
    const insights = AnalyticsEngine.generateInsights(expenses, budget, currentMonthKey);

    if (insights.length === 0) {
      suggestionsContainer.innerHTML = `
        <div class="empty-suggestions">
          <i data-lucide="thumbs-up"></i>
          <p>No issues detected! Your spending is currently in excellent shape.</p>
        </div>
      `;
      return;
    }

    insights.forEach(item => {
      const card = document.createElement('div');
      card.className = `suggestion-card alert-${item.type}`;
      const iconName = item.icon.replace('lucide-', '');
      card.innerHTML = `
        <div class="suggestion-icon-wrap">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="suggestion-content">
          <div class="suggestion-title">${item.title}</div>
          <div class="suggestion-desc">${item.desc}</div>
        </div>
      `;
      suggestionsContainer.appendChild(card);
    });
  }

  // 2. Render Transactions Log Tab
  function renderTransactionsTable() {
    transactionTableBody.innerHTML = '';
    
    // Filters
    const query = searchInput.value.toLowerCase().trim();
    const catVal = categoryFilter.value;
    const startVal = startDateFilter.value;
    const endVal = endDateFilter.value;

    const filteredExpenses = expenses.filter(exp => {
      // Month selector limit
      const expMonth = AnalyticsEngine.getMonthYearKey(exp.date);
      if (expMonth !== currentMonthKey) return false;

      // Text query
      if (query && !exp.title.toLowerCase().includes(query) && !exp.description.toLowerCase().includes(query)) {
        return false;
      }

      // Category
      if (catVal && exp.category !== catVal) {
        return false;
      }

      // Date Range
      if (startVal && exp.date < startVal) return false;
      if (endVal && exp.date > endVal) return false;

      return true;
    });

    // Sort by date descending
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredExpenses.length === 0) {
      transactionTableBody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <i data-lucide="info"></i>
              <p>No transactions found matching the filters for this month.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    filteredExpenses.forEach(exp => {
      const tr = document.createElement('tr');
      const formattedDate = new Date(exp.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const categoryLabel = exp.category.charAt(0).toUpperCase() + exp.category.slice(1);
      
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600;">${escapeHtml(exp.title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(exp.description || 'No description')}</div>
        </td>
        <td>
          <span class="category-badge cat-${exp.category}">
            ${getCategoryIconHtml(exp.category)}
            ${categoryLabel}
          </span>
        </td>
        <td class="expense-date-col">${formattedDate}</td>
        <td class="expense-amount-col">₹${Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>
          <div class="action-btns">
            <button class="btn-action edit" data-id="${exp._id || exp.id}" title="Edit Expense">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              <span>Edit</span>
            </button>
            <button class="btn-action delete" data-id="${exp._id || exp.id}" title="Delete Expense">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              <span>Delete</span>
            </button>
          </div>
        </td>
      `;
      transactionTableBody.appendChild(tr);
    });

    // Add action buttons event listeners
    transactionTableBody.querySelectorAll('.btn-action.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openExpenseModalForEdit(id);
      });
    });

    transactionTableBody.querySelectorAll('.btn-action.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteExpenseRecord(id);
      });
    });
  }

  // Get SVG/Lucide markup for a category
  function getCategoryIconHtml(cat) {
    const icons = {
      food: 'utensils',
      transport: 'car',
      utilities: 'zap',
      entertainment: 'sparkles',
      healthcare: 'activity',
      shopping: 'shopping-bag',
      others: 'help-circle'
    };
    const iconName = icons[cat] || 'help-circle';
    return `<i data-lucide="${iconName}" style="width: 12px; height: 12px;"></i>`;
  }

  // 3. Render Budget Settings tab details
  function renderBudgetSetup() {
    totalBudgetInput.value = budget.total;
    
    // Fill category budgets values on budget setup form
    Object.keys(budget.categories).forEach(cat => {
      const input = document.getElementById(`budget-${cat}-input`);
      if (input) {
        input.value = budget.categories[cat];
      }
      
      // Update visual indicator cards in Budget UI
      const valDisplay = document.getElementById(`limit-display-${cat}`);
      if (valDisplay) {
        valDisplay.textContent = `₹${budget.categories[cat].toLocaleString('en-IN')}`;
      }
    });
  }

  // --- Actions & Handlers ---
  
  // Theme Switching
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('expense-theme', newTheme);
    updateThemeToggleUI(newTheme);
    
    // Notify charts
    ChartsManager.updateTheme(newTheme === 'dark');
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  });

  // Modal actions
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  function setupEventListeners() {
    // Nav menu switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        tabButtons.forEach(b => b.parentElement.classList.remove('active'));
        parent.classList.add('active');

        activeTab = btn.getAttribute('data-tab');
        views.forEach(v => {
          v.classList.remove('active-view');
          if (v.id === `${activeTab}-view`) {
            v.classList.add('active-view');
          }
        });
        
        // Custom actions when switching tabs
        if (activeTab === 'transactions') {
          // Sync filters date elements
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          startDateFilter.value = `${year}-${month}-01`;
          endDateFilter.value = new Date(year, month, 0).toISOString().split('T')[0];
          renderTransactionsTable();
        } else {
          renderAll();
        }
      });
    });

    // Month Selector Change
    monthSelector.addEventListener('change', (e) => {
      currentMonthKey = e.target.value;
      renderAll();
    });

    // New Expense Trigger
    addExpenseBtn.addEventListener('click', () => {
      editingExpenseId = null;
      document.getElementById('expense-modal-title').textContent = 'Add Expense';
      expenseForm.reset();
      
      // Default date to today
      document.getElementById('expense-date-input').value = new Date().toISOString().split('T')[0];
      openModal(expenseModal);
    });

    // Edit Budget Trigger
    document.getElementById('edit-budget-btn').addEventListener('click', () => {
      renderBudgetSetup();
      openModal(budgetModal);
    });

    // Trigger Import CSV Modal
    importCsvBtn.addEventListener('click', () => {
      csvImportForm.reset();
      document.getElementById('csv-file-name').textContent = '';
      openModal(importModal);
    });

    // General Close Button listeners
    modalCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(expenseModal);
        closeModal(budgetModal);
        closeModal(importModal);
        closeModal(goalModal);
        closeModal(addFundsModal);
      });
    });

    // Close on overlay click
    window.addEventListener('click', (e) => {
      if (e.target === expenseModal) closeModal(expenseModal);
      if (e.target === budgetModal) closeModal(budgetModal);
      if (e.target === importModal) closeModal(importModal);
      if (e.target === goalModal) closeModal(goalModal);
      if (e.target === addFundsModal) closeModal(addFundsModal);
    });

    // Expense Form Submission
    expenseForm.addEventListener('submit', handleExpenseFormSubmit);

    // Budget Form Submission
    budgetForm.addEventListener('submit', handleBudgetFormSubmit);

    // Goal triggers
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      addGoalBtn.addEventListener('click', openGoalModal);
    }
    if (goalForm) {
      goalForm.addEventListener('click', (e) => e.stopPropagation());
      goalForm.addEventListener('submit', handleGoalFormSubmit);
    }
    if (addFundsForm) {
      addFundsForm.addEventListener('click', (e) => e.stopPropagation());
      addFundsForm.addEventListener('submit', handleAddFundsFormSubmit);
    }

    // --- Authentication Listeners ---
    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabSignup = document.getElementById('auth-tab-signup');
    const usernameGroup = document.getElementById('username-group');
    const logoutBtn = document.getElementById('logout-btn');

    let authMode = 'login';

    if (authTabLogin) {
      authTabLogin.addEventListener('click', () => {
        authMode = 'login';
        authTabLogin.classList.add('active');
        authTabSignup.classList.remove('active');
        authTabLogin.style.borderBottom = '2px solid var(--accent)';
        authTabSignup.style.borderBottom = '2px solid transparent';
        usernameGroup.style.display = 'none';
        document.getElementById('auth-username-input').removeAttribute('required');
        authSubmitBtn.querySelector('span').textContent = 'Log In';
      });
    }

    if (authTabSignup) {
      authTabSignup.addEventListener('click', () => {
        authMode = 'signup';
        authTabSignup.classList.add('active');
        authTabLogin.classList.remove('active');
        authTabSignup.style.borderBottom = '2px solid var(--accent)';
        authTabLogin.style.borderBottom = '2px solid transparent';
        usernameGroup.style.display = 'block';
        document.getElementById('auth-username-input').setAttribute('required', 'true');
        authSubmitBtn.querySelector('span').textContent = 'Sign Up';
      });
    }

    if (authForm) {
      authForm.addEventListener('click', (e) => e.stopPropagation());
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email-input').value.trim();
        const password = document.getElementById('auth-password-input').value;
        const username = document.getElementById('auth-username-input').value.trim();

        try {
          let data;
          if (authMode === 'login') {
            data = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            }).then(res => {
              if (!res.ok) return res.json().then(err => { throw new Error(err.msg || 'Login failed') });
              return res.json();
            });
            showToast('Logged in successfully!', 'success');
          } else {
            data = await fetch(`${API_URL}/auth/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, email, password })
            }).then(res => {
              if (!res.ok) return res.json().then(err => { throw new Error(err.msg || 'Signup failed') });
              return res.json();
            });
            showToast('Account registered successfully!', 'success');
          }

          localStorage.setItem('token', data.token);
          authForm.reset();
          await loadUserData();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        expenses = [];
        goals = [];
        budget = {
          total: 0,
          categories: {}
        };
        showAuthOverlay();
        showToast('Logged out successfully.', 'info');
      });
    }

    // Export CSV Actions
    exportCsvBtn.addEventListener('click', exportExpensesToCSV);

    // CSV File Select Drag-n-Drop
    setupCsvDragAndDrop();

    // Import CSV Submission
    csvImportForm.addEventListener('submit', handleCSVImportSubmit);

    // Interactive Transaction Filters
    searchInput.addEventListener('input', renderTransactionsTable);
    categoryFilter.addEventListener('change', renderTransactionsTable);
    startDateFilter.addEventListener('change', renderTransactionsTable);
    endDateFilter.addEventListener('change', renderTransactionsTable);

    // Close Banner Banner
    closeAlertBannerBtn.addEventListener('click', () => {
      globalAlertBanner.style.display = 'none';
    });

    // Handle mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
      });

      // Close sidebar if user clicks elsewhere
      document.addEventListener('click', () => {
        sidebar.classList.remove('active');
      });
    }

    // --- AI Chatbot Events ---
    if (aiChatToggleFab) {
      aiChatToggleFab.addEventListener('click', (e) => {
        e.stopPropagation();
        aiChatDrawer.classList.toggle('open');
      });
    }

    if (aiChatCloseBtn) {
      aiChatCloseBtn.addEventListener('click', () => {
        aiChatDrawer.classList.remove('open');
      });
    }

    // Toggle API Config panel inside Drawer
    if (aiSettingsToggleBtn) {
      aiSettingsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = aiApiConfigPanel.style.display === 'block';
        aiApiConfigPanel.style.display = isVisible ? 'none' : 'block';
        aiSettingsToggleBtn.classList.toggle('active', !isVisible);
      });
    }

    // Click inside drawer shouldn't close it, but clicking outside could.
    if (aiChatDrawer) {
      aiChatDrawer.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    document.addEventListener('click', (e) => {
      // If drawer is open and click was outside drawer & FAB, close it
      if (aiChatDrawer && aiChatDrawer.classList.contains('open')) {
        if (!aiChatDrawer.contains(e.target) && !aiChatToggleFab.contains(e.target)) {
          aiChatDrawer.classList.remove('open');
        }
      }
    });

    // Save API Key
    if (aiApiKeySaveBtn) {
      aiApiKeySaveBtn.addEventListener('click', () => {
        const key = aiApiKeyInput.value.trim();
        AIService.setApiKey(key);
        if (key) {
          showToast('Gemini API Key saved successfully!', 'success');
          addChatMessage('system', '🔑 Gemini API connection active. Real AI Advisor activated.');
        } else {
          showToast('Gemini API Key removed. Switched to Mock Mode.', 'warning');
          addChatMessage('system', '⚠️ API Key removed. Switched to Demo Mock Mode.');
        }
        aiApiConfigPanel.style.display = 'none';
        aiSettingsToggleBtn.classList.remove('active');
      });
    }

    // Submit Chat form
    if (aiChatForm) {
      aiChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = aiChatInput.value.trim();
        if (!text) return;

        aiChatInput.value = '';
        addChatMessage('user', text);

        // Add loading bubble
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-typing-indicator ai-message';
        loadingDiv.innerHTML = '<span></span><span></span><span></span>';
        loadingDiv.id = 'ai-chat-loading-bubble';
        aiChatMessages.appendChild(loadingDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        const currentMonthExpenses = AnalyticsEngine.getExpensesForMonth(expenses, currentMonthKey);

        try {
          const reply = await AIService.sendMessage(
            text, 
            aiChatHistory, 
            currentMonthExpenses, 
            budget, 
            currentMonthKey
          );
          
          // Remove loading bubble
          const bubble = document.getElementById('ai-chat-loading-bubble');
          if (bubble) bubble.remove();

          addChatMessage('ai', reply);
        } catch (error) {
          const bubble = document.getElementById('ai-chat-loading-bubble');
          if (bubble) bubble.remove();
          addChatMessage('ai', `⚠️ **Error:** Failed to generate response. ${error.message}`);
        }
      });
    }
  }

  // --- CRUD Core Logic ---

  async function handleExpenseFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('expense-title-input').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount-input').value);
    const category = document.getElementById('expense-category-input').value;
    const date = document.getElementById('expense-date-input').value;
    const description = document.getElementById('expense-desc-input').value.trim();

    if (!title) {
      showToast('Please enter a description for the expense.', 'warning');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount greater than 0.', 'warning');
      return;
    }
    if (!category) {
      showToast('Please select a category.', 'warning');
      return;
    }
    if (!date) {
      showToast('Please select a valid transaction date.', 'warning');
      return;
    }

    try {
      if (editingExpenseId) {
        // Update
        const updated = await apiCall(`/expenses/${editingExpenseId}`, 'PUT', {
          title, amount, category, date, description
        });
        const index = expenses.findIndex(exp => (exp._id || exp.id) === editingExpenseId);
        if (index !== -1) {
          expenses[index] = updated;
        }
        showToast('Expense updated successfully!', 'success');
      } else {
        // Create
        const created = await apiCall('/expenses', 'POST', {
          title, amount, category, date, description
        });
        expenses.push(created);
        
        // Auto-switch month selector if expense date is in a different displayed month
        const expMonth = AnalyticsEngine.getMonthYearKey(date);
        if (expMonth !== currentMonthKey) {
          const hasOption = Array.from(monthSelector.options).some(opt => opt.value === expMonth);
          if (hasOption) {
            currentMonthKey = expMonth;
            monthSelector.value = expMonth;
          }
        }

        showToast('Expense added successfully!', 'success');

        // Check category budget thresholds for instant alerts
        checkImmediateCategoryBudgetExceeded(category, amount);
      }
      closeModal(expenseModal);
      renderAll();
    } catch (err) {
      showToast(`Error saving expense: ${err.message}`, 'danger');
    }
  }

  function checkImmediateCategoryBudgetExceeded(category, addedAmount) {
    const limit = budget.categories[category] || 0;
    if (limit <= 0) return;

    const currentMonthExpenses = AnalyticsEngine.getExpensesForMonth(expenses, currentMonthKey);
    const categoryTotalSpent = currentMonthExpenses
      .filter(e => e.category === category)
      .reduce((s, e) => s + Number(e.amount), 0);

    const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
    
    if (categoryTotalSpent >= limit) {
      showToast(`CRITICAL Alert: You have blown your ₹${limit.toLocaleString('en-IN')} budget limit for ${catLabel}!`, 'danger');
    } else if (categoryTotalSpent >= limit * 0.85) {
      showToast(`Warning: ${catLabel} spending is at ${Math.round((categoryTotalSpent/limit)*100)}% of limit (₹${categoryTotalSpent.toLocaleString('en-IN')} of ₹${limit.toLocaleString('en-IN')}).`, 'warning');
    }
  }

  function openExpenseModalForEdit(id) {
    const exp = expenses.find(e => (e._id || e.id) === id);
    if (!exp) return;

    editingExpenseId = id;
    document.getElementById('expense-modal-title').textContent = 'Edit Expense';

    document.getElementById('expense-title-input').value = exp.title;
    document.getElementById('expense-amount-input').value = exp.amount;
    document.getElementById('expense-category-input').value = exp.category;
    document.getElementById('expense-date-input').value = exp.date;
    document.getElementById('expense-desc-input').value = exp.description || '';

    openModal(expenseModal);
  }

  async function deleteExpenseRecord(id) {
    if (confirm('Are you sure you want to permanently delete this expense?')) {
      try {
        await apiCall(`/expenses/${id}`, 'DELETE');
        expenses = expenses.filter(e => (e._id || e.id) !== id);
        showToast('Expense record deleted.', 'info');
        renderAll();
      } catch (err) {
        showToast(`Error deleting expense: ${err.message}`, 'danger');
      }
    }
  }

  // --- Budget Setup Submission ---

  async function handleBudgetFormSubmit(e) {
    e.preventDefault();

    const totalVal = parseFloat(totalBudgetInput.value);
    if (isNaN(totalVal) || totalVal <= 0) {
      showToast('Please enter a valid monthly budget amount.', 'warning');
      return;
    }

    // Fetch individual category budgets
    const categories = {};
    let sumCategoryBudgets = 0;
    Object.keys(budget.categories).forEach(cat => {
      const inputVal = parseFloat(document.getElementById(`budget-${cat}-input`).value);
      if (!isNaN(inputVal) && inputVal >= 0) {
        categories[cat] = inputVal;
        sumCategoryBudgets += inputVal;
      } else {
        categories[cat] = 0;
      }
    });

    // Validation: Category budgets should not exceed total budget
    if (sumCategoryBudgets > totalVal) {
      showToast('Caution: Sum of category budgets exceeds your overall monthly budget limit.', 'warning');
    }

    try {
      const updatedBudget = await apiCall('/budget', 'POST', {
        total: totalVal,
        categories
      });
      budget.total = updatedBudget.total;
      budget.categories = updatedBudget.categories;
      closeModal(budgetModal);
      renderAll();
      showToast('Monthly budget configurations updated!', 'success');
    } catch (err) {
      showToast(`Error updating budget: ${err.message}`, 'danger');
    }
  }

  // --- Savings Goals Implementation ---
  const goalModal = document.getElementById('goal-modal');
  const addFundsModal = document.getElementById('add-funds-modal');
  const goalForm = document.getElementById('goal-form');
  const addFundsForm = document.getElementById('add-funds-form');

  function openGoalModal() {
    goalForm.reset();
    document.getElementById('goal-modal-title').textContent = 'New Savings Goal';
    openModal(goalModal);
  }

  async function handleGoalFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('goal-title-input').value.trim();
    const targetAmount = parseFloat(document.getElementById('goal-target-input').value);
    const currentAmount = parseFloat(document.getElementById('goal-current-input').value) || 0;
    const category = document.getElementById('goal-category-input').value;

    if (!title || isNaN(targetAmount) || targetAmount <= 0) {
      showToast('Please enter valid goal details.', 'warning');
      return;
    }

    try {
      const created = await apiCall('/goals', 'POST', {
        title, targetAmount, currentAmount, category
      });
      goals.push(created);
      closeModal(goalModal);
      renderGoals();
      showToast(`Savings goal "${title}" created successfully!`, 'success');
    } catch (err) {
      showToast(`Error creating goal: ${err.message}`, 'danger');
    }
  }

  function openAddFundsModal(id) {
    activeGoalIdForFunds = id;
    const goal = goals.find(g => g._id === id);
    if (!goal) return;
    document.getElementById('add-funds-goal-title').textContent = `Goal: ${goal.title}`;
    addFundsForm.reset();
    openModal(addFundsModal);
  }

  async function handleAddFundsFormSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('add-funds-amount-input').value);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount.', 'warning');
      return;
    }

    const goal = goals.find(g => g._id === activeGoalIdForFunds);
    if (!goal) return;

    try {
      const newTotal = goal.currentAmount + amount;
      const updated = await apiCall(`/goals/${activeGoalIdForFunds}`, 'PUT', {
        currentAmount: newTotal
      });
      const index = goals.findIndex(g => g._id === activeGoalIdForFunds);
      if (index !== -1) {
        goals[index] = updated;
      }
      closeModal(addFundsModal);
      renderGoals();
      showToast(`Added ₹${amount.toLocaleString('en-IN')} to "${goal.title}"!`, 'success');
    } catch (err) {
      showToast(`Error adding funds: ${err.message}`, 'danger');
    }
  }

  async function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await apiCall(`/goals/${id}`, 'DELETE');
        goals = goals.filter(g => g._id !== id);
        renderGoals();
        showToast('Savings goal deleted.', 'info');
      } catch (err) {
        showToast(`Error deleting goal: ${err.message}`, 'danger');
      }
    }
  }

  // --- CSV Export & Import ---

  function exportExpensesToCSV() {
    if (expenses.length === 0) {
      showToast('There are no expense records to export.', 'warning');
      return;
    }

    // Sort by date descending
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Form header
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Title,Amount,Category,Date,Description\n';

    sorted.forEach(e => {
      const row = [
        escapeCsvCell(e.title),
        e.amount.toFixed(2),
        e.category,
        e.date,
        escapeCsvCell(e.description || '')
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Tracker_Export_${currentMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV Exported successfully!', 'success');
  }

  function setupCsvDragAndDrop() {
    const dragArea = document.getElementById('csv-drag-area');
    const fileInput = document.getElementById('csv-file-input');
    const fileNameDisplay = document.getElementById('csv-file-name');

    dragArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
      }
    });

    dragArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragArea.classList.add('drag-over');
    });

    ['dragleave', 'dragend'].forEach(evt => {
      dragArea.addEventListener(evt, () => dragArea.classList.remove('drag-over'));
    });

    dragArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dragArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileNameDisplay.textContent = e.dataTransfer.files[0].name;
      }
    });
  }

  function handleCSVImportSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('csv-file-input');
    
    if (fileInput.files.length === 0) {
      showToast('Please select a CSV file first.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(evt) {
      const text = evt.target.result;
      const parsedLines = parseCsvText(text);

      if (parsedLines.length <= 1) {
        showToast('Invalid CSV format. File must contain a header row and data rows.', 'danger');
        return;
      }

      const headers = parsedLines[0].map(h => h.trim().toLowerCase());
      
      // Check for required column mappings
      const titleIdx = headers.indexOf('title');
      const amountIdx = headers.indexOf('amount');
      const categoryIdx = headers.indexOf('category');
      const dateIdx = headers.indexOf('date');
      const descIdx = headers.indexOf('description');

      if (titleIdx === -1 || amountIdx === -1 || categoryIdx === -1 || dateIdx === -1) {
        showToast('CSV missing key columns. Required headers: Title, Amount, Category, Date', 'danger');
        return;
      }

      const validCategories = ['food', 'transport', 'utilities', 'entertainment', 'healthcare', 'shopping', 'others'];
      let importCount = 0;
      let errorCount = 0;
      const importedRecords = [];

      for (let i = 1; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        if (row.length < 4 || (row.length === 1 && row[0] === '')) continue; // Skip empty rows

        const title = row[titleIdx] ? row[titleIdx].trim() : '';
        const amount = row[amountIdx] ? parseFloat(row[amountIdx]) : NaN;
        let category = row[categoryIdx] ? row[categoryIdx].trim().toLowerCase() : 'others';
        const date = row[dateIdx] ? row[dateIdx].trim() : '';
        const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';

        // Validate individual fields
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const isValidDate = dateRegex.test(date) && !isNaN(new Date(date).getTime());

        if (!title || isNaN(amount) || amount <= 0 || !isValidDate) {
          errorCount++;
          continue;
        }

        if (!validCategories.includes(category)) {
          category = 'others';
        }

        importedRecords.push({
          id: `imported_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          title,
          amount,
          category,
          date,
          description
        });
        importCount++;
      }

      if (importedRecords.length > 0) {
        (async () => {
          try {
            const promises = importedRecords.map(rec => apiCall('/expenses', 'POST', {
              title: rec.title,
              amount: rec.amount,
              category: rec.category,
              date: rec.date,
              description: rec.description
            }));
            const savedRecords = await Promise.all(promises);
            expenses = [...expenses, ...savedRecords];
            closeModal(importModal);
            renderAll();
            showToast(`Import completed! Added ${savedRecords.length} expenses.${errorCount > 0 ? ` Skipped ${errorCount} malformed rows.` : ''}`, 'success');
          } catch (err) {
            showToast(`Error saving imported expenses: ${err.message}`, 'danger');
          }
        })();
      } else {
        showToast('No valid expense rows could be parsed from the CSV.', 'danger');
      }
    };

    reader.onerror = function() {
      showToast('Could not read the CSV file.', 'danger');
    };

    reader.readAsText(file);
  }

  // --- Helper Functions ---
  
  // Custom simple CSV Parser supporting basic double quotes escaping
  function parseCsvText(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Double double-quotes inside quoted cell represents a single quote literal
          row[row.length - 1] += '"';
          i++;
        } else {
          // Toggle quotes state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    
    return lines;
  }

  function escapeCsvCell(val) {
    let text = String(val);
    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      text = text.replace(/"/g, '""');
      return `"${text}"`;
    }
    return text;
  }

  function escapeHtml(string) {
    const matchHtmlRegExp = /["'&<>]/;
    const str = '' + string;
    const match = matchHtmlRegExp.exec(str);

    if (!match) {
      return str;
    }

    let escape;
    let html = '';
    let index = 0;
    let lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
      switch (str.charCodeAt(index)) {
        case 34: // "
          escape = '&quot;';
          break;
        case 38: // &
          escape = '&amp;';
          break;
        case 39: // '
          escape = '&#39;';
          break;
        case 60: // <
          escape = '&lt;';
          break;
        case 62: // >
          escape = '&gt;';
          break;
        default:
          continue;
      }

      if (lastIndex !== index) {
        html += str.substring(lastIndex, index);
      }

      lastIndex = index + 1;
      html += escape;
    }

    return lastIndex !== index
      ? html + str.substring(lastIndex, index)
      : html;
  }

  // --- AI Chatbot Helpers ---
  let aiChatHistory = [];

  function addWelcomeMessage() {
    aiChatMessages.innerHTML = '';
    const hasKey = AIService.hasApiKey();
    const greeting = hasKey
      ? "Hi there! I am **SmartSpend AI**, your personal financial advisor. Ask me anything about your current budget, analysis of your expenses, or tips to optimize your saving goals."
      : "Hi there! I am **SmartSpend AI**, your personal financial advisor.\n\nCurrently, I am running in **Demo Mock Mode**. Click the 🔑 key icon in the header of this drawer to save your Google Gemini API Key and unlock real-time financial intelligence!";
    addChatMessage('ai', greeting);
  }

  function addChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${sender}`;
    
    // Simple markdown formatter for messages
    const formattedText = formatMarkdown(text);
    
    msgDiv.innerHTML = formattedText;
    aiChatMessages.appendChild(msgDiv);
    
    // Auto-scroll
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    
    // Save to local history state (excluding indicators and systems)
    if (sender !== 'system' && sender !== 'loading') {
      aiChatHistory.push({ sender, text });
    }
  }

  function formatMarkdown(text) {
    let html = escapeHtml(text);
    
    // Convert newlines to breaks
    html = html.replace(/\n/g, '<br>');
    
    // Convert bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert list items starting with "* " or "- "
    const lines = html.split('<br>');
    let inList = false;
    const processedLines = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          inList = true;
          processedLines.push('<ul style="margin: 6px 0; padding-left: 20px;">');
        }
        processedLines.push(`<li style="margin-bottom: 4px;">${trimmed.substring(2)}</li>`);
      } else {
        if (inList) {
          inList = false;
          processedLines.push('</ul>');
        }
        processedLines.push(line);
      }
    }
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('<br>').replace(/<\/ul><br>/g, '</ul>').replace(/<br><ul/g, '<ul');
  }

  // Run initial calculations
  init();
});
