const config = require('../config.json');

const updateEpisodes = require('./updateEpisodes');
const updateShows = require('./updateShows');
const searchShows = require('./searchShows');
const updateAL = require('./updateAniListInfo');

const Discord = require('discord.js');
const client = new Discord.Client();

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.db');

//const {admins} = config;
const admincmds = {
	//'!shinoabot': (message) => settings(message, db)
};

const cmds = {
	'!updateAL': (message, db) => updateAL(message, db),
	'!updateEpisodes': (message, db) => updateEpisodes(message, db),
	'!updateShows': (message, db) => updateShows(message, db),
	'!searchShows': (message, db) => searchShows(message, db)
};

client.on('ready', () => {
	console.log('[Discord Bot] Ready!');
});

client.on('message', async (message) => {
	if (!message.guild || message.author.bot) return;

	const cmd = message.content.split(' ', 1)[0];

	if (cmd in cmds) {
		return cmds[cmd](message, db);
	}
});



client.on('error', (error) => {
	console.error(error);
});

client.login(config.token);






