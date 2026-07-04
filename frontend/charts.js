/**
 * Expense Tracker - Charts Management
 * Integrates Chart.js and configures charts with responsive layouts and theme changes.
 */

const ChartsManager = {
  categoryChart: null,
  trendChart: null,

  // Theme-sensitive configuration parameters
  getThemeColors(isDark) {
    return {
      text: isDark ? 'hsl(215, 20%, 75%)' : 'hsl(215, 16%, 47%)',
      grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      tooltipBg: isDark ? 'hsl(222, 47%, 10%)' : 'hsl(0, 0%, 100%)',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      tooltipText: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222, 47%, 11%)'
    };
  },

  categoryConfig: {
    food: { color: 'rgb(249, 115, 22)', label: 'Food' },
    transport: { color: 'rgb(14, 165, 233)', label: 'Transport' },
    utilities: { color: 'rgb(234, 179, 8)', label: 'Utilities' },
    entertainment: { color: 'rgb(236, 72, 153)', label: 'Entertainment' },
    healthcare: { color: 'rgb(16, 185, 129)', label: 'Healthcare' },
    shopping: { color: 'rgb(139, 92, 246)', label: 'Shopping' },
    others: { color: 'rgb(100, 116, 139)', label: 'Others' }
  },

  /**
   * Initialize Doughnut and Bar charts
   */
  init(categoryCanvasId, trendCanvasId, isDark) {
    const catCanvas = document.getElementById(categoryCanvasId);
    const trendCanvas = document.getElementById(trendCanvasId);

    if (!catCanvas || !trendCanvas) return;

    const themeColors = this.getThemeColors(isDark);

    // 1. Category Breakdown Doughnut Chart
    this.categoryChart = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? 'hsl(222, 47%, 10%)' : 'hsl(0, 0%, 100%)',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: "'Inter', sans-serif", size: 12 },
              color: themeColors.text,
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipText,
            bodyColor: themeColors.tooltipText,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return ` ${label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });

    // 2. Spending Trends Bar Chart
    this.trendChart = new Chart(trendCanvas, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Daily Spend',
            data: [],
            backgroundColor: 'rgba(139, 92, 246, 0.75)',
            hoverBackgroundColor: 'rgb(139, 92, 246)',
            borderRadius: 6,
            borderWidth: 0,
            maxBarThickness: 16
          },
          {
            label: 'Daily Budget Target',
            type: 'line',
            data: [],
            borderColor: 'rgba(239, 68, 68, 0.6)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10 },
              color: themeColors.text,
              maxRotation: 0
            }
          },
          y: {
            grid: {
              color: themeColors.grid
            },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10 },
              color: themeColors.text,
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false // We will use labels or custom layout to save space
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipText,
            bodyColor: themeColors.tooltipText,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;
                if (label.includes('Target')) {
                  return ` Target Pace: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                return ` Spend: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * Update chart data based on expenses and selected month
   */
  update(expenses, budget, monthKey, isDark) {
    if (!this.categoryChart || !this.trendChart) return;

    const themeColors = this.getThemeColors(isDark);
    const [year, month] = monthKey.split('-').map(Number);
    
    // Filter expenses for selected month
    const currentMonthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    // 1. Update Category Doughnut Chart
    const categorySpend = {};
    Object.keys(this.categoryConfig).forEach(cat => {
      categorySpend[cat] = 0;
    });

    currentMonthExpenses.forEach(exp => {
      const cat = exp.category || 'others';
      if (categorySpend[cat] !== undefined) {
        categorySpend[cat] += Number(exp.amount);
      } else {
        categorySpend['others'] += Number(exp.amount);
      }
    });

    const labels = [];
    const data = [];
    const colors = [];

    Object.keys(categorySpend).forEach(cat => {
      if (categorySpend[cat] > 0) {
        labels.push(this.categoryConfig[cat].label);
        data.push(categorySpend[cat]);
        colors.push(this.categoryConfig[cat].color);
      }
    });

    // Handle empty data case for doughnut
    if (data.length === 0) {
      this.categoryChart.data.labels = ['No Data'];
      this.categoryChart.data.datasets[0].data = [1];
      this.categoryChart.data.datasets[0].backgroundColor = [isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'];
    } else {
      this.categoryChart.data.labels = labels;
      this.categoryChart.data.datasets[0].data = data;
      this.categoryChart.data.datasets[0].backgroundColor = colors;
    }
    
    this.categoryChart.options.plugins.legend.labels.color = themeColors.text;
    this.categoryChart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
    this.categoryChart.options.plugins.tooltip.titleColor = themeColors.tooltipText;
    this.categoryChart.options.plugins.tooltip.bodyColor = themeColors.tooltipText;
    this.categoryChart.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;
    this.categoryChart.data.datasets[0].borderColor = isDark ? 'hsl(222, 47%, 10%)' : 'hsl(0, 0%, 100%)';
    this.categoryChart.update();

    // 2. Update Trend Bar Chart
    const totalDays = new Date(year, month, 0).getDate();
    const dailySpends = Array(totalDays).fill(0);

    currentMonthExpenses.forEach(exp => {
      const day = new Date(exp.date).getDate();
      if (day >= 1 && day <= totalDays) {
        dailySpends[day - 1] += Number(exp.amount);
      }
    });

    const daysLabels = Array.from({ length: totalDays }, (_, i) => String(i + 1));
    const budgetLimit = budget.total || 0;
    const dailyBudgetTarget = budgetLimit > 0 ? (budgetLimit / totalDays) : 0;
    const targetPaceData = Array(totalDays).fill(dailyBudgetTarget);

    // Apply color accent to Trend Bar Chart
    const accentColor = isDark ? 'hsl(262, 83%, 65%)' : 'hsl(262, 83%, 58%)';
    
    this.trendChart.data.labels = daysLabels;
    this.trendChart.data.datasets[0].data = dailySpends;
    this.trendChart.data.datasets[0].backgroundColor = accentColor;
    this.trendChart.data.datasets[0].hoverBackgroundColor = isDark ? 'hsl(262, 83%, 70%)' : 'hsl(262, 83%, 50%)';
    this.trendChart.data.datasets[1].data = targetPaceData;

    // Apply theme ticks/grid updates
    this.trendChart.options.scales.x.ticks.color = themeColors.text;
    this.trendChart.options.scales.y.ticks.color = themeColors.text;
    this.trendChart.options.scales.y.grid.color = themeColors.grid;
    this.trendChart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
    this.trendChart.options.plugins.tooltip.titleColor = themeColors.tooltipText;
    this.trendChart.options.plugins.tooltip.bodyColor = themeColors.tooltipText;
    this.trendChart.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;

    this.trendChart.update();
  },

  /**
   * Handle dynamic theme switching
   */
  updateTheme(isDark) {
    if (!this.categoryChart || !this.trendChart) return;
    const themeColors = this.getThemeColors(isDark);
    
    // Doughnut Update
    this.categoryChart.options.plugins.legend.labels.color = themeColors.text;
    this.categoryChart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
    this.categoryChart.options.plugins.tooltip.titleColor = themeColors.tooltipText;
    this.categoryChart.options.plugins.tooltip.bodyColor = themeColors.tooltipText;
    this.categoryChart.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;
    this.categoryChart.data.datasets[0].borderColor = isDark ? 'hsl(222, 47%, 10%)' : 'hsl(0, 0%, 100%)';
    
    // Check if empty state dataset border needs to change
    if (this.categoryChart.data.labels[0] === 'No Data') {
      this.categoryChart.data.datasets[0].backgroundColor = [isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'];
    }
    
    this.categoryChart.update();

    // Bar Update
    const accentColor = isDark ? 'hsl(262, 83%, 65%)' : 'hsl(262, 83%, 58%)';
    this.trendChart.data.datasets[0].backgroundColor = accentColor;
    this.trendChart.data.datasets[0].hoverBackgroundColor = isDark ? 'hsl(262, 83%, 70%)' : 'hsl(262, 83%, 50%)';
    this.trendChart.options.scales.x.ticks.color = themeColors.text;
    this.trendChart.options.scales.y.ticks.color = themeColors.text;
    this.trendChart.options.scales.y.grid.color = themeColors.grid;
    this.trendChart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBg;
    this.trendChart.options.plugins.tooltip.titleColor = themeColors.tooltipText;
    this.trendChart.options.plugins.tooltip.bodyColor = themeColors.tooltipText;
    this.trendChart.options.plugins.tooltip.borderColor = themeColors.tooltipBorder;
    this.trendChart.update();
  }
};
