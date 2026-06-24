const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getReturns, createReturn, updateReturn } = require('../controllers/returnsController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getReturns);
router.post('/', createReturn);
router.patch('/:id', updateReturn);

module.exports = router;
