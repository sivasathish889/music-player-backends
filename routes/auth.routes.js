const express = require('express');
const router = express.Router();
const { register, login, getMe, googleLogin, appleLogin } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);

module.exports = router;
