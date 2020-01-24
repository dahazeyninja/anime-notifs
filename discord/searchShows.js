let db;

module.exports = async function(message, database){
	db = database;
	const keywords = message.content.split(' ');
	if (keywords.length === 1) return console.log('no search keywords specified');
	
	searchShows(keywords, message);
};

function searchShows(keywords, message){
	let values = [`%${keywords[1].toLowerCase()}%`];
	let like_string = 'senpai.name LIKE ?';
	let e_string = 'anilist.title_e LIKE ?';
	let r_string = 'anilist.title_r LIKE ?';
	let n_string = 'anilist.title_n LIKE ?';
	
	
	for (let i = 2; i < keywords.length; i++) {
		values.push(`%${keywords[i].toLowerCase()}%`);
		like_string += ' AND senpai.name LIKE ?';
		e_string += ' AND title_e LIKE ?';
		r_string += ' AND title_r LIKE ?';
		n_string += ' AND title_n LIKE ?';
	}

	const query_string = `
	SELECT
		senpai.name,
		senpai.MALID,
		senpai.ANNID,
		senpai.ALID,
		senpai.season,
		senpai.simulcast,
		senpai.simulcast_delay,
		senpai.airdate_u,
		anilist.id,
		anilist.title_e,
		anilist.title_n,
		anilist.title_r,
		anilist.description,
		anilist.startDate,
		anilist.endDate,
		anilist.episodes,
		anilist.nextAiringAt,
		anilist.coverImage,
		anilist.genres,
		anilist.tags
	FROM 
		senpai
	LEFT JOIN anilist ON
		senpai.ALID = anilist.id
	WHERE (${like_string}) OR (${e_string}) OR (${r_string}) OR (${n_string});`;

	const values_all = values.concat(values).concat(values).concat(values);
	
	db.get(query_string, values_all, (err, row) => {
		if (err)
			return console.error(err, query_string, values);
		if (!row) {
			return message.channel.send('No results found');
		}

		if(row.id){
			createEmbed(row);
		} else {
			createNoAnilistEmbed(row);
		}
	});
}

async function createEmbed(row){
	const fields = [];
	const nextAiring = JSON.parse(row.nextAiringAt);
	const tags = JSON.parse(row.tags);
	const genres = JSON.parse(row.genres);
	let delay = 'No delay';

	if(row.MALID){
		fields.push({
			name: 'MAL Link',
			value: `https://myanimelist.net/anime/${row.MALID}`,
			inline: false
		});
	}
	if(row.ANNID){
		fields.push({
			name: 'ANN Link',
			value: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${row.ANNID}`,
			inline: false
		});
	}

	if(row.ALID > 1){
		fields.push({
			name: 'AniList Link',
			value: `https://anilist.co/anime/${row.ALID}`,
			inline: false
		});
	}

	if(row.simulcast_delay != 0){
		delay = `${row.simulcast_delay}h`;
	}
	if(row.simulcast != 0){
		fields.push({
			name: 'Simulcast',
			value: `${row.simulcast} (${delay})`,
			inline: true
		});
	}

	const start_date = new Date(row.airdate_u * 1000);
	fields.push({
		name: 'Start Date',
		value: `${start_date.toDateString()}`,
		inline: true
	});
	fields.push({
		name: 'Season',
		value: `${row.season}`,
		inline: true
	});

	// getNextEpisode(row);

	let time_until = await getTimeUntil(nextAiring.airingAt);



	fields.push({
		name: 'Next Episode',
		value: ''
	});

	const richEmbed = {
		color: 0xaa98ae,
		title: row.name,
		description: `|| ${row.description} ||`,
		fields,
		timestamp: Date.now()
	};

	// message.channel.send({embed:richEmbed});
}

function getTimeUntil(timestamp){
	return new Promise((resolve)=>{
		const new_timestamp = timestamp * 1000;
		console.log(new_timestamp);
		let time = Date.now() - new_timestamp;
		console.log(time);
		let days = time / 86400000;
		days = parseInt(days);
		time = time - (days * 86400000);
		let hours = time / 3600000;
		hours = parseInt(hours);
		time = time - (hours * 3600000);
		let minutes = time / 60000;
		minutes = parseInt(minutes);

		console.log(`${days}D ${hours}H ${minutes}M`);

		resolve(`${days}D ${hours}H ${minutes}M`);

	});
}