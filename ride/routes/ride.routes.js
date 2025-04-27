import { Router } from "express";
import {
    createRide,
    acceptRide
    
} from "../controllers/ride.controllers.js";
//import {upload} from "../middlewares/multer.middleware.js";
import  {verifyJWT, verifyJWTDriver }  from "../middlewares/ride.auth.middleware.js";

const router = Router()

router.route("/create-ride").post(verifyJWT, createRide)
router.route("/accept-ride/:id").patch(verifyJWTDriver, acceptRide)

//secured routes

export default router;
