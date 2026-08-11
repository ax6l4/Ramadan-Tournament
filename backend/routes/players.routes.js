/**
 * Player API routes.
 * Static paths such as /export/docx are registered before /:id
 * so Express does not treat "export" as an id.
 */

const express = require('express');
const playersController = require('../controllers/playersController');
const { requireAdmin, optionalAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAdmin, playersController.createPlayer);
router.get('/export/docx', requireAdmin, playersController.exportPlayersDocx);
router.get('/export', requireAdmin, playersController.exportPlayers);
router.get('/', requireAdmin, playersController.getPlayers);
router.delete('/', requireAdmin, playersController.deleteAllPlayers);
router.delete('/:id', requireAdmin, playersController.deletePlayer);

module.exports = router;
