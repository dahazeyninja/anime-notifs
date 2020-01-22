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
				timeUntilAiring
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
			updateData(parsed_body.data.Media, idMal);
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

function updateData(data, idMal){
	if(!data){
		console.error('No Anilist Data Error');
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
		JSON.stringify(data.nextAiringEpisode)
	];

	// console.log(values);
	db.run('INSERT INTO `ALdata` (id, idMal, title_r, title_e, title_n, startDate, endDate, episodes, season, description, coverImage, genres, tags, nextAiringAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);', values, (err)=>{
		if(err) return console.error(err);

		console.log(`${getDate()} Added AniList data for ${data.title.romaji} (${data.title.english})`);
		updateALID(data.id, data.idMal);
	});
}

function updateALID(id, idMal){
	db.run('UPDATE `shows` SET ALID = ? WHERE MALID = ?;', [id, idMal], (err)=>{
		if(err) return console.error(err);
	});
}