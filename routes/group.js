const router = require('express').Router();
const ctrls = require('../controllers/group');
const { verifyAccessToken } = require('../middlewares/verifyToken');
const upload = require('../services/AwsS3Service');

router.post('/create', ctrls.createGroup)
router.get('/', ctrls.getGroups)
router.post('/updateMember/:id', ctrls.updateMember)
router.post('/updateDeputy/:id', ctrls.updateDeputy)
router.post('/updateLeader/:id', ctrls.updateLeader)
router.post('/deleteMember/:id', ctrls.deleteMember)
router.post('/deleteDeputy/:id', ctrls.deleteDeputy)
router.post('/updateNameGroup/:id',ctrls.updateNameGroup)
router.post('/updateAvatarGroup/:id',upload.single('avatarGroup'), ctrls.updateAvatarGroup)
router.post('/outGroup/:id',verifyAccessToken, ctrls.outGroup)
router.delete('/deleteGroup/:id', ctrls.deleteGroup)
router.get('/getGroup/:id', ctrls.getGroup)
router.post('/send/:id', verifyAccessToken, ctrls.sendMessageGr);
router.get('/:id', verifyAccessToken, ctrls.getMessageGr);
router.post('/sendImage/:id', verifyAccessToken, upload.single('image'), ctrls.sendMessageImageGr);
router.delete('/deleteMessage/:id', verifyAccessToken, ctrls.deleteMessageGr);


module.exports = router;
