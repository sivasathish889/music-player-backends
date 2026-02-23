const express = require('express');
const router = express.Router();
const { searchSongs } = require('../controllers/search.controller');

router.get('/', searchSongs);

module.exports = router;
