# Users & Roles - Project R

## Development
You need to have redis installed and running.

Boostrap your .env file
```
PUBLIC_URL=http://localhost:3000
MAIL_URL=smtp://postmaster@sandboxc0bfac8e57f84f4880052f8899470727.mailgun.org:PASSWORD@smtp.mailgun.org/
FROM_MAIL_ADDRESS=test_account@project-r.construction
SESSION_REDIS_HOST=127.0.0.1
SESSION_REDIS_PORT=6379
PASSWORDLESS_REDIS_HOST=127.0.0.1
PASSWORDLESS_REDIS_PORT=6379
SESSION_SECRET='asdf'
USERS_DB_URL=postgres://postgres:PASSWORD@172.17.0.1:54321/postgres
```

### Run it
```
npm install
npm start       # <- runs npm start in client/ and nodemon index.js
```

## Production
TODO


## Setup
This repo hold a client (with create-react-app) and a server (with babel-node). The setup is inspired by these docs:
- https://www.fullstackreact.com/articles/using-create-react-app-with-a-server/
- https://github.com/babel/example-node-server
