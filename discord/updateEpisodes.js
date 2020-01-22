const getData = require('./getData');
const getDate = require('./getDate');

module.exports = async function updateEpisodes(message, db){
	const url = 'http://www.senpai.moe/export.php?type=json&src=episodes';

	await getData(url)
		.then((data) => {
			let count = 0;
			data.forEach((episode)=>{
				db.run('INSERT INTO `episodes` (name,ep,time) VALUES(?,?,?);', [episode.name, episode.ctr, episode.utime], (err)=>{
					if(err && err.code === 'SQLITE_CONSTRAINT'){
						console.log('[Episodes] Unique Constraint');
						return console.log(episode);
					}
					if(err) return console.log(err);

					count++;
				});
			});

			setTimeout(()=>{
				console.log(`${getDate()} Added ${count} new episodes`);
			}, 30000);
		});
};