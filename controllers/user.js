const User = require('../models/user')
const ListFriend = require('../models/listFriend')
const asyncHandler = require('express-async-handler')
const {generateAccessToken, generateRefreshToken} = require("../middlewares/jwt")
const jwt =require('jsonwebtoken')
const sendMail = require('../ultils/sendMail')
const crypto = require('crypto')
const makeToken = require('uniqid')
const user = require('../models/user')
const { getReceiverSocketId, io } = require("../socket/socket");

const AWS = require("aws-sdk");
require("dotenv").config();

process.env.AWS_SDK_JS_SUPPERSS_MAINTENANCE_MODE_MESSAGE = "1";

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;



// const register = asyncHandler(async(req, res)=>{
//     const {name, username, password} = req.body
//     if(!name || !username || !password){
//         return res.status(400).json({
//             success: false,
//             mes: 'Missing inputs'
//         })
//     }

//     const user = await User.findOne({username})
//     if(user){
//         throw new Error('User has existed!')
//     }
//     else{
//         const newUser = await User.create(req.body)
//         return res.status(200).json({
//             success: newUser ? true : false,
//             nes: newUser ? 'register is successfully' : 'something went wrong'
//         })
//     }

// })

const register = asyncHandler(async(req, res) =>{
    const {name, username, password} = req.body
    if(!name || !username || !password){
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })
    }
    const user = await User.findOne({username})
    if(user){
        throw new Error('User has existed!')
    }
    else{
        const token = makeToken()
        res.cookie('dataregister', {...req.body, token}, {httpOnly: true, maxAge: 15*60*1000})
        const html = `Click vào link để xác thực tài khoản.(Link này hết hạn sau 15 phút) <a href=${process.env.URL_SERVER}/api/user/finalregister/${token}>Click here</a>`
        await sendMail({
            username,
            html,
            subject: 'Xác thực tài khoản'
        })
        return res.json({
            success: true,
            mes: 'Please check your email to active account'
        })
    }

    
})

