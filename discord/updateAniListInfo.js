const https = require('https');
const getDate = require('./getDate');
let db;

module.exports = function(idMal, database){
	db = database;
	const query = `
	query ($idMal: Int) {
  		Media (idMal: $idMal, type: ANIME) {
    		id
    		idMal
    		title{
    			romaji
    			english
    			native
    		}
    		startDate {
    			year
    			month
     			day
    		}
			endDate {
				year
				month
				day
			}
			season
			seasonYear
			seasonInt
			episodes
			description
			coverImage {
				extraLarge
			}
			genres
			tags {
				name
			}
			nextAiringEpisode {
				airingAt
				episode
			}
		}
	}`;

	// Define our query variables and values that will be used in the query request
	const variables = {
		'idMal': idMal
	};

	// Define the config we'll need for our Api request
	const options = {
		hostname: 'graphql.anilist.co',
		port: 443,
		path: '/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify({
			query,
			variables
		})
	};

	const req = https.request(options, (res)=>{
		let body = '';
		res.on('data', (chunk) => {
			// console.log(`BODY: ${chunk}`);
			body += chunk;
		});
		res.on('end', () => {
			const parsed_body = JSON.parse(body);
			insertData(parsed_body.data.Media, idMal);
		});
	});

	req.write(JSON.stringify({
		query,
		variables
	}));

	req.on('error', (e) => {
		console.error(e);
	});
	req.end();
};

function insertData(data, idMal){
	if(!data){
		console.error(`${getDate()} No Anilist Data for https://myanimelist.net/anime/${idMal}`);
		return updateALID(1, idMal);
	}
	const values = [
		data.id,
		data.idMal,
		data.title.romaji,
		data.title.english,
		data.title.native,
		`${data.startDate.year}-${data.startDate.month}-${data.startDate.day}`,
		`${data.endDate.year}-${data.endDate.month}-${data.endDate.day}`,
		data.episodes,
		`${data.season} ${data.seasonYear}`,
		data.description,
		data.coverImage.extraLarge,
		JSON.stringify(data.genres),
		JSON.stringify(data.tags),
		data.nextAiringEpisode.episode,
		data.nextAiringEpisode.airingAt
	];

	// console.log(values);
	db.run('INSERT INTO `anilist` (id, idMal, title_r, title_e, title_n, startDate, endDate, episodes, season, description, coverImage, genres, tags, nextAiringEp, nextAiringAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);', values, (err)=>{
		if(err && err.code === 'SQLITE_CONSTRAINT'){
			return updateExistingData(data);
		}
		if(err) return console.error(err);

		console.log(`${getDate()} Added AniList data for ${data.title.romaji} (${data.title.english})`);
		updateALID(data.id, data.idMal);
	});
}

function updateExistingData(data){
	db.get('SELECT * FROM anilist WHERE id = ?;', data.id, (err, row)=>{
		if(err) return console.error(err);

		const genres = JSON.parse(row.genres);
		const tags = JSON.parse(row.tags);

		let columns = [];
		let values = [];
		let old_values = [];
		let update = 0;

		if(row.title_r != data.title.romaji){
			columns.push('title_r');
			values.push(data.title.romaji);
			old_values.push(row.title_r);
			update = 1;
		}
		if(row.title_e != data.title.english){
			columns.push('title_e');
			values.push(data.title.english);
			old_values.push(row.title_e);
			update = 1;
		}
		if(row.title_n != data.title.native){
			columns.push('title_n');
			values.push(data.title.native);
			old_values.push(row.title_n);
			update = 1;
		}
		if(row.description != data.description){
			columns.push('description');
			values.push(data.description);
			old_values.push(row.description);
			update = 1;
		}
		if(row.startDate != data.startDate){
			columns.push('startDate');
			values.push(data.startDate);
			old_values.push(row.startDate);
			update = 1;
		}
		if(row.endDate != data.endDate){
			columns.push('endDate');
			values.push(data.endDate);
			old_values.push(row.endDate);
			update = 1;
		}
		if(row.episodes != data.episodes){
			columns.push('episodes');
			values.push(data.episodes);
			old_values.push(row.episodes);
			update = 1;
		}
		if(row.coverImage != data.coverImage.extraLarge){
			columns.push('coverImage');
			values.push(data.coverImage.extraLarge);
			old_values.push(row.coverImage);
			update = 1;
		}
		if(genres != data.genres){
			columns.push('genres');
			values.push(JSON.stringify(data.genres));
			old_values.push(row.genres);
			update = 1;
		}
		if(tags != data.tags){
			columns.push('tags');
			values.push(JSON.stringify(data.tags));
			old_values.push(row.tags);
			update = 1;
		}
		if(row.nextAiringEp != data.nextAiringEpisode.episode){
			columns.push('nextAiringEp');
			values.push(data.nextAiringEpisode.episode);
			old_values.push(row.nextAiringEp);
			update = 1;
		}
		if(row.nextAiringAt != data.nextAiringEpisode.airingAt){
			columns.push('nextAiringAt');
			values.push(data.nextAiringEpisode.airingAt);
			old_values.push(row.nextAiringAt);
			update = 1;
		}

		if(update === 0) return;

		values.push(data.id);

		let column_string = '';

		for (let i = 0; i < columns.length; i++){
			if (i === 0){
				column_string += `${columns[i]} = ?`;
			} else {
				column_string += `,${columns[i]} = ?`;
			}
		}

		// console.log(`UPDATE shows SET ${column_string} WHERE name = ?;`, values);
		db.run(`UPDATE anilist SET ${column_string} WHERE id = ?;`, values, (err)=>{
			if(err) return console.error(err);

			console.log(`${getDate()} Updated Anilist Data for "${data.title_r}(${data.title_e})" columns\n${JSON.stringify(columns, null, '\t')}\nfrom\n${JSON.stringify(old_values, null, '\t')}\nto\n${JSON.stringify(values, null, '\t')}`);
		});
	});
}

function updateALID(id, idMal){
	db.run('UPDATE `senpai` SET ALID = ? WHERE MALID = ?;', [id, idMal], (err)=>{
		if(err) return console.error(err);
	});
}