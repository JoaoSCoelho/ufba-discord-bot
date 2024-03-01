# ufba-discord-bot
 
## Getting Started
**For more details: [Discord.JS Guide](https://discordjs.guide/)
1. First of all, create a Discord Application in [Discord Developer Portal](https://discord.com/developers/applications/)
2. Create a file called `.env` in the root directory of the project with the follow variables
    ```.env
    TOKEN=place_your_bot_token
    CLIENT_ID=bot_id
    GUILD_ID=discord_bot_development_server_id
    DATABASE_CHANNEL_ID=bot_database_channel_id
    LOG_CHANNEL_ID=bot_log_channel_id
    FULL_LOG_CHANNEL_ID=bot_full_log_channel_id
    BOT_ADMINS=a_comma-separated_and_space-free_list_of_discord_users_who_will_have_full_access_to_all_bot_commands
    PREFIX=the_prefix_of_admin_commands // Default is _
    ```
3. Install the dependecies
    ```bash
    $ npm install
    ```
4. Run the bot
      
    4.1 Production mode
    ```bash
    $ npm run start
    ``` 
    4.2 Development mode (auto-restart)
    ```bash
    $ npm run dev
    ```
** If you create new commands, you'll need to deploy then!
to deploy your commands, use once:
```bash
$ DEPLOY=true npm run start
```
or use command `deploy` on your bot (it is a admin command, use then with the bot prefix)

## How to use commands
* [Commands Helper](/docs/commands-helper.md)
* [Admin commands Helper](/docs/admin-commands-helper.md)

### Used Technologies:
* Typescript
* Node.JS
* Discord.JS
