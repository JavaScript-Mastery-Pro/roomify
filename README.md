<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your Roomify app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Sign in with your Puter account when prompted in the UI.

## Puter Worker Setup (project storage)

This app stores project history in each user's Puter KV via a worker called with `puter.workers.exec()`.

1. In Puter, upload `puter-worker.js` to your account.
2. Deploy it with `puter.workers.create('roomify-api', 'puter-worker.js')`.
3. Set `VITE_PUTER_WORKER_URL` in `.env.local` to the deployed worker URL.
