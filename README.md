# Snowball - Mei's friend

Mei has beautiful friend called Snowball, which used to make a Blizzard and cease enemy resistance.

## Installing

### Compile

To install bot, you need to have installed LATEST version of [NodeJS](https://nodejs.org/). Then, you should install TypeScript compiler and dependencies by running these commands:

```bash
npm install --global typescript
npm install
```

Then try to run compilation into good Javascript code by running this command:

```bash
tsc
```

Compilation may fail because of typings duplicate for `discord.js` library. So, to fix this errors you need to remove typings coming with `discord.js` in `node_modules/discord.js/typings/`. Then try to run compilation again and it shouldn't fail this time.

All compiled files will stay in directory named `out`. Clone `package.json` there, you'll get why later.

### Setup

Now, after compilation you should setup your bot for working.

Create file named `configuration.json` in `out/config` directory with this content like this:

```json
{
    "name": "❄️ SnowballBot",
    "token": "BOT_TOKEN",
    "modules": [{
        "name": "ping",
        "path": "ping"
    }, {
        "name": "eval",
        "path": "eval"
    }, {
        "name": "count",
        "path": "count"
    }, {
        "name": "embedME",
        "path": "embedMe"
    }, {
        "name": "ownerCMDs",
        "path": "ownerCmds"
    }, {
        "name": "shibChannel",
        "path": "shib"
    }, {
        "name": "count_V2",
        "path": "count-v2"
    }, {
        "name": "8Ball",
        "path": "8ball"
    }, {
        "name": "voiceRole",
        "path": "voiceRole"
    }],
    "autoLoad": ["ping", "eval", "count", "embedME", "ownerCMDs", "shibChannel", "count_V2", "8Ball", "voiceRole"],
    "botOwner": "133145125122605057"
}
```

- **`name`**: Name of the bot, used for output in console
- **`token`**: Bot authorization token, get it using [My Apps](https://discordapp.com/developers/applications/me) page on Discord Developers site.
- **`modules`**: Represents an array with information about plugins which will be registered once bot started.
  - `name`: Name of module
  - `path`: Absolute path from `cogs` directory
- **`autoLoad`**: Plugins which should be automatically loaded after registration, be sure you typing their names right: case matters, it's not path.
- **`botOwner`**: Your (owner) ID. It gives you permission to call `eval` command and other stuff which can do damage to bot if you type wrong ID here.

### Database

I like to use [MySQL](https://www.mysql.com/) database, compatible to nice `knexjs` library. You need to install it and setup user `snowballbot`. Put password into environment variable named `DB_PASSWD`. If you want, you can set different name for user, database name and even host IP using this vars:

- `DB_HOST`: Where database hosted (default falls to `127.0.0.1`)
- `DB_PASSWD`: Password for database user
- `DB_USER`: Name of user who connecting to database
- `DB_NAME`: Password of user who connecting to database

### Starting

You had to setup database, environment variable and configuration json file (locally).

Now, in your `out` is real distribute of your bot. You pushing it to your VM and starting using:

```bash
# installing all deps (that's why we copied package.json)
npm install
# starting
NODE_ENV=production node --trace-warnings ./init.js
```

:tada: Bot should now work.

## Contribution

### Pull Requests

I really appreciate your contribution to this project. You can fix my errors, create good cogs, but follow these styles:

- Use Visual Studio Code, it's awesome editor better than others and has good support for TypeScript.
- Use tslint, so you can check for errors
- Use universal API. I created `db`, `letters`, `utils`, be sure you using it and bot's gonna work anywhere!
- Be sure your plugin not for one server. For example, you can create cog for `shib channel` - that's fine, but you should support other servers if you making serious plugins like `Overwatch statistic`.

Don't be scared of making Pull Requests! Make it! I will suggest you what to change, what not to changed and etc. :)

### Issues

If you regular user, then report bugs and feedback to Issues section. You also can ask questions there.


**MADE WITH ♥ BY DAFRI_NOCHITEROV**.