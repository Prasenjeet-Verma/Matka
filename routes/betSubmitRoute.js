const express = require('express');
const betSubmitRouter = express.Router();
const betSubmitController = require('../controller/betSubmit');

betSubmitRouter.post('/place-bet', betSubmitController.placeBet);

module.exports = betSubmitRouter;