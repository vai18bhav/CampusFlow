const express = require('express');
const router = express.Router();
const { getCertificates, getCertificateById, issueCertificate, revokeCertificate } = require('../controllers/certificateController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), issueCertificate);
router.patch('/:id/revoke', authorizeRoles('SUPER_ADMIN', 'ADMIN'), revokeCertificate);

module.exports = router;
