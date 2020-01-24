const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.db');

db.serialize(function(){

	// Create table for the list of quotes to use
	db.run('CREATE TABLE IF NOT EXISTS `timezones` (`abv` TEXT, `offset` INTEGER, PRIMARY KEY(`abv`))', (err) => {
		if(err) console.error(err);
	});

	db.run('CREATE TABLE IF NOT EXISTS `senpai` (`name` TEXT, `MALID` INTEGER, `ANNID` INTEGER, ALID INTEGER, `name_lower` TEXT, `simulcast` TEXT, `simulcast_delay` TEXT, `airdate_u` INTEGER, `season` TEXT, PRIMARY KEY(`name`))', (err)=>{
		if(err) console.error(err);
	});

	db.run('CREATE TABLE IF NOT EXISTS `anilist` (`id` INTEGER, `idMal` INTEGER, `title_r` TEXT, `title_e` TEXT, `title_n` TEXT, `startDate` TEXT, `endDate` TEXT, `episodes` INTEGER, `season` TEXT, `description` TEXT, `coverImage` TEXT, `genres` TEXT, `tags` TEXT, `nextAiringEp` INTEGER, `nextAiringAt INTEGER, PRIMARY KEY(`id`))', (err)=>{
		if(err) console.error(err);
	});

	console.log('[Database] Ready!');
	db.close();

});