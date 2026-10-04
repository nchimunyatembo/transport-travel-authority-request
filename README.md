# PDHO Requests

React and Vite provide the client in `public/`; Express serves the API and the production client from the same service. Uploaded request documents and signatures are stored in `uploads/`.

## Local Development

Requirements: Node.js 20 or newer and MySQL.

1. Install dependencies with `npm ci`.
2. Create a local MySQL database and copy `.env.example` to `.env`. Set the local DB credentials and a private `JWT_SECRET`.
3. Run `npm start`. The `prestart` script creates any missing application tables, then Express starts on `PORT` (3000 by default).
4. For frontend hot reload, run `npm run dev` in another terminal. Vite proxies `/api` and `/uploads` to the Express server.

## Railway Deployment

Deploy this repository as one Railway service. No separate client service is required: Railway builds the Vite client into `dist/`, and Express serves it with the API.

1. Push the project to a private GitHub repository. `.gitignore` excludes `.env`, uploaded files, dependencies, and build output. Do not commit real credentials or uploaded documents.
2. In Railway, create a project, deploy the GitHub repository as a service, and add a Railway MySQL service.
3. Configure the application service to build with `npm run build` and start with `npm start`. The build creates `dist/`; `npm start` runs the idempotent schema setup before starting Express.
4. Add these variables to the application service. Replace `MySQL` in the references if the database service has a different name:

   ```text
   NODE_ENV=production
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   JWT_SECRET=<a unique random secret>
   ```

   Generate a secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, then enter it directly in Railway Variables. Never use the example secret in production.

5. Attach a Railway Volume to the application service at the directory containing `server.js`'s `uploads/` folder (Railway's default app root is `/app`, so the usual mount path is `/app/uploads`). Keep the app service, database, and volume in compatible regions. Without this volume, uploads can be lost when the service is redeployed or replaced.
6. Set the Railway healthcheck path to `/api/health`. It returns healthy only when MySQL responds.
7. Deploy, wait for the healthcheck to pass, then add a Railway-generated domain in the service's Networking settings.

### First administrator account

The app has no public sign-up. To create the first administrator, temporarily add `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` to the Railway application service variables. On startup, after the schema is created, the bootstrap script hashes the password and creates a `delegate` (ADMIN) account only if the `users` table is empty. Use a password of 8 to 72 bytes. After the deployment succeeds, remove all three `INITIAL_ADMIN_*` variables from Railway and redeploy. Then sign in with the email and password you set. The bootstrap will not add users once the table contains any account.

The initial schema is in `models/schema.sql`. Startup applies it using `CREATE TABLE IF NOT EXISTS`; it does not delete existing records. The SQL migration in `models/migrations/` is for an older existing database and is not needed for a new database created from the current schema.

## Runtime Configuration

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are supported locally. The app also accepts Railway MySQL's `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE` variables. In production, database credentials and `JWT_SECRET` must be set explicitly.
