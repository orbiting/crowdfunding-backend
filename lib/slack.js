const logger = require('./logger')
const {SLACK_API_TOKEN, SLACK_CHANNEL_VOTING} = process.env

let SlackWebClient
if (SLACK_API_TOKEN) {
  SlackWebClient = new (require('@slack/client').WebClient)(SLACK_API_TOKEN)
}

const publish = (channel, content) => {
  if (!SlackWebClient) {
    logger.log('slack message not published (missing SLACK_API_TOKEN):\n' + content)
    return true
  }
  return new Promise((resolve, reject) => {
    SlackWebClient.chat.postMessage(channel, content, (err, res) => {
      if (err) {
        return reject(err)
      }
      return resolve(res)
    })
  })
}
exports.publish = publish

exports.publishComment = (user, comment) => {
  const content = `*${user.firstName} ${user.lastName}* wrote: (${comment.id.substring(0, 8)})\n\n${comment.content}`
  return publish(SLACK_CHANNEL_VOTING, content)
}

exports.publishCommentUpdate = (user, comment, oldComment) => {
  const content = `*${user.firstName} ${user.lastName}* edited: (${comment.id.substring(0, 8)})\n\n*old:*\n${oldComment.content}\n\n*new:*\n${comment.content}`
  return publish(SLACK_CHANNEL_VOTING, content)
}

exports.publishCommentUnpublish = (user, comment) => {
  const content = `*${user.firstName} ${user.lastName}* unpublished: (${comment.id.substring(0, 8)})\n\n${comment.content}`
  return publish(SLACK_CHANNEL_VOTING, content)
}