const finalRegister = asyncHandler(async(req, res)=>{
    const cookie = req.cookies
    const { token } = req.params
    if(!cookie || cookie?.dataregister?.token !== token){
        res.clearCookie('dataregister')
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/failed`)
    }
    const newUser = await User.create({
        name: cookie?.dataregister?.name,
        username: cookie?.dataregister?.username,
        password: cookie?.dataregister?.password,
    })
    const newListFriend = await ListFriend.create({
        userId: newUser._id,
    })
    res.clearCookie('dataregister')
    if(newUser){
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/sussess`)
    } else{
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/failed`)
    }


    // return res.status(200).json({
    //     success: newUser ? true : false,
    //     nes: newUser ? 'register is successfully' : 'something went wrong'
    // })
    
})


// refreshToken => cấp mới accessToken
// accessToken => xác thực người dùng, phân quyền
const login = asyncHandler(async(req, res)=>{
    const {username, password} = req.body
    if(!username || !password){
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })
    }

    const response = await User.findOne({username})
    if(response && await response.isCorrectPassword(password)){
       // tách pass và role ra khỏi response
        const{password, refreshToken ,...userData} = response.toObject()
       //Tạo accessToken
        const accessToken = generateAccessToken(response._id, response.role)
        // tạo refreshToken
        const newRefreshToken = generateRefreshToken(response._id)
        
        //Lưu refreshToken vào db
        await User.findByIdAndUpdate(response.id, {refreshToken: newRefreshToken}, {new: true})
        // lưu refreshToken vào cookie
        res.cookie('refreshToken', newRefreshToken, {httpOnly: true, maxAge: 7*24*60*60*1000})
        return res.status(200).json({
            success: true,
            accessToken,
            userData
        })
    } else{
        throw new Error('Invalid credentials!')
    }


})


const getCurrent = asyncHandler(async(req, res)=>{
    const {_id} = req.user

    const user = await User.findById({_id}).select('-refreshToken -password')
   
    return res.status(200).json({
        success: user ? true : false,
        rs: user ? user : 'User not found'
    })
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    //lấy token từ cookie
    const cookie =req.cookies
    // check có token ko
    if(!cookie && !cookie.refreshToken){
        throw new Error('No refresh token in cookies')
    }
    // check token có hợp lệ ko
    const rs = await jwt.verify(cookie.refreshToken ,process.env.JWT_SECRET)
    const response = await User.findOne({_id: rs._id, refreshToken: cookie.refreshToken})
    return res.status(200).json({
        success: response ? true : false,
        newAccessToken: response ? generateAccessToken(response._id, response.role) : 'Refresh token not matched'
    })


})

const logout = asyncHandler(async(req, res)=>{
    const cookie = req.cookies
    if(!cookie || !cookie.refreshToken){
        throw new Error('No refresh tooken in cookie')
    }
    //xóa refresh token ở db
    await User.findOneAndUpdate({refreshToken: cookie.refreshToken}, {refreshToken: ''}, {new: true})
    // xóa refresh token ở cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true
    })
    return res.status(200).json({
        success: true,
        mes: 'Logout is done'
    })
})

// client gửi email, server check email hợp lệ ko => gửi mail + link (password change token)
// Client check email => click link
// client gửi api kèm token
// check token có giống với token mà server gửi ở email ko
// change password

const forgotPassword = asyncHandler(async(req, res)=>{
    const {username} = req.body
    if(!username){
        throw new Error('Missing email')
    }
    const user = await User.findOne({username})
    if(!user){
        throw new Error('User not found')
    }
    const resetToken = user.createPasswordChangeToken()
    await user.save()

    const html = `Click vào link để đổi mật khẩu.(Link này hết hạn sau 15 phút) <a href = ${process.env.CLIENT_URL}/reset-password/${resetToken}>Click here</a>`
    const data = {
        username,
        html,
        subject: 'Forgot password'
    }
    const rs = await sendMail(data)
    return res.status(200).json({
        success: rs.response?.includes('OK') ? true : false,
        mes: rs.response?.includes('OK') ? 'Hãy check mail của bạn': 'Lỗi mail'
    })
})

const resetPassword = asyncHandler(async (req, res)=>{
    const {password, token} = req.body
    if(!password || !token){
        throw new Error('missing inputs')
    }

    const passwordResetWToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({passwordResetWToken, passwordResetExpires: {$gt: Date.now()}})
    if(!user){
        throw new Error('Invalid reset token')
    }
    user.password = password
    user.passwordResetWToken = undefined
    user.passwordChangedAt = Date.now()
    user.passwordResetExpires = undefined
    await user.save()
    return res.status(200).json({
        success: user ? true :false,
        mes: user ? 'update password': 'something went wrong'
    })
})

const getUsers = asyncHandler(async (req, res)=>{
    const response = await User.find().select('-refreshToken -password')
    return res.status(200).json({
        success: response ? true : false,
        users: response
    })
})

const getUsersA = asyncHandler(async (req, res) => {
    const queries = { ...req.query };
    const excludeFields = ['limit', 'sort', 'page', 'fields'];
    excludeFields.forEach(el => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, matchedEl => `$${matchedEl}`);
    const formattedQueries = JSON.parse(queryString);
    if (queries?.name) {
        formattedQueries.name = { $regex: queries.name, $options: 'i' };
    }

    // const query = {}
    // if(req.query.q){
    //     query = {$or: [
    //         {name : { $regex: req.query.q, $options: 'i' }},
    //         {email : { $regex: req.query.q, $options: 'i' }},
    //     ]}
    // }

    if(req.query.q){
        delete formattedQueries.q
        formattedQueries['$or'] = [
            {name : { $regex: req.query.q, $options: 'i' }},
            {username : { $regex: req.query.q, $options: 'i' }},
        ]

    }


    let queryCommand = User.find(formattedQueries);

    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        queryCommand = queryCommand.sort(sortBy);
    }

    if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        queryCommand = queryCommand.select(fields);
    }



    const page = +req.query.page || 1;
    const limit = +req.query.limit || process.env.LIMIT_PRODUCTS; // Fixed the typo here
    const skip = (page - 1) * limit;
    
    // Removed callback, using await instead
    const response = await queryCommand.skip(skip).limit(limit).exec();

    // if (!response) {
    //     return res.status(404).json({
    //         success: false,
    //         message: 'Không thể lấy danh sách người dùng'
    //     });
    // }

    const counts = await User.countDocuments(formattedQueries);
    return res.status(200).json({
        success: response ?  true : false,
        counts,
        users: response ? response : 'cannot get users'
    });
});

const deleteUser = asyncHandler(async (req, res)=>{
    const { uid} = req.params
    // if(!_id){
    //     throw new Error('missing inputs')
    // }


    const receiverSocketId = getReceiverSocketId(uid.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("SocketdeleteUser");
    }
    const response = await User.findByIdAndDelete(uid)
    return res.status(200).json({
        success: response ? true : false,
        mes: response ? `User with email ${response.username} deleted` : 'no user delete'
    })
})
const getUserById = asyncHandler(async (req, res)=>{
    const { uid} = req.params
    // if(!_id){
    //     throw new Error('missing inputs')
    // }
    const response = await User.findById(uid)

    return res.status(200).json({
        success: response ? true : false,
        user: response
    })
})

const updateUser = asyncHandler(async (req, res) => {
    try {
        const { _id } = req.user;
        const { username, name } = req.body;

        if (!_id || Object.keys(req.body).length === 0) {
            throw new Error('Thiếu thông tin đầu vào');
        }

        const data = { username, name };

        if (req.file) {
            const image = req.file.originalname.split(".");
            const fileType = image[image.length - 1];
            const filePath = `${Date.now().toString()}.${fileType}`;

            const paramsS3 = {
                Bucket: bucketName,
                Key: filePath,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            const uploadResult = await new Promise((resolve, reject) => {
                s3.upload(paramsS3, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            });

            const imageURL = uploadResult.Location;
            data.avatar = imageURL;
        }

        const response = await User.findByIdAndUpdate(_id, data, { new: true }).select('-password');

        return res.status(200).json({
            success: response ? true : false,
            mes: response ? 'Cập nhật thành công.' : 'Có lỗi xảy ra'
        });

    } catch (error) {
        console.error('Lỗi: ', error);
        return res.status(500).json({
            success: false,
            mes: error.message,
        });
    }
});

const updateUserByAdmin = asyncHandler(async (req, res)=>{
    const { uid} = req.params

    const receiverSocketId = getReceiverSocketId(uid.toString());


    const friend = await ListFriend.findOne({ userId: uid });


    if(Object.keys(req.body).length === 0){
        throw new Error('missing inputs')
    }
    const response = await User.findByIdAndUpdate(uid, req.body, {new: true}).select('-password')


    friend.friendList.forEach(async (participantId) => {
        const receiverSocketIdd = getReceiverSocketId(participantId.toString());
        if (receiverSocketIdd) {
          io.to(receiverSocketIdd).emit("SocketupdateUserByAdminFR");
        }
      });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("SocketupdateUserByAdmin");
    }
    return res.status(200).json({
        success: response ? true : false,
        mes: response ? 'Updated' : 'some thing went wrong'
    })
})

module.exports = {
    register, 
    login, 
    getCurrent,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    finalRegister,
    getUsers,
    deleteUser,
    updateUser,
    updateUserByAdmin,
    getUsersA,
    getUserById
}