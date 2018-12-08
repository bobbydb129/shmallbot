const Discord = require("discord.js");
const logger = require('winston');
const client = new Discord.Client();
const config = require("./config.json");
const SQLite = require("better-sqlite3");
const sql = new SQLite('./scores.sqlite');

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

client.on("ready", () => {
   logger.info('Connected.');

	// Check if the table "points" exists.
	const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'scores';").get();
	
   if (!table['count(*)']) {
      logger.info('Creating tables...');

      // If the table isn't there, create it and setup the database correctly.
		sql.prepare("CREATE TABLE scores (id TEXT PRIMARY KEY, user TEXT, guild TEXT, points INTEGER, level INTEGER);").run();
		
      // Ensure that the "id" row is always unique and indexed.
		sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON scores (id);").run();
		sql.pragma("synchronous = 1");
		sql.pragma("journal_mode = wal");
	}

   logger.info('Tables loaded.');

	// And then we have two prepared statements to get and set the score data.
	client.getScore = sql.prepare("SELECT * FROM scores WHERE user = ? AND guild = ?");
	client.setScore = sql.prepare("INSERT OR REPLACE INTO scores (id, user, guild, points, level) VALUES (@id, @user, @guild, @points, @level);");
});

client.on("message", message => {

   // if they're not talking to the bot do nothing
   if (message.content.indexOf(config.prefix) !== 0) return;

   if (message.author.bot) return;

   let score = null;
   
   if (message.guild) {
      score = client.getScore.get(message.author.id, message.guild.id);
      if (!score) {
         logger.info('Initializing user...');
         score = { 
            id:`${message.guild.id}-${message.author.id}`, 
            user: message.author.id,
            guild: message.guild.id, 
            points: 0, 
            level: 1,
         }
      }
      score.points++;
      logger.info('Updating tables...');
      client.setScore.run(score);
   }
   
   const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
   const command = args.shift().toLowerCase();

   // Command-specific code here!
   if(command === "points") {
      return message.reply(`You currently have ${score.points} points and are level ${score.level}!`);
   }
});
 
client.login(config.token);