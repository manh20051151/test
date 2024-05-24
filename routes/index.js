const userRouter = require('./user')
const messageRouter = require('./message')
const groupRouter = require('./group')
const requestAddFriendsRouter = require('./requestAddFriends')
const {notFoud, errHandler} = require('../middlewares/errHandler')

const initRoutes = (app)=>{
    app.use('/api/user', userRouter)
    app.use('/api/message', messageRouter)
    app.use('/api/group', groupRouter)
    app.use('/api/requestAddFriends', requestAddFriendsRouter)



    app.use(notFoud)
    app.use(errHandler)
}
module.exports = initRoutes 