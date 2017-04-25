# Crowdfunding Server - Project R

## Scripts
### Upload images to assets
Assets for public use are stored under `script/data/images`. Place a new image you want to upload there, then run `npm run upload:images`. The public URLs of the new images are then printed on the console. This script does not purge the cache of existing images.


## Development
Boostrap your .env file
```
PORT=3001
PUBLIC_URL=http://localhost:3001
SESSION_SECRET=replaceMe
DATABASE_URL=postgres://postgres@localhost:5432/postgres
```

### DB
This server requires access to a postgres database. Ensure the `DATABASE_URL` is correct.
Bootstrap the DB like this:
```
npm run db:reset
```

### basic auth
provide the following ENV variables to enable HTTP basic auth.
```
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
BASIC_AUTH_REALM=
```

### cookie domain
provide the following ENV variables to set the cookie on a specific domain
```
COOKIE_DOMAIN=
```

### Run it
```
npm install
npm start
```

