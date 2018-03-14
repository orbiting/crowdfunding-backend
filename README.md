# [DEPRECATED] Crowdfunding Server - Project R

This repository evolved into [republik-backend](https://github.com/orbiting/republik-backend) which in turn has been merged into the [orbiting/backends](https://github.com/orbiting/backends) monorepo. Most of the functionality of this backend is still avilable in the monorepo.

## Introduction
This [NodeJS](https://nodejs.org) server provides an [GraphQL](http://graphql.org) API to power your next crowdfunding. It works best together with [crowdfunding-frontend](https://github.com/orbiting/crowdfunding-frontend). This software is developped by [Project R](https://project-r.construction) and was used to power our crowdfunding at [Republik](https://www.republik.ch).

[Postgres](https://www.postgresql.org/) acts as the database and is queried by the amazing [pogi](https://github.com/holdfenytolvaj/pogi) client. The GraphQL API is powered by [Apollo's graphql-server](https://github.com/apollographql/graphql-server).

### Features
- passwordless / email authentication and session support with [express-session](https://github.com/expressjs/session).
- an extensive [crowdfunding data model](docs/CF-ERM.png "ERM")
  - pledges
  - memberships
  - goodies
  - payments
- payments via Stripe, PayPal, Postfinance and paymentslips.
- vouchers: give membership to other users as a present.
- testimonials: let users share their message (and image) with the world.
- events, faqs and updates via google spreadsheets.
- feeds: get user comments to specific topics. Includes sorting via [Reddit's](https://reddit.com) hottness [algorithm](lib/hottness.js).
- votings: let users vote on different options.
- statistic endpoints (for memberships, payments, testimonials, votings) to share insights.

Check out the (production) API: [https://api.republik.ch/graphiql](https://api.republik.ch/graphiql)


## Usage

### Quick start
You need to have postgres running somewhere.

Boostrap your .env file.
```
PORT=3001
PUBLIC_URL=http://localhost:3001
SESSION_SECRET=replaceMe
DATABASE_URL=postgres://postgres@localhost:5432/postgres
```

Adapt the [seed file](seeds/republik.js) to your needs and bootstrap the DB.
```
npm run db:reset
```

Run it.
```
npm install
npm run dev
```
Check out the API: [http://localhost:3001/graphiql](http://localhost:3001/graphiql)

### First steps
* You want to change [translations.js](/lib/translations.json) and adapt it to your wording. See the [comment](#static-texts) about static texts about how to conveniently do that with spreadsheets.
* Adapt the [environment variables](#environment) to e.g. integrate billing or enable image uploading to S3.


## Development / Behind the scenes
Please read the source (a good starting are the [resolvers](graphql/resolvers/)) and open an issue if you have a question.

### Third party services
We make use of many third party services.

**Emails** are sent via [Mandrill](https://mandrillapp.com) see [lib/sendMail.js](lib/sendMail.js). We make extensive use of mandrill templates to send custom styled HTML emails and also to convert them to text-only emails, see this [README](seeds/email_templates/README.md). You can find all our templates inside the [seeds/email_templates](seeds/email_templates/) folder.

We integrated 3 **payment services**: [Stripe](https://stripe.com), [PayPal](https://www.paypal.com) and [Postfinance](https://www.postfinance.ch/de/unternehmen/produkte/debitorenloesungen/e-payment-psp.html). On top of that we manually handle swiss payment slips. All the payment "magic" happens in [payPledge.js](graphql/resolvers/RootMutations/payPledge.js).

We use [Google Spreadsheets](https://docs.google.com/spreadsheets) to manage user-facing messages (<a name="static-texts"></a>**"static texts"**</a>) this API emits, see [lib/translations.js](lib/translations.js). Refresh this file with `npm run translations`. Gsheets also act as a **small CMS** for FAQs, updates and events. To accomplish that we wrote a small [macro](seeds/gsheets/macro.gs) which sends a GET request via a menu-item inside the spreadsheet to this API. [src/gsheets.js](src/gsheets.js) receives the message and refreshes the cached gsheet inside the DB. Don't use the content of this file without adapting it to your needs.

We store our **assets** inside [Exoscale's Object Store](https://www.exoscale.ch/object-storage/). It provides a S3 v3 compatible API, which we talk to via [lib/uploadExoscale.js](lib/uploadExoscale.js)

[Keycdn](https://www.keycdn.com) acts as **CDN** for our assets. [lib/keyCDN.js](lib/keyCDN.js) provides an easy way to purge the cache for specific urls.

[Slack](https://slack.com) is used for **notifications** and overview of user comments. See [lib/slack.js](lib/slack.js).

We use [Phantomjscloud](https://phantomjscloud.com/) to **render** social-media images via the front-end.


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

# used by cancelPledge to transfer canceled memberships
PARKING_PLEDGE_ID=
PARKING_USER_ID=

# mandrill api key, used to send mail
MANDRILL_API_KEY=
# mails are not send in DEV, except SEND_MAILS is true
# mails are suppressed in production if SEND_MAILS is false
# this is a kill switch, if SEND_MAILS is false, no mails will be sent
# instead they are printed to console.
SEND_MAILS=true
# if set, mails are only sent to the specified domain, others are filtered
# out and printed to console instead.
# This is handy if you want to test internally with real mails
# but you must make sure not to send mails to customers.
SEND_MAILS_DOMAIN_FILTER=project-r.construction

# where to send auth mails from
AUTH_MAIL_FROM_ADDRESS="kontakt@republik.ch"
# where to send new (FA)Questions to
QUESTIONS_MAIL_ADDRESS="faq@republik.ch"
# where to send mails from (if no param specified for sendMail or sendMailTemplate)
DEFAULT_MAIL_FROM_ADDRESS="kontakt@republik.ch"
DEFAULT_MAIL_FROM_NAME=Republik

# mailchimp is used to subscribe people to lists
MAILCHIMP_URL=https://us14.api.mailchimp.com
MAILCHIMP_API_KEY=
REMIND_ME_LIST_ID=
# random secret: used to sign the subscription link send by mail
SUBSCRIBE_SECRET=
# mailchimp group/interest ids, see script/getMailchimpInterests.js
MAILCHIMP_INTEREST_PLEDGE=
MAILCHIMP_INTEREST_MEMBER=
MAILCHIMP_INTEREST_MEMBER_BENEFACTOR=

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

### Scripts
There are multiple scripts to run things manually (like [importGoals.js](script/importGoals.js)).
Checkout the [script folder](script/), each script comes with a header explaining how to use it.


## Licensing
The source code and it's documentation is licensed under [GNU AGPLv3](LICENSE.txt)+.

The content of [translations.js](/lib/translations.json) is property of [Project R](https://project-r.construction) and may not be reproduced without permission.

Check the READMEs in [/assets/geography/*/](/assets/geography/) for licensing details of used geo data.
