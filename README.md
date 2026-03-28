# The Wrong Room

**The Wrong Room** is a browser-based, AI-powered interactive dungeon game. It leverages MediaPipe for real-time object detection (using your webcam to find items like apples, cell phones, and wristwatches) and integrates with the Gemini Live API for real-time, dynamic narrative streaming to act as your Dungeon Master.

## Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **Gemini API Key**: You will need an active API key from Google AI Studio with access to the Gemini Live API.

## Project Structure
This is a monorepo containing:
- `/frontend`: The React + Vite client app.
- `/backend`: A lightweight Express server for proxying token requests and authenticating with the Gemini Live API safely during local development.

## Local Setup & Running the App

### 1. Configure the Environment Variables
Before running the application, you need to set up the Gemini API key. Add it to the `backend` directory, which serves as the central configuration point.

1. Create a file named `.env.local` inside the `backend/` folder:
```bash
# From the root directory:
touch backend/.env.local
```

2. Add your Gemini API key to `.env.local`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Start the Backend Server
The backend provides a local token proxy to abstract the API key from the frontend during development.

1. Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```

2. Install the dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```
The backend will run at `http://localhost:3001` and provide your frontend with access to the Gemini API key through the local proxy.

### 3. Start the Frontend Application
Leave the backend running and open a new terminal window or tab.

1. Navigate to the `frontend` directory:
```bash
cd frontend
```

2. Install the dependencies:
```bash
npm install
```

3. Start the development environment:
```bash
npm run dev
```

The React app will launch, typically accessible at `http://localhost:5173`. 
Open this URL in your browser. 

### 4. Play the Game
- Ensure your browser has permission to access your webcam.
- Once loaded, follow the on-screen instructions to get started. The Dungeon Master will wait for you to scan a real-life artifact using your camera before beginning the multi-challenge narrative!

## Core Technologies

- **React + Vite**: Chosen for lightning-fast Hot Module Replacement (HMR) and a highly responsive development experience.
- **MediaPipe (Tasks Vision)**: Enables on-device, real-time object detection. This allows the game to "see" your physical artifacts via the webcam with minimal latency and maximum privacy.
- **Gemini Live API**: Powering the Dungeon Master. We use the WebSocket-based Multimodal Live API to provide real-time audio and text narrative, creating a truly interactive and conversational storytelling loop.
- **Framer Motion**: Used to create a premium, "magical" feel through smooth transitions and complex UI animations.
- **Tailwind CSS**: A utility-first CSS framework that allowed us to build a sophisticated, dark-mode-first design system rapidly.
- **Express (Node.js)**: Acts as a lightweight bridge for secure token management and local development proxying.

---

**Note on Vercel Deployment:** The app contains configurations (`vercel.json`) set up for easy deployment. In production, provide the `GEMINI_API_KEY` directly via the environment variables dashboard in Vercel.
