const tmi = require("tmi.js");
const fs = require("fs");
const filter = require("leo-profanity");
const fetch = require("node-fetch");
const crypto = require("crypto");

require("dotenv").config();

const createSignature = (stringToSign) => {
  const hash = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(stringToSign).digest('hex');
  return hash;
}

const commands = {
  question: {
    response: (argument) => {
      return `${argument}, Successfully added your question to the list of questions.`;
    },
  },
};

const client = new tmi.Client({
  options: { debug: true }, // you can disable logging here if you don't want it
  connection: {
    reconnect: true,
  },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_BOT_USERNAME],
});

client.connect();

client.on("message", async (channel, tags, message, self) => {
  if (self) return;

  if (message.startsWith("!question")) {
    const argument = message.split("!question ")[1];
    if (!argument) {
      return client.say(channel, `@${tags.username} please provide a question after the command!`);
    };

    if (filter.check(argument)) {
      return client.say(channel, `@${tags.username} your message contains profanity!`);
    }

    try {
      const body = {
        username: tags.username,
        text: argument
      }
      const signature = createSignature(JSON.stringify(body))
      const response = await fetch('http://localhost:3000/create', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'X-Hub-Signature-256': signature }
      });
      if (response.status !== 200) {
        throw new Error('Something went wrong')
      }
      const data = await response.json();

      client.say(channel, commands.question.response(`@${tags.username}`));
    } catch (error) {
      // do something
      console.log(error);
    }
  }
});
