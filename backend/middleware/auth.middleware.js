const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');

module.exports = { protect, authorize };
