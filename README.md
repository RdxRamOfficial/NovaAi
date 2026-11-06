# Nova AI — ChatGPT + Gemini starter

A responsive AI chat web app with a Node/Express backend. It supports switching between GPT and Gemini model families, selecting individual models, keeps chat history in the browser, and never exposes provider API keys to the frontend.

## What is included

- Premium black + purple responsive interface
- ChatGPT / Gemini provider selector
- New chat, local chat history, delete chat
- Server-side API calls (keys stay in `.env`)
- Loading indicator and readable error messages

## Requirements

- Node.js 20 or newer
- An OpenAI API key, a Gemini API key, or both

## Run locally

1. Extract the ZIP and open the `nova-ai` folder in a terminal.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Add your API key(s) to `.env`:

   ```env
   OPENAI_API_KEY=your_openai_key
   GEMINI_API_KEY=your_gemini_key
   ```

   Keep `.env` private. Never paste API keys into the React code or publish them to GitHub.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:5173`.

The API server runs on port 3001. You can use one provider first and add the other later. API usage may incur charges and is subject to provider limits.

## Build for deployment

```bash
npm run build
```

Set the environment variables on your hosting provider. Run `npm start` with `NODE_ENV=production` to serve the built app and API from the Express server. For a separate static frontend deployment, configure `/api` to proxy to your backend server.

## Android app (next step)

This starter is a responsive web app, not yet a signed Play Store APK. To wrap it as an Android project after installing Android Studio:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Nova AI" "com.novaai.app" --web-dir=dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Build and sign the Android app in Android Studio. For production, deploy the backend to HTTPS and configure the app to use that hosted API. Do not bundle provider API keys in the APK.

## Notes

- Model names are configurable in `.env` (`OPENAI_MODEL`, `GEMINI_MODEL`). If a model is unavailable to your account, set a model name supported by your provider account.
- Chat history is stored in this browser's local storage. This starter does not yet include cloud sync or user accounts.
- This is an independent starter project inspired by common AI chat interfaces; it is not an official OpenAI or Google app.


## Voice features

- Tap the microphone button to dictate a message in Hindi (browser Speech Recognition support required; Chrome on Android is recommended).
- Tap **Listen** below an AI reply to hear it spoken aloud using the browser speech engine.
- Microphone permission must be allowed by the browser.

## Language selection

The top-bar language menu lets you choose automatic language detection, Hindi, English, Bengali, Marathi, Tamil, or Telugu. The selected language is sent with each chat request and is also used for browser speech recognition and speech playback where the browser supports it.

## Model IDs

The model selector uses provider API model IDs, not ChatGPT/Gemini subscription names. The available models are a curated list; actual access depends on the API key, project, region, and provider rollout. If a selected model is unavailable to your API account, choose another model or update the model allow-list in `server/index.js`.
