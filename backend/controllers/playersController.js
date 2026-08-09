/**
 * منطق إدارة اللاعبين
 */

const {
  getSetting,
  findPlayerByName,
  insertPlayer,
  listPlayers,
  deletePlayerById,
  deleteAllPlayers,
} = require('../db/database');
const { validatePlayerPayload } = require('../utils/validators');

function formatPlayer(row) {
  const isLeader =
    row.is_team_leader === true ||
    row.is_team_leader === 1 ||
    row.is_team_leader === '1';

  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    is_team_leader: Boolean(isLeader),
    sport: row.sport,
    plays_football: row.sport === 'football' || row.sport === 'both',
    plays_volleyball: row.sport === 'volleyball' || row.sport === 'both',
    created_at: row.created_at,
  };
}

async function isRegistrationOpen() {
  const setting = await getSetting('registration_open');
  return setting?.value === '1';
}

async function createPlayer(req, res, next) {
  try {
    const isAdminRequest = Boolean(req.admin);

    if (!isAdminRequest && !(await isRegistrationOpen())) {
      const closedMessage = await getSetting('registration_closed_message');
      return res.status(403).json({
        success: false,
        message: closedMessage?.value || 'التسجيل مغلق حالياً',
      });
    }

    const validation = validatePlayerPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.errors,
      });
    }

    const existingName = await findPlayerByName(validation.data.full_name);
    if (existingName) {
      return res.status(409).json({
        success: false,
        message: 'هذا الاسم الخماسي مسجّل مسبقاً — لا يمكن تكراره',
      });
    }

    let player;
    try {
      player = await insertPlayer(validation.data);
    } catch (error) {
      if (String(error.message).toLowerCase().includes('unique')) {
        return res.status(409).json({
          success: false,
          message: 'هذا الاسم الخماسي مسجّل مسبقاً — لا يمكن تكراره',
        });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل اللاعب بنجاح',
      data: { player: formatPlayer(player) },
    });
  } catch (error) {
    return next(error);
  }
}

async function getPlayers(req, res, next) {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const players = await listPlayers(search);

    return res.json({
      success: true,
      data: {
        count: players.length,
        players: players.map(formatPlayer),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePlayer(req, res, next) {
  try {
    const playerId = Number(req.params.id);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرّف اللاعب غير صالح',
      });
    }

    const result = await deletePlayerById(playerId);
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'اللاعب غير موجود',
      });
    }

    return res.json({
      success: true,
      message: 'تم حذف اللاعب بنجاح',
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAllPlayersHandler(req, res, next) {
  try {
    const result = await deleteAllPlayers();
    return res.json({
      success: true,
      message: 'تم حذف جميع اللاعبين بنجاح',
      data: { deleted: result.changes },
    });
  } catch (error) {
    return next(error);
  }
}

async function exportPlayers(req, res, next) {
  try {
    const players = (await listPlayers()).map(formatPlayer);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="players-export.json"'
    );

    return res.json({
      success: true,
      exported_at: new Date().toISOString(),
      count: players.length,
      players,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPlayer,
  getPlayers,
  deletePlayer,
  deleteAllPlayers: deleteAllPlayersHandler,
  exportPlayers,
  formatPlayer,
};
