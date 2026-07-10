# AI Interview Coach - React Project

A local-first AI interview coaching dashboard with live feedback, featuring:

- 🎥 Live video calibration and recording
- 📊 Real-time performance metrics (eye contact, confidence, speech rate)
- 📈 Progress tracking and analytics
- 🎯 Interview simulation with various difficulty levels
- 🏆 Achievements and streak tracking
- 📝 Interview history and detailed reports

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Panel, SectionLabel, Reticle
│   ├── Cards.jsx       # BrutalButton, StatCard, Meter
│   └── Charts.jsx      # RadialScore and chart components
├── pages/              # Page components
│   ├── DashboardPage.jsx
│   ├── SetupPage.jsx
│   ├── CalibrationPage.jsx
│   ├── InterviewPage.jsx
│   ├── ResultsPage.jsx
│   ├── AnalyticsPage.jsx
│   ├── HistoryPage.jsx
│   ├── AchievementsPage.jsx
│   └── SettingsPage.jsx
├── utils/
│   ├── constants.js    # Color palette and utilities
│   └── data.js         # Mock data for sessions and feedback
├── App.jsx             # Main app component
└── index.css           # Global styles
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (irreversible)

## Technologies Used

- **React 18** - UI library
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Tailwind CSS** - Utility-first CSS
- **Create React App** - Project setup

## Features

### Interview Modes
- SQL
- Python
- Data Science
- HR
- Koios Simulation

### Difficulty Levels
- Junior
- Mid
- Senior

### Session Durations
- 15 minutes
- 30 minutes
- 45 minutes

### Metrics Tracked
- Technical Knowledge
- Communication Skills
- Confidence Level
- Eye Contact
- Speech Rate
- Attention Level

## Design System

The app uses a brutalist design system with custom colors:
- **Ink** (#0E0E0C) - Dark background
- **Paper** (#F4F0E4) - Light text/accent
- **Panel** (#191815) - Primary panel
- **Panel2** (#232220) - Secondary panel
- **Alarm** (#FF4422) - Red/warning
- **Signal** (#C9FF3A) - Green/success
- **Amber** (#FFB200) - Warning/caution
- **Steel** (#8C887C) - Gray/secondary text
- **Blue** (#58B8FF) - Information

## Development

The project uses Create React App for the build system and development server.

### Customization

To customize colors, edit `src/utils/constants.js`:

```javascript
export const COLORS = {
  ink: "#0E0E0C",
  paper: "#F4F0E4",
  // ... other colors
};
```

## License

MIT

## Author

AI Interview Coach Project
