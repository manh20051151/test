const router = require('express').Router();
const ctrls = require('../controllers/message');
const { verifyAccessToken } = require('../middlewares/verifyToken');
const upload = require('../services/AwsS3Service');
// const multer = require('multer');
// const uploadImage = multer({ dest: '/uploads/images/' });

router.post('/send/:id', verifyAccessToken, ctrls.sendMessage);
router.post('/sendImage/:id', verifyAccessToken, upload.single('image'), ctrls.sendMessageImage);
router.get('/:id', verifyAccessToken, ctrls.getMessage);
router.delete('/deleteMessage/:id', verifyAccessToken, ctrls.deleteMessage);

module.exports = router;
