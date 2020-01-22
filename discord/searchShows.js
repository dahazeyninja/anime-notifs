let db;

module.exports = async function(message, database){
	db = database;
	const keywords = message.content.split(' ');
	if (keywords.length === 1) return console.log('no search keywords specified');
	let values = [`%${keywords[1].toLowerCase()}%`];
	let like_string = 'name_lower LIKE ?';
	
	for (let i = 2; i < keywords.length; i++){
		values.push(`%${keywords[i].toLowerCase()}%`);
		like_string += ' AND name_lower LIKE ?';
	}

	db.get(`SELECT * FROM shows WHERE ${like_string}`, values, (err, row)=>{
		if(err) return console.error(err, `SELECT * FROM shows WHERE ${like_string};`, values);

		if(!row){
			return message.channel.send('No results found');
		}

		// console.log(row);
		const fields = [];
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

		getNextEpisode(row);


		const richEmbed = {
			color: 0xaa98ae,
			title: row.name,
			fields,
			timestamp: Date.now()
		};

		message.channel.send({embed:richEmbed});
	});
};

function getNextEpisode(row){
	db.all('SELECT * FROM episodes WHERE name LIKE ?;', `%${row.name}%`, (err, rows)=>{
		if(err) return console.error(err);

		const now = Date.now();

		if(rows.length == 0){
			console.log('no episodes found');
			console.log(row.airdate_u);
			let start_date = row.airdate_u * 1000;
			console.log(start_date);
			let add = 604800000;
			let found;
			for(let i = 0; i < 100; i++){
				if (start_date + add > now){
					const date = new Date(start_date + add);
					return console.log(date.toDateString());
				} else {
					start_date += 604800000;
				}
			}
		}

		rows.forEach((episode)=>{
			const date = new Date(episode.time * 1000);
			if(date > now){
				console.log(date.toDateString());
			}
			
		});
	});
}