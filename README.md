
# ChatBot

## Download

```bash
git clone https://github.com/mortalcr/chatBot.git
```

## About

**ChatBot** is a conversational bot designed for the Maracuya chat application. It enhances the chat experience by providing various commands, including weather updates, reminders, and a character search for "Rick and Morty." This bot leverages Supabase for user authentication and the OpenWeatherMap API for weather information.

## Features

- **Weather Information**: Get the current weather in Costa Rica.
- **Reminders**: Set a reminder with a date, time, and custom message.
- **Character Search**: Search for characters from the show "Rick and Morty."
- **Help Command**: View a list of available bot commands.

## Commands

- **/clima**: Shows the current weather in Costa Rica.
- **/recordar DD/MM/YYYY HH:MM message**: Sets a reminder with a specified date, time, and message.
- **/rickAndMorty name**: Searches for information about a "Rick and Morty" character.
- **/help**: Shows a help message listing all commands.

## Screenshots

![App Screenshot](https://i.ibb.co/19tfVCB/Whats-App-Image-2024-11-13-at-11-28-57-PM.jpg)

## Setup

To get started with **ChatBot**, you'll need to clone the repository, install dependencies, set up environment variables, and compile the TypeScript code.

### Clone the Repository

```bash
git clone https://github.com/mortalcr/chatBot.git
cd chatBot
```

### Environment Variables

Create a `.env` file in the root of the project and add the following environment variables. Replace the placeholder values with your actual credentials:

```plaintext
API_BASE_URL="YOUR_API_BASE_URL"
BOT_ID="YOUR_BOT_ID"
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_KEY="YOUR_SUPABASE_KEY"
BOT_EMAIL="YOUR_BOT_EMAIL"
BOT_PASSWORD="YOUR_BOT_PASSWORD"
WEATHER_API_KEY="YOUR_WEATHER_API_KEY"
COOKIE_KEY="YOUR_COOKIE_KEY"
```

### Installing Dependencies

```bash
npm install
```

### Compiling and Running the Bot

To compile the TypeScript code and run the bot, use:

```bash
# Compile TypeScript
npx tsc

# Run the bot
node dist/bot.js
```

The bot will authenticate itself, listen for incoming messages, and respond to commands.

## Development and Testing

For development and testing, you can recompile the code whenever you make changes and run it again with:

```bash
npx tsc && node dist/bot.js
```

## Usage

Once **ChatBot** is running, it will listen to messages in the Maracuya chat application. You can interact with the bot by sending commands in the chat.

## Authors

- Primary Author [@mortalcr](https://www.github.com/mortalcr)

