/**
 * Expense Tracker - Smart Analytics Engine
 * Provides budget monitoring, overspending warnings, spending forecasting, and saving tips.
 */

const AnalyticsEngine = {
  /**
   * Helper: Parse Date string and extract month and year
   */
  getMonthYearKey(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Filter expenses by a specific month-year key (format: YYYY-MM)
   */
  getExpensesForMonth(expenses, monthKey) {
    return expenses.filter(exp => {
      const key = this.getMonthYearKey(exp.date);
      return key === monthKey;
    });
  },

  /**
   * Calculate total spend for a given list of expenses
   */
  calculateTotalSpend(expenses) {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  },

  /**
   * Calculate total spend per category
   */
  calculateSpendByCategory(expenses) {
    const summary = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'others';
      summary[cat] = (summary[cat] || 0) + Number(exp.amount);
    });
    return summary;
  },

  /**
   * Forecasts end of month spending based on current daily spending velocity.
   */
  calculateMonthEndForecast(expenses, monthKey, budgetLimit) {
    const currentMonthExpenses = this.getExpensesForMonth(expenses, monthKey);
    const totalSpentSoFar = this.calculateTotalSpend(currentMonthExpenses);
    
    if (currentMonthExpenses.length === 0) {
      return { forecastAmount: 0, percentageOfBudget: 0, dailyAverage: 0 };
    }

    const [year, month] = monthKey.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    
    // Determine the current day of the month for calculation
    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === year && (now.getMonth() + 1) === month);
    
    let daysElapsed = totalDaysInMonth;
    if (isCurrentMonth) {
      daysElapsed = now.getDate();
    } else {
      // Find the latest expense date in that month to estimate active duration
      const dates = currentMonthExpenses.map(e => new Date(e.date).getDate());
      daysElapsed = Math.max(...dates, 1);
    }
    
    // Fallback just in case
    if (daysElapsed <= 0) daysElapsed = 1;
    
    const dailyAverage = totalSpentSoFar / daysElapsed;
    const forecastAmount = Math.round(dailyAverage * totalDaysInMonth);
    const percentageOfBudget = budgetLimit > 0 ? Math.round((forecastAmount / budgetLimit) * 100) : 0;

    return {
      forecastAmount,
      percentageOfBudget,
      dailyAverage: Math.round(dailyAverage * 100) / 100
    };
  },

  /**
   * Get month-over-month change for a category
   */
  getMoMChange(expenses, currentMonthKey, category) {
    const [year, month] = currentMonthKey.split('-').map(Number);
    // Calculate previous month key
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const currentExpenses = this.getExpensesForMonth(expenses, currentMonthKey)
      .filter(e => e.category === category);
    const prevExpenses = this.getExpensesForMonth(expenses, prevMonthKey)
      .filter(e => e.category === category);

    const currentTotal = this.calculateTotalSpend(currentExpenses);
    const prevTotal = this.calculateTotalSpend(prevExpenses);

    if (prevTotal === 0) {
      return currentTotal > 0 ? { diff: currentTotal, percentage: 100, isNew: true } : { diff: 0, percentage: 0, isNew: false };
    }

    const diff = currentTotal - prevTotal;
    const percentage = Math.round((diff / prevTotal) * 100);

    return { diff, percentage, isNew: false };
  },

  /**
   * Generates a collection of smart suggestions, warnings, and positive insights
   */
  generateInsights(expenses, budget, currentMonthKey) {
    const currentExpenses = this.getExpensesForMonth(expenses, currentMonthKey);
    const totalSpent = this.calculateTotalSpend(currentExpenses);
    const categorySpend = this.calculateSpendByCategory(currentExpenses);
    const insights = [];

    if (budget.total <= 0) {
      insights.push({
        type: 'info',
        icon: 'lucide-sliders-horizontal',
        title: 'Define your Monthly Budget',
        desc: 'Set a monthly budget cap to enable smart tracking, spending forecasts, and automated overspending alerts.'
      });
      return insights;
    }

    const currentDay = new Date().getDate();
    const [year, month] = currentMonthKey.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const monthPercentageElapsed = Math.round((currentDay / totalDays) * 100);

    // 1. Overall Budget Check
    const budgetPercentage = Math.round((totalSpent / budget.total) * 100);
    
    if (budgetPercentage >= 100) {
      insights.push({
        type: 'danger',
        icon: 'lucide-alert-triangle',
        title: 'Budget Exceeded!',
        desc: `You have spent ${budgetPercentage}% of your monthly budget. You are currently ₹${Math.round(totalSpent - budget.total).toLocaleString('en-IN')} over your set threshold.`
      });
    } else if (budgetPercentage >= 90) {
      insights.push({
        type: 'danger',
        icon: 'lucide-alert-circle',
        title: 'Critical Budget Alert',
        desc: `You have used ${budgetPercentage}% of your budget. Only ₹${Math.round(budget.total - totalSpent).toLocaleString('en-IN')} remains for the rest of the month.`
      });
    } else if (budgetPercentage >= 75) {
      insights.push({
        type: 'warning',
        icon: 'lucide-shield-alert',
        title: 'Approaching Budget Cap',
        desc: `You've utilized ${budgetPercentage}% of your total budget. It is recommended to reduce non-essential expenses.`
      });
    } else if (budgetPercentage > monthPercentageElapsed + 15) {
      insights.push({
        type: 'warning',
        icon: 'lucide-trending-up',
        title: 'High Spending Velocity',
        desc: `You have spent ${budgetPercentage}% of your budget, but only ${monthPercentageElapsed}% of the month has elapsed. Your current pace might lead to overspending.`
      });
    } else if (totalSpent > 0) {
      insights.push({
        type: 'success',
        icon: 'lucide-smile',
        title: 'On Track',
        desc: `Great job! You have spent ${budgetPercentage}% of your budget with ${monthPercentageElapsed}% of the month completed. You're pacing well.`
      });
    }

    // 2. Forecast Insight
    const forecast = this.calculateMonthEndForecast(expenses, currentMonthKey, budget.total);
    if (forecast.forecastAmount > budget.total && budget.total > 0 && budgetPercentage < 100) {
      insights.push({
        type: 'danger',
        icon: 'lucide-gauge',
        title: 'Projected Budget Violation',
        desc: `Based on your average daily spend of ₹${forecast.dailyAverage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, you are projected to reach ₹${forecast.forecastAmount.toLocaleString('en-IN')} by the end of the month, exceeding your budget by ${forecast.percentageOfBudget - 100}%.`
      });
    }

    // 3. Category Budgets Checks
    const catBudgets = budget.categories || {};
    Object.keys(catBudgets).forEach(cat => {
      const limit = catBudgets[cat];
      const spent = categorySpend[cat] || 0;
      if (limit > 0) {
        const pct = Math.round((spent / limit) * 100);
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        
        if (pct >= 100) {
          insights.push({
            type: 'danger',
            icon: 'lucide-ban',
            title: `${catName} Budget Blown`,
            desc: `You have spent ₹${spent.toLocaleString('en-IN')} on ${catName}, exceeding your limit of ₹${limit.toLocaleString('en-IN')} by ${pct - 100}%.`
          });
        } else if (pct >= 80) {
          insights.push({
            type: 'warning',
            icon: 'lucide-alert-triangle',
            title: `High Spend on ${catName}`,
            desc: `You have consumed ${pct}% of your ₹${limit.toLocaleString('en-IN')} limit for ${catName}. Current remainder: ₹${Math.round(limit - spent).toLocaleString('en-IN')}.`
          });
        }
      }
    });

    // 4. Heavy Category Weight & Actionable Saving Advice
    if (totalSpent > 0) {
      const topCat = Object.keys(categorySpend).reduce((a, b) => categorySpend[a] > categorySpend[b] ? a : b, null);
      if (topCat) {
        const topCatSpent = categorySpend[topCat];
        const pctOfTotal = Math.round((topCatSpent / totalSpent) * 100);
        const catName = topCat.charAt(0).toUpperCase() + topCat.slice(1);

        if (pctOfTotal >= 35) {
          let advice = '';
          if (topCat === 'food') {
            advice = 'Consider cooking at home more often, planning meals in advance, or tracking snack purchases to save around 15-20% on dining.';
          } else if (topCat === 'shopping') {
            advice = 'Practice the "48-hour rule" before buying non-essentials: add them to a wishlist first to curb impulse buys.';
          } else if (topCat === 'transport') {
            advice = 'Look into public transit passes, ridesharing pools, or combining multi-destination trips to reduce fuel costs.';
          } else if (topCat === 'entertainment') {
            advice = 'Review your streaming services or active subscriptions. Canceling just one unused tier can free up cash immediately.';
          } else {
            advice = `Assess if some of these costs can be deferred to next month to balance your cash flow.`;
          }

          insights.push({
            type: 'info',
            icon: 'lucide-lightbulb',
            title: `Dominant Spending: ${catName}`,
            desc: `${catName} accounts for ${pctOfTotal}% (₹${topCatSpent.toLocaleString('en-IN')}) of your total monthly expenditures. ${advice}`
          });
        }
      }
    }

    // 5. Month-over-Month Spike Warning
    Object.keys(categorySpend).forEach(cat => {
      const spent = categorySpend[cat] || 0;
      if (spent > 50) { // Only analyze significant categories
        const mom = this.getMoMChange(expenses, currentMonthKey, cat);
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (mom.percentage >= 30 && !mom.isNew) {
          insights.push({
            type: 'warning',
            icon: 'lucide-trending-up',
            title: `MoM Spending Spike: ${catName}`,
            desc: `Your spending in ${catName} is up by ${mom.percentage}% (+₹${Math.round(mom.diff).toLocaleString('en-IN')}) compared to last month. Try to rein in this category next week.`
          });
        }
      }
    });

    // 6. Day-of-Week spending insights
    if (currentExpenses.length >= 8) { // Only give day patterns if there's enough data
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const daySpends = Array(7).fill(0);
      const dayCounts = Array(7).fill(0);

      currentExpenses.forEach(exp => {
        const d = new Date(exp.date);
        const dayIdx = d.getDay();
        daySpends[dayIdx] += Number(exp.amount);
        dayCounts[dayIdx]++;
      });

      const dayAverages = daySpends.map((total, idx) => dayCounts[idx] > 0 ? total / dayCounts[idx] : 0);
      const topDayIdx = dayAverages.reduce((maxIdx, currentAvg, idx, arr) => currentAvg > arr[maxIdx] ? idx : maxIdx, 0);

      if (dayAverages[topDayIdx] > 0 && daySpends[topDayIdx] > totalSpent * 0.25) {
        insights.push({
          type: 'info',
          icon: 'lucide-calendar-days',
          title: `Peak Spend Day: ${days[topDayIdx]}s`,
          desc: `You tend to spend the most on ${days[topDayIdx]}s, averaging ₹${Math.round(dayAverages[topDayIdx]).toLocaleString('en-IN')} per expense. Setting minor boundaries on this day could optimize your weekly budget.`
        });
      }
    }

    return insights;
  }
};
