const mongoose = require('mongoose');
const DB_connect = async (DB_URL) => {
    try {
        const DB_OPTION = {
            dbName: 'GoGoglobal'
        }
        await mongoose.connect(DB_URL, DB_OPTION);
        console.log('database Connected');
    } catch (err) {
        console.log(err);
    }
}

module.exports = DB_connect;