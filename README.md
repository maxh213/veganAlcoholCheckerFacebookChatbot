# veganAlcoholCheckerFacebookChatbot

A facebook chatbot which attempts to tell people who message it whether a given drink in vegan or not. The code for this one is a bit hacky unfortunately because it was the first one I wrote, I'm in the process of cleaning it up!

# Want to make something like this yourself?

https://github.com/jw84/messenger-bot-tutorial

## Routes

| Path | Status |
|---|---|
| `/` | live |
| `/webhook/` | live |

## Environment

- `PORT` — HTTP port, default 80
- `NODE_ENV` — Environment setting, set to `test` for running tests
- `WEBHOOK_TOKEN` — Facebook webhook verify token
- `FB_PAGE_TOKEN` — Facebook page access token
