const express = require('express');
const loginSignupRouter = express.Router();
const loginsignupController = require('../controller/loginsignup');

loginSignupRouter.get('/', loginsignupController.getFirstPage);
loginSignupRouter.get('/login', loginsignupController.getloginPage);
loginSignupRouter.post('/login', loginsignupController.postLoginPage);
loginSignupRouter.get('/register', loginsignupController.getregisterPage);
loginSignupRouter.post('/register', loginsignupController.postRegisterPage);


module.exports = loginSignupRouter;