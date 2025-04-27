import { Router } from "express";
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    updateAccountDetails,
    getCurrentUSer,
    waitForNewRide,
    togaleAvailability
} from "../controllers/driver.controllers.js";
//import {upload} from "../middlewares/multer.middleware.js";
import  {verifyJWTDriver}  from "../middlewares/driver.auth.middleware.js";

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWTDriver, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWTDriver, changeCurrentUserPassword)
router.route("/current-user").get( verifyJWTDriver, getCurrentUSer)
router.route("/update-account").patch(verifyJWTDriver, updateAccountDetails)
router.route('/toggle-availability').patch(verifyJWTDriver, togaleAvailability);
router.route('/new-ride').get(verifyJWTDriver, waitForNewRide);


export default router;
