const express = require('express');
const router = express.Router();
const { checkSymptoms, getSymptoms } = require('../Controllers/symptomController');

router.post('/check', checkSymptoms);
router.get('/', getSymptoms);

module.exports = router;
