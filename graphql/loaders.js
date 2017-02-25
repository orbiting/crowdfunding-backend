require('dotenv').config()
const DataLoader = require('dataloader')

module.exports = (pgdb) => {
	return {
		crowdfundings: new DataLoader(async (keys) => {
			return Promise.all(keys.map(async () => {
				let table = pgdb['public']['crowdfundings']
				//console.log("keys")
				//console.log(keys)
				const response = await table.find( {id: keys[0]} )
				console.log(response)
				return response;
			}));
		})
	}
}
