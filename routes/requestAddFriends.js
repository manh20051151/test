const router = require('express').Router();
const ctrls = require('../controllers/requestAddFriends');
const { verifyAccessToken } = require('../middlewares/verifyToken');


router.post('/send/:id', verifyAccessToken, ctrls.createRequestAddFriends);
router.get('/', verifyAccessToken, ctrls.getRequestAddFriends);
router.put('/update/:id', verifyAccessToken, ctrls.updateFriendRequest);
router.delete('/delete/:id', verifyAccessToken, ctrls.deleteFriendRequest);
router.put('/updateCancel/:id', verifyAccessToken, ctrls.updateFriendRequestCancel);
router.delete('/deleteCancel/:id', verifyAccessToken, ctrls.deleteFriendRequestCancel);
router.put('/updateListFriend/:id', verifyAccessToken, ctrls.updateListFriend);
router.delete('/deleteFriend/:id', verifyAccessToken, ctrls.deleteFriend);
router.delete('/deleteFriendFr/:id', verifyAccessToken, ctrls.deleteFriendFr);
router.put('/updateListFriendNew/:id', verifyAccessToken, ctrls.updateListFriendNew);
router.put('/updateListFriendNewFr/:id', verifyAccessToken, ctrls.updateListFriendNewFr);
router.get('/requestAddFriendsMe', verifyAccessToken, ctrls.getRequestAddFriendsMe);
router.get('/getListFriends', verifyAccessToken, ctrls.getListFriends);

module.exports = router;
