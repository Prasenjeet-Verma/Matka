const express = require('express');
const masterRouter = express.Router();
const masterRouterController = require('../controller/masterController');

masterRouter.get('/masterpaneldashboard', masterRouterController.getMasterPanelDashboard);


module.exports = masterRouter;