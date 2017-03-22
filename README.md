# Crowdfunding Server - Project R

## Development
You need to have redis installed and running.

Boostrap your .env file
```
PORT=3001
PUBLIC_URL=http://localhost:3001
SESSION_SECRET=
DATABASE_URL=postgres://postgres:postgres@172.17.0.1:54321/postgres
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAIL_FROM_ADDRESS=
```

### DB
This server requires access to a postgres database. Ensure the `DATABASE_URL` is correct.
Bootstrap the DB like this:
```
$(npm bin)/db-migrate up
npm run seed
```

### Run it
```
npm install
npm start
```
