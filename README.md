# Questify – Full-Stack Productivity & Task Management Application

Questify is a full-stack productivity application designed to help users organize their daily activities, manage tasks, track progress, and improve productivity through an interactive dashboard. It combines task management, productivity analytics, lifetime achievements, and daily interactive challenges in one platform.

## Features

### Task Management
- Create, edit, and delete tasks.
- Mark tasks as completed or pending.
- Set task priorities: High, Medium, and Low.
- Organize tasks using categories and custom lists.
- Set due dates, times, and reminders.
- Track overdue and upcoming tasks.
- Add notes, subtasks, and attachments.
- Support recurring tasks.
- Search, filter, and sort tasks.

### Dashboard & Productivity
- Interactive productivity dashboard.
- View task statistics and completion progress.
- Track daily productivity and activity.
- Calendar-based task organization.
- Productivity insights and analytics.
- Dark and light themes.

### Gamification & Achievements
- Daily interactive puzzle challenges.
- AI-assisted challenge generation.
- Track challenge attempts and completion.
- Lifetime achievement milestones.
- Task completion streaks and progress tracking.

### Notifications
- Browser push notifications.
- Task reminder notifications.
- Scheduled reminder checks.

### User Experience
- Profile customization.
- Responsive interface.
- Persistent task and achievement data.

## Tech Stack

**Frontend**
- React.js
- JavaScript (ES6+)
- CSS3
- HTML5
- Vite
- React Router

**Backend**
- Node.js
- Express.js
- REST APIs

**Database**
- MongoDB
- Mongoose

**AI Integration**
- Google Gemini API

**Other Tools & Technologies**
- Web Push Notifications
- Node-Cron
- Git
- GitHub
- VS Code

## Project Structure

```text
Questify/
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       └── utils/
│
├── server/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── server.js
│   └── .env
│
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/MANOS-19/Questify-task-manager.git
```

### 2. Navigate to the Project

```bash
cd Questify-task-manager
```

### 3. Install Frontend Dependencies

```bash
cd client
npm install
```

### 4. Install Backend Dependencies

Open another terminal:

```bash
cd Questify-task-manager/server
npm install
```

### 5. Configure Environment Variables

Create a `.env` file inside the `server` directory and configure the required MongoDB connection, AI API key, and Web Push notification credentials.

Use the environment variable names expected by the server code. Never upload real credentials or API keys to GitHub.

### 6. Start the Backend

From the `server` directory:

```bash
npm run dev
```

### 7. Start the Frontend

From the `client` directory in another terminal:

```bash
npm run dev
```

### 8. Open the Application

Open the local URL displayed by Vite in your browser.

## Project Status

Questify is an actively developed full-stack productivity application. Core task management, dashboard, analytics, gamification, and notification features have been implemented, with further improvements planned.