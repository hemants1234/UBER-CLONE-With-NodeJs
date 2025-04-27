import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {Ride} from "../models/rider.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {  publishToQueue } from "../service/rabbit.js";
//import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {

  try {

     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()
    

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

    } catch (error) {

      throw new ApiError(500, "Something Went Wrong while generating refresh and access tokes")
    }
}

const createRide = asyncHandler(async (req, res) => {

        const { pickup, destination } = req.body;
    
        const newRide = await Ride.create({
            user: req.user._id,
            pickup,
            destination
        })
    
       // publishToQueue("new-ride", JSON.stringify(newRide))
      //  res.send(newRide);
        publishToQueue("new-ride", JSON.stringify(newRide))


        return res.status(201).json(
            new ApiResponse(200, newRide, "Ride created Successfully")
        )
    }
)

const acceptRide = asyncHandler( async (req, res, next) => {
        const  rideId  = req.params.id;
        console.log(rideId)
        const ride = await Ride.findById(rideId);
        if (!ride) {
           // return res.status(404).json({ message: 'Ride not found' });
            throw new ApiError(404, "Ride not found")
        }
        ride.status = 'accepted';
        await ride.save();
        publishToQueue("ride-accepted", JSON.stringify(ride))
        return res.status(201).json(
            new ApiResponse(200, ride, "Ride accepted Successfully")
        )
   
    })


export {
    createRide,
    acceptRide
}
