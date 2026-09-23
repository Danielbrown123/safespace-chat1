[README.md](https://github.com/user-attachments/files/32566824/README.md)
# SafeSpace — Vercel + Render deployment

This version separates the static frontend (Vercel) from the Node.js + Socket.IO live-chat backend (Render).

## 1. Deploy backend to Render
Create a Render Web Service from the `backend` folder.
- Build command: `npm install`
- Start command: `npm start`
- The included `render.yaml` can also be used.
After deployment, copy the backend URL, for example:
`https://safespace-chat-api.onrender.com`

## 2. Connect the Vercel frontend
Open `frontend/app.js` and replace:
`const API_URL = localStorage.getItem("SAFESPACE_API_URL") || "YOUR_RENDER_BACKEND_URL";`
with your actual Render URL.

Example:
`const API_URL = localStorage.getItem("SAFESPACE_API_URL") || "https://safespace-chat-api.onrender.com";`

Then deploy the `frontend` folder to Vercel.

## 3. Demo
User: open the Vercel URL and choose Start anonymous chat.
Counselor: open the same Vercel URL in another browser/window, choose Counselor, login:
username: counselor1
password: demo123

The backend pairs the waiting user with the online counselor over Socket.IO.

## Important
The demo uses in-memory storage, so data disappears when the backend restarts. Counselor credentials are demo credentials and are not secure enough for production. For a real mental-health service, add a database, HTTPS/WSS, secure authentication, authorization, consent/privacy controls, crisis escalation, rate limiting, secure logging, counselor verification and legal/compliance review.
