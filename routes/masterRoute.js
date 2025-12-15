const express = require('express');
const masterRouter = express.Router();
const masterRouterController = require('../controller/masterController');

masterRouter.get('/masterpaneldashboard', masterRouterController.getMasterPanelDashboard);
// masterRouter.get('/userdownLinebymasterdashboard', masterRouterController.getUserDownLineByMaster);

module.exports = masterRouter;