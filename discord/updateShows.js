const getData = require('./getData');
const getDate = require('./getDate');
const updateAnilist = require('./updateAniListInfo');
let db;

module.exports = async function updateShows(message, database){
	db = database;
	const season = message.content.split(' ', 2)[1];
	let url = 'http://www.senpai.moe/export.php?type=json&src=';
	if (!season){
		url += 'raw';
	} else {
		url += season;
	}

	await getData(url)
		.then((data) => {
			const {meta, items} = data;
			if(!season){
				const tz_keys = Object.keys(meta.tz);

				tz_keys.forEach((key)=>{
					db.run('INSERT INTO `timezones` (offset, abv) VALUES (?,?);', [meta.tz[key].offset, meta.tz[key].abbr], (err)=>{
						if(err && err.code === 'SQLITE_CONSTRAINT'){
							return updateExistingTimezone(meta.tz[key]);
						}
						if(err) return console.log(err);

						console.log(`${getDate()} Added new timezone offset ${meta.tz[key].abbr} : ${meta.tz[key].offset}`);
					});
				});
			}
			

			items.forEach((item)=>{
				// console.log(`INSERT OR REPLACE INTO 'shows' (name, MALID, ANNID, simulcast, simulcast_delay, airdate_u) VALUES(${item.name},${item.MALID},${item.ANNID},${item.simulcast},${item.simulcast_delay},${item.airdate_u})`);
				db.run('INSERT INTO `senpai` (name, MALID, ANNID, ALID, name_lower, simulcast, simulcast_delay, airdate_u, season) VALUES(?,?,?,?,?,?,?,?,?);', [
					item.name,
					item.MALID,
					item.ANNID,
					0,
					item.name_lower,
					item.simulcast,
					item.simulcast_delay,
					item.airdate_u,
					meta.season
				], (err)=>{
					if(err && err.code === 'SQLITE_CONSTRAINT'){
						return updateExistingShow(item, meta, message);
					}
					if(err) return console.log(err);

					console.log(`${getDate()} Added new show "${item.name}"`);
				});
			});

			updateAniListData();
		});
};

function updateExistingShow(item, meta, message){
	let columns = [];
	let values = [];
	let old_values = [];
	let update = 0;
	db.get('SELECT * FROM `senpai` WHERE name = ?;', item.name, (err, row)=>{
		if(err) return console.error(err);

		if(item.MALID != row.MALID){
			columns.push('MALID');
			values.push(item.MALID);
			old_values.push(row.MALID);
			update = 1;
		}
		if(item.ANNID != row.ANNID){
			columns.push('ANNID');
			values.push(item.ANNID);
			old_values.push(row.ANNID);
			update = 1;
		}
		if(item.simulcast != row.simulcast){
			columns.push('simulcast');
			values.push(item.simulcast);
			old_values.push(row.simulcast);
			update = 1;
		}
		if(item.simulcast_delay != row.simulcast_delay){
			columns.push('simulcast_delay');
			values.push(item.simulcast_delay);
			old_values.push(row.simulcast_delay);
			update = 1;
		}
		if(item.airdate_u != row.airdate_u){
			columns.push('airdate_u');
			values.push(item.airdate_u);
			old_values.push(row.airdate_u);
			update = 1;
		}
		if(meta.season != row.season){
			columns.push('season');
			values.push(`${row.season}-${meta.season}`);
			old_values.push(row.season);
			update = 1;
		}

		if(update === 0) return;

		values.push(item.name);

		let column_string = '';

		for (let i = 0; i < columns.length; i++){
			if (i === 0){
				column_string += `${columns[i]} = ?`;
			} else {
				column_string += `,${columns[i]} = ?`;
			}
		}

		// console.log(`UPDATE shows SET ${column_string} WHERE name = ?;`, values);
		db.run(`UPDATE senpai SET ${column_string} WHERE name = ?;`, values, (err)=>{
			if(err) return console.error(err);

			console.log(`${getDate()} Updated show "${item.name}" columns\n${JSON.stringify(columns, null, '\t')}\nfrom\n${JSON.stringify(old_values, null, '\t')}\nto\n${JSON.stringify(values, null, '\t')}`);
		});

	});
}

function updateExistingTimezone(tz){
	db.get('SELECT * FROM `timezones` WHERE abv = ?;', tz.abbr, (err, row)=>{
		if(err) return console.error(err);

		if(tz.offset != row.offset){
			db.run('UPDATE `timezones` SET offset = ? WHERE abv = ?;', [tz.offset, tz.abbr], (err)=>{
				if(err) console.error(err);

				console.log(`${getDate()} Updated timezone offset ${tz.abbr} to ${tz.offset}`);
			});
		}
	});
}

function updateAniListData(){
	const interval = setInterval(()=>{
		db.get('SELECT MALID FROM `senpai` WHERE ALID = 0;', (err, row)=>{
			if(err) return console.error(err);

			if(!row){
				console.log(`${getDate()} No more shows missing Anilist data`);
				return clearInterval(interval);
			}

			updateAnilist(row.MALID, db);
		});
	}, 2000);
}