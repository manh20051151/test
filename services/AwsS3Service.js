const multer = require('multer') //khai báo thư viện multer

const path = require('path')


const  storage = multer.memoryStorage({
    destination(req, file, callback){
        callback(null, "")
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 5000000}, //chỉ cho phép file tối đa là 2MB
    fileFilter(req, file, cb){
        checkFileType(file, cb)
    }
})

function checkFileType(file, cb){
    const fileTypes = /jpeg|jpg|png|gif/
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = fileTypes.test(file.mimetype)
    if(extname && mimetype){
        return cb(null, true)
    }
    return cb("only: /jpeg|jpg|png|gif/ ")
}



module.exports = upload;
