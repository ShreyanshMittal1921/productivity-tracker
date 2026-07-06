# Life Dashboard: Productivity & Smart Calorie Tracker

A unified, beautifully designed personal dashboard that helps you track your daily productivity habits, goals, and nutrition in a seamless interface. 

Built with an aesthetic "Bullet Journal" feel, this full-stack web application features a sleek dark/light mode toggle, dynamic habit heatmaps, and a **Smart AI Calorie Tracker** powered by Google's Gemini AI.

## Features

### 🍋 Productivity Tracker
- **Habit Tracking**: Log daily habits and visualize them on an interactive monthly heatmap.
- **Goal Trackers**: Track long-term goals and milestones using mini-calendars.
- **Daily Reflection**: Log your mood, weather, sleep duration, and daily diet score.
- **Pomodoro Timer**: Built-in, aesthetically pleasing Pomodoro timer for focus sessions.
- **Water Intake**: Simple glass-tapping UI to track your hydration.

### 🥗 Smart Calorie Tracker
- **AI-Powered Natural Language Logging**: Simply type what you ate (e.g., *"I had 2 scrambled eggs and a banana for breakfast"*), and the AI will automatically calculate the nutritional value.
- **Macro Progress Meters**: Visual progress bars for your daily Calories, Protein, Fats, and Fiber.
- **Meal Organization**: Automatically categorizes your food logs into Breakfast, Lunch, Dinner, and Snacks.
- **Smart Limits**: Progress bars turn red if you exceed your daily calorie limit.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (Zero UI frameworks for maximum speed and simplicity).
- **Backend**: Node.js & Express.
- **Database**: SQLite (Local database for fast, secure data storage).
- **Authentication**: bcrypt password hashing and express-session.
- **AI Integration**: `@google/genai` (Gemini API for smart nutrition parsing).

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A free Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 1. Install Dependencies
Navigate into the project directory and install the necessary packages:
```bash
npm install
```

### 2. Configure the Environment
The application uses an AI API to parse natural language food logs.
1. Open the `.env` file located in the root of the project.
2. Replace `your_gemini_api_key_here` with your actual Gemini API Key.

It should look like this:
```env
GEMINI_API_KEY=AIzaSyYourSecretKeyHere
PORT=3000
```

### 3. Run the Application
Start the local server:
```bash
node server.js
```

The application will be accessible in your web browser at:
`http://localhost:3000`

## Usage
1. Open the app in your browser and register an account.
2. Once logged in, use the toggle in the top right corner to switch between **Productivity Mode** and **Nutrition Mode**.
3. Your data is securely saved in a local `database.sqlite` file. You can also manually Export/Import your data using the buttons in the header!
# productivity-tracker
