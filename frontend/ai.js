/**
 * SmartSpend - AI Financial Advisor Service
 * Integrates with the Google Gemini API client-side or falls back to a smart Mock Mode.
 */

const AIService = {
  // Load API Key from localStorage
  getApiKey() {
    return localStorage.getItem('gemini-api-key') || '';
  },

  setApiKey(key) {
    if (key) {
      localStorage.setItem('gemini-api-key', key.trim());
    } else {
      localStorage.removeItem('gemini-api-key');
    }
  },

  hasApiKey() {
    return !!this.getApiKey();
  },

  /**
   * Generates a system instruction prompt including the user's financial profile
   */
  buildSystemInstruction(expenses, budget, currentMonth) {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const categorySpend = {};
    expenses.forEach(e => {
      categorySpend[e.category] = (categorySpend[e.category] || 0) + Number(e.amount);
    });

    const budgetStatus = budget.total > 0 
      ? `Total budget: ₹${budget.total.toLocaleString('en-IN')}. Total spent so far: ₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.round((totalSpent / budget.total) * 100)}% used).`
      : 'No total budget set yet.';

    const categoryBreakdown = Object.entries(categorySpend)
      .map(([cat, val]) => ` - ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Limit: ₹${(budget.categories[cat] || 0).toLocaleString('en-IN')})`)
      .join('\n');

    const recentTransactions = expenses.slice(-8).map(e => 
      ` - ${e.date}: ${e.title} (₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} under ${e.category})`
    ).join('\n');

    return `You are SmartSpend AI, a friendly, professional, and encouraging personal financial advisor. 
You help the user manage their budget, analyze their spending, and offer actionable saving suggestions.

Here is the user's financial summary for the current month (${currentMonth}):
- Budget Status: ${budgetStatus}
- Spending by Category:\n${categoryBreakdown || 'No spending recorded yet.'}
- Recent Transactions:\n${recentTransactions || 'No transactions recorded yet.'}

Rules:
1. Always be concise, polite, and encouraging. Focus on helpfulness.
2. Use clear formatting (markdown lists, bolding for key figures) so your advice is scannable and premium.
3. Keep responses under 2-3 paragraphs. If the user asks for a detailed plan, you can write more.
4. If they ask about things completely unrelated to finance or budgeting, politely redirect them back to financial matters.
5. Always use Indian Rupees (₹) as the currency for all transaction values, suggestions, and budget discussions. Formatting should follow Indian standards.`;
  },

  /**
   * Send chat to Gemini API (or fall back to Mock Mode)
   */
  async sendMessage(userMessage, chatHistory, expenses, budget, currentMonth) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      // Return smart simulated mock response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.getMockResponse(userMessage, expenses, budget));
        }, 1200); // Add a natural delay
      });
    }

    const systemInstruction = this.buildSystemInstruction(expenses, budget, currentMonth);
    
    // Format history for Gemini API
    // Gemini API structure: { contents: [ { role: 'user'|'model', parts: [{ text: '...' }] } ] }
    const contents = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiText) {
        throw new Error('Received empty response from Gemini API.');
      }

      return aiText;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return `⚠️ **Error communicating with Gemini API:** ${error.message}\n\nPlease check that your API Key is correct and that your internet connection is active.`;
    }
  },

  /**
   * Generates highly detailed and context-aware mock responses based on input keywords
   */
  getMockResponse(userMessage, expenses, budget) {
    const query = userMessage.toLowerCase();
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    // Group categories
    const categorySpend = {};
    expenses.forEach(e => {
      categorySpend[e.category] = (categorySpend[e.category] || 0) + Number(e.amount);
    });
    
    // Simple helper to find highest spend category
    let highestCat = 'none';
    let highestVal = 0;
    Object.entries(categorySpend).forEach(([cat, val]) => {
      if (val > highestVal) {
        highestVal = val;
        highestCat = cat;
      }
    });

    // 1. GREETINGS
    if (query.match(/\b(hello|hi|hey|greet|welcome|who are you)\b/)) {
      return `👋 **Hello! I'm SmartSpend AI**, your personal financial assistant. 
      
I'm currently running in **Demo Mock Mode** because no API key has been added. 

How can I help you today? You can ask me questions like:
* *"Summarize my spending"*
* *"Where is most of my money going?"*
* *"How can I save on food?"*

*(To connect me to real-time AI, click the **key icon** at the top of the chat panel to enter a Gemini API Key!)*`;
    }

    // 2. SUMMARY / AUDIT
    if (query.match(/\b(summary|overview|report|analytics|status|habits|pacing)\b/)) {
      const budgetText = budget.total > 0 
        ? `total monthly budget of **₹${budget.total.toLocaleString('en-IN')}**` 
        : 'no total budget configuration';
        
      return `📊 **Here is a quick summary of your financial status:**

* You have spent **₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** this month out of a ${budgetText}.
* Your highest expenditure category is **${highestCat.toUpperCase()}** with **₹${highestVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** spent.
* You have logged **${expenses.length}** transactions.

**My Analysis:** 
${totalSpent > budget.total && budget.total > 0 
  ? `⚠️ **Alert:** You have exceeded your budget by **₹${(totalSpent - budget.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**. I recommend reviewing your recent transactions to identify non-essential purchases that can be paused.`
  : `✅ You're currently pacing well. You have **₹${(budget.total - totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** remaining in your budget for the rest of the month.`
}

*Note: Add your Gemini API key using the key icon above for deeper customized insights!*`;
    }

    // 3. FOOD CATEGORY SPECIFIC
    if (query.includes('food') || query.includes('eat') || query.includes('dining') || query.includes('grocery')) {
      const foodSpent = categorySpend['food'] || 0;
      const foodLimit = budget.categories['food'] || 0;
      return `🍕 **Food & Dining Analysis:**

You have spent **₹${foodSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** on food. ${foodLimit > 0 ? `Your target limit is **₹${foodLimit.toLocaleString('en-IN')}**.` : ''}

**Practical tips to save on food:**
1. **Meal Prep:** Preparing just 3 lunches a week at home instead of eating out can save you roughly **₹5,000 - ₹8,000** per month.
2. **Scan Groceries:** Try to shop with a strict list. Impulse snacks make up to 15% of checkout bills.
3. **Audit Delivery Services:** Food delivery apps charge up to a 30% markup plus delivery/service fees. Opting for pickup can save significant cash.

*Connect Gemini API to get a personalized audit of your specific food transactions!*`;
    }

    // 4. GENERAL SAVINGS ADVICE
    if (query.includes('save') || query.includes('saving') || query.includes('tips') || query.includes('advice') || query.includes('help')) {
      return `💡 **Top Actionable Savings Strategies:**

1. **The 50/30/20 Rule:** Try to allocate **50%** of your income to Needs, **30%** to Wants, and **20%** to Savings/Debt repayment.
2. **The 48-Hour Rule:** For shopping items, place them in a wishlist or shopping cart and wait 48 hours before purchasing. You'll find that up to 60% of the time, the impulse to buy fades.
3. **Cancel Idle Subscriptions:** Review your recurring monthly charges. Active gym memberships, unused streaming services, or software trials add up quickly.

*Enter a Gemini API key using the key icon above, and I will analyze your actual purchases to give you custom saving options!*`;
    }

    // 5. SHOPPING CATEGORY SPECIFIC
    if (query.includes('shopping') || query.includes('buy') || query.includes('clothes') || query.includes('amazon')) {
      const shopSpent = categorySpend['shopping'] || 0;
      return `🛍️ **Shopping Expenditures Analysis:**

You have spent **₹${shopSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** on shopping. 

**Smart Shopping tips:**
* Try using browser extension price trackers to check historical pricing before buying online.
* Delete pre-saved credit card details on retail websites. The extra friction of typing details prevents impulse buying.
* Always shop out of season (e.g. buying winter apparel in summer) for deep discounts of 40%+.`;
    }

    // 6. DEFAULT FALLBACK
    return `🤖 **SmartSpend AI Advisor (Demo Mode):**

I received your question: *"${userMessage}"*

To give you a precise, intelligent answer about your specific expenses, I need a connection to Google Gemini. 

🔑 **How to activate:**
1. Click the **key icon** at the top right of this chat panel.
2. Enter your Gemini API key (you can get one for free at [Google AI Studio](https://aistudio.google.com/)).
3. Click Save.

Once activated, I can dynamically analyze your transaction history and give you custom advice!`;
  }
};
