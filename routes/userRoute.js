const express = require('express');
const userRouter = express.Router();
const userRouterController = require('../controller/user');

userRouter.get('/dashboard', userRouterController.getDashboardPage);
userRouter.get('/livematka', userRouterController.getLiveMatkaPage);
userRouter.get('/singlematka', userRouterController.getSingleMatkaPage);
userRouter.get('/pattimatka', userRouterController.getPattiMatkaPage);
userRouter.post('/resetpassword', userRouterController.postResetPassword);
userRouter.get('/logout', userRouterController.logoutUser);
//footer
userRouter.get('/account', userRouterController.getAccountPage);
userRouter.get('/bets', userRouterController.getBetsPage);

module.exports = userRouter;