const express = require('express');
const router = express.Router();
const { getDocuments, addDocument, verifyDocument, deleteDocument } = require('../controllers/documentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getDocuments);
router.post('/', addDocument);
router.patch('/:id/verify', authorizeRoles('SUPER_ADMIN', 'ADMIN'), verifyDocument);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteDocument);

module.exports = router;
