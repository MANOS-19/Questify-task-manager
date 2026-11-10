# Questify — connect React to MongoDB Atlas

## Project structure
- `src/` — existing React + Vite frontend (already calls `/api/tasks`)
- `server/` — Express REST API and Mongoose model

## 1. Configure MongoDB Atlas
1. In Atlas, open **Database & Network Access → Network Access** and allow your current development IP. For a temporary local test only, `0.0.0.0/0` allows access from anywhere; remove it after testing.
2. Under **Database Access**, make sure the database user exists and its password is correct.
3. In the cluster, select **Connect → Drivers → Node.js** and copy the connection string. Replace the password placeholder with the database user's password. URL-encode special characters in the password.
4. The database name in the URI should be `questify`.

## 2. Configure the backend
In a terminal:
```bash
cd server
npm install
```
Copy `server/.env.example` to `server/.env`, then fill in the real Atlas URI:
```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_DB_USER:YOUR_PASSWORD@YOUR_CLUSTER_HOST/questify?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173
```
Never commit or share `server/.env`.

Start the backend:
```bash
npm run dev
```
Expected terminal output includes `MongoDB Atlas connected successfully` and `Questify API running at http://localhost:5000`.

## 3. Configure and start the frontend
Open a second terminal from the project root:
```bash
npm install
```
The supplied `.env.example` already contains the local API setting. Copy it to `.env` if needed:
```env
VITE_API_URL=http://localhost:5000/api/tasks
```
Then run:
```bash
npm run dev
```

## 4. Verify the connection
- Open `http://localhost:5000/` — API status should say database `connected`.
- Open `http://localhost:5000/api/health` — should return `{"api":"ok","database":"connected"}`.
- Open `http://localhost:5000/api/tasks` — initially `[]` if there are no Questify tasks yet.
- In the React app, add a task. It should appear in the UI and in Atlas **Browse Collections** under database `questify`, collection `tasks`.
- Refresh the browser. The task should still appear. Then test complete, edit, and delete.

## Important Atlas note
The Atlas cluster overview's **Data Size** can include sample datasets and other collections. It is not proof that Questify tasks were saved. Verify the `questify` database and `tasks` collection in **Browse Collections**. Do not delete sample data unless you know you no longer need it.

## API routes
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/tasks` | Read all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Edit or complete a task |
| DELETE | `/api/tasks/:id` | Delete a task |
