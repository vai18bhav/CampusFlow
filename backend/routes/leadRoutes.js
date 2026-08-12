const express = require('express');
const router = express.Router();
const { getLeads, createLead, updateLeadStatus, getInquiries, createInquiry, respondInquiry } = require('../controllers/leadController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getLeads);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), createLead);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), updateLeadStatus);

router.get('/inquiries', getInquiries);
router.post('/inquiries', createInquiry);
router.put('/inquiries/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'), respondInquiry);

module.exports = router;
