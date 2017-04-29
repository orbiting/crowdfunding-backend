# Crowdfunding Server - Project R

## Quick start
Boostrap your .env file.
```
PORT=3001
PUBLIC_URL=http://localhost:3001
SESSION_SECRET=replaceMe
DATABASE_URL=postgres://postgres@localhost:5432/postgres
```

Bootstrap the DB like this:
```
npm run db:reset
```

Run it.
```
npm install
npm start
```

## Development

### Environment
There are many knobs which can be turned to, check the following extensive list. Provided values are just an example.
```
PORT=3001
SESSION_SECRET=
DATABASE_URL=postgres://postgres@localhost:5432/postgres
NODE_ENV=development

# used to construct links in mails sent
PUBLIC_URL=http://localhost:3001
# used to construct links/redirects to frontend
FRONTEND_BASE_URL=http://localhost:3003

# basic auth
# provide the following ENV variables to enable HTTP basic auth.
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
BASIC_AUTH_REALM=

# set the auth cookie to a specific domain.
COOKIE_DOMAIN=

# whitelist requests from a specific domain
CORS_WHITELIST_URL=http://localhost:3003


# mandrill api key, used to send mail
MANDRILL_API_KEY=
# mails are not send in DEV, except SEND_MAILS is true
# mails are suppressed in production if SEND_MAILS is false
SEND_MAILS=true

# where to send auth mails from
AUTH_MAIL_FROM_ADDRESS="kontakt@republik.ch"
# where to send new (FA)Questions to
QUESTIONS_MAIL_ADDRESS="faq@republik.ch"
# where to send mails from (if no param specified for sendMail or sendMailTemplate)
DEFAULT_MAIL_FROM_ADDRESS="kontakt@republik.ch"
DEFAULT_MAIL_FROM_NAME=Republik

# mailchimp is used to subscribe people to lists
MAILCHIMP_API_KEY=
REMIND_ME_LIST_ID=
# random secret: used to sign the subscription link send by mail
SUBSCRIBE_SECRET=

# if truthy, @project-r.construction mail addresses get automatically
# signedin and no mail is sent (used for automated testing)
AUTO_LOGIN=1

# credentials to upload assets to the exoscale object store
EXO_KEY=
EXO_SECRET=
S3BUCKET=republik-staging
# where will the assets be available publicly
ASSETS_BASE_URL=https://assets.staging.republik.ch

# keyCDN access to clear cache on file uploads
# must correspond with the object store config
KEYCDN_API_KEY=
KEYCDN_ZONE_ID=
KEYCDN_ZONE_URL=

# phantomjscloud.com to render social media share images
PHANTOMJSCLOUD_API_KEY=


# payment secrets
PAYPAL_URL=
PAYPAL_USER=
PAYPAL_PWD=
PAYPAL_SIGNATURE=
PF_SHA_IN_SECRET=
PF_SHA_OUT_SECRET=
PF_PSPID=
STRIPE_SECRET_KEY=
```

## Scripts
### Upload images to assets
Assets for public use are stored under `script/data/images`. Place a new image you want to upload there, then run `npm run upload:images`. The public URLs of the new images are then printed on the console. This script does not purge the cache of existing images.

