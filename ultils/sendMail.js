const nodemailer = require('nodemailer')
const asyncHandler = require('express-async-handler')


const sendMail = asyncHandler(async({username, html, subject})=>{
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // Use `true` for port 465, `false` for all other ports
        auth: {
          user: process.env.EMAIL_NAME,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });
      
      // async..await is not allowed in global scope, must use a wrapper

        // send mail with defined transport object
        const info = await transporter.sendMail({
          from: '"appchat" <no-relply@appchat.com>', // sender address
          to: username, // list of receivers
          subject: subject, // Subject line
          html: html, // html body
        });
        return info
})
module.exports = sendMail