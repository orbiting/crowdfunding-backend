Email templates
---------------

This folder stores the (mailchimp/mandrill) templates used by this server
to send emails to users.
You need to manually copy the file contents into the mailchimp template interface,
then choose 'Send to Mandrill'.

Mails are send by [sendMailTemplate.js](/sendMailTemplate.js), check
[remindEmail.js](graphql/resolvers/RootMutations/remindEmail.js) or
[signIn.js](/lib/signIn.js) for usage.
