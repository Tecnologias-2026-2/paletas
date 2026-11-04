const userModel = require('../models/user.model');
const { sendJson } = require('../utils/http');

async function getAdmin(req, res) {
  const admin = await userModel.getAdmin();
  sendJson(res, 200, admin);
}

module.exports = { getAdmin };
