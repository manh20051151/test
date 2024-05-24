const {default: mongoose} = require('mongoose')

const dbConnect = async () =>{
    try {
        const conn = await mongoose.connect(process.env.MONGIDB_URI)
        if(conn.connection.readyState === 1 ){
            console.log("DB connection is successfully")
        }
        else{
            console.log("DB connection is false")
        }
    } catch (error) {
        console.log("db connect false" )
        throw new Error(error)
    }
}
false
module.exports = dbConnect