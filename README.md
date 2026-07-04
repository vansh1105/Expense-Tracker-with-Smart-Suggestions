# 💳 SmartSpend — MERN Expense Tracker with Smart AI Suggestions

SmartSpend is a premium personal finance manager built using the MERN stack (MongoDB, Express, Node.js) and Vanilla JS + CSS. It helps users log expenses, set custom monthly budget limits, track financial goals, and visualize spending trends with interactive charts.

Additionally, SmartSpend integrates with the **Google Gemini API** to act as a personal financial advisor, offering smart, context-aware savings recommendations and budgeting tips formatted in Indian Rupees (₹).

---

## 🚀 Key Features

*   **Secure Authentication**: Signup/login flow with hashed passwords (`bcryptjs`) and secure session tracking via JSON Web Tokens (`jwt`).
*   **Budgeting & Limits**: Category-level limit setting (Food, Transport, Utilities, Entertainment, Shopping, Healthcare, etc.) with real-time overspending alerts.
*   **Savings Goals**: Set up goals (e.g., *Save ₹50,000 for a laptop*) and log funds directly towards them.
*   **Dynamic Visualizations**: Responsive, theme-sensitive spending charts (Category Breakdown & Monthly Trends) built on `Chart.js`.
*   **Smart AI Suggestions**: Context-aware personal advisory chatbot that analyzes your real-time transactions and budgets using the Google Gemini API.
*   **Data Portability**: Export your logs to CSV for spreadsheet programs.

---

## 🛠️ Tech Stack

*   **Frontend**: Vanilla HTML5, CSS3 Custom Properties (sleek glassmorphism theme), JavaScript (ES6), `Chart.js` (graphing), and `Lucide Icons`.
*   **Backend**: Node.js, Express.js (REST API).
*   **Database**: MongoDB (Atlas) & Mongoose ODM.
*   **AI Engine**: Google Gemini API client-side integrations (with mock fallbacks).
*   **Development Utilities**: `Vite` (Frontend dev server), `Nodemon` (Backend live-reload), `Concurrently` (Single-command local startup).

---

## 📁 Repository Structure

```
smartspend-expense-tracker/
├── backend/                  # Express REST API & Database Models
│   ├── middleware/
│   │   └── auth.js           # JWT Authorization Middleware
│   ├── models/               # Mongoose Data Schemas
│   │   ├── Budget.js
│   │   ├── Expense.js
│   │   ├── Goal.js
│   │   └── User.js
│   └── server.js             # API entry-point
├── frontend/                 # Client UI (Vite Single Page Application)
│   ├── ai.js                 # Gemini AI integration engine
│   ├── analytics.js          # Spending analytics and budget checks
│   ├── app.js                # Core controller, DOM binding, and APIs
│   ├── charts.js             # Chart.js initialization & config
│   ├── index.html            # Main HTML layout
│   └── styles.css            # Dark mode glassmorphism UI styles
├── .env                      # Local server configuration
├── .gitignore
├── package.json
└── README.md
```

---

## 💻 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16+) and [MongoDB](https://www.mongodb.com/) installed/configured.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/vansh1105/expense-tracker-with-smart-suggestions.git
   cd expense-tracker-with-smart-suggestions
   ```

2. **Install Dependencies**:
   Install all dependencies for both frontend and backend from the root folder:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to the existing `.env` template):
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the Application**:
   Start both the frontend Vite server and backend API server concurrently:
   ```bash
   npm run dev
   ```
   *   Frontend will run at: `http://localhost:5173/`
   *   Backend Server will run at: `http://localhost:5000/`

5. **Set up AI Advisor**:
   Open the app in your browser, click on the **Sparkle Icon** in the bottom right corner, click the key icon in the drawer header, and enter your free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

---

## 👤 Author

*   Vansh Gandhi — [GitHub](https://github.com/vansh1105)
