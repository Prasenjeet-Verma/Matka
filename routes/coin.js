const express = require('express');
const coinRouter = express.Router();
const coinController = require('../controller/coinController');


coinRouter.get('/coin', coinController.getDashboardPage);
coinRouter.post('/coin', coinController.postDashboard);
//coinRouter.post('/coinreset', coinController.postResultPage);
module.exports = coinRouter;