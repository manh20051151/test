const express = require('express')
require('dotenv').config()
const dbConnect = require('./config/dbconnect')
const initRoutes = require('./routes')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const { app, server } = require('./socket/socket')

// const app = express()
app.use(express.urlencoded({extended: true}))
app.use("/uploads/images", express.static("uploads/images"))

app.set('view engine', 'js') // Khai báo rằng app sẽ dùng engine ejs để render trang web
// app.set('views', './views') 
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['POST', 'PUT', 'GET', 'DELETE'],
    credentials: true
}))
app.use(cookieParser())
const port = process.env.PORT || 8888
app.use(express.json()) // express đọc hiểu được data mà client gửi lên là json
app.use(express.urlencoded({extended: true})) //arr, obj, ...
dbConnect()


initRoutes(app)


server.listen(port, ()=>{
    console.log("on port: "+ port)
})

