import {asyncHandler} from "../utils/asyncHandler.js";
//import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import {  subscribeToQueue } from "../service/rabbit.js";
import { EventEmitter } from 'events';

const rideEventEmitter = new EventEmitter();


const generateAccessAndRefreshTokens = async(userId) => {

  try {

     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()
     console.log("this is accessToken", accessToken);
     console.log("this is refreshToken", refreshToken);
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

    } catch (error) {

      throw new ApiError(500, "Something Went Wrong while generating refresh and access tokes")
    }
}

const registerUser = asyncHandler( async (req, res) => {
 console.log(req.body)
  const {fullname, email, username, password } = req.body

  if (
      [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
      throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
      $or: [{ username }, { email }]
  })

  if (existedUser) {
      throw new ApiError(409, "User with email or username already exists")
  }
  

  const user = await User.create({
      fullname,
      email, 
      password,
      username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
  )

  if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res.status(201).json(
      new ApiResponse(200, createdUser, "User registered Successfully")
  )

})

const loginUser = asyncHandler(async (req, res) =>{
  
  const {email, username, password} = req.body
  //console.log(email);

  if (!username && !email) {
      throw new ApiError(400, "username or email is required")
  }
  
  // Here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")
      
  // }

  const user = await User.findOne({
      $or: [{username}, {email}]
  })

  if (!user) {
      throw new ApiError(404, "User does not exist")
  }

 const isPasswordValid = await user.isPasswordCorrect(password)

 if (!isPasswordValid) {
  throw new ApiError(401, "Invalid user credentials")
  }

 const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

 const loggedInUser = await User.findByIdAndUpdate(
     user._id,
     {
         $set: {
             refreshToken: refreshToken
         }
     },
     {
         new: true
     }
   ).select("-password -refreshToken")
  const options = {
      httpOnly: true,
      secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(
          200, 
          {
              user: loggedInUser, accessToken, refreshToken
          },
          "User logged In Successfully"
      )
  )

})

const logoutUser = asyncHandler(async(req, res) => {

 // User.findById
  User.findByIdAndUpdate(
    req.user._id,
    {
       $set: {
         refreshToken: undefined
       }
    },
    {
        new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
 const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 
  if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
  }

  try {
    
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
  
      const user = await User.findById(decodedToken?._id)
     
      if (!user) {
          throw new ApiError(401, "Invalid refresh token")
      }
  
      if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, "Refresh token is expired or used")
         
      }

      const options = {
          httpOnly: true,
          secure: true
      }
   
      const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
      let newRefreshToken = refreshToken;
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
          new ApiResponse(
              200, 
              {accessToken, refreshToken: newRefreshToken},
              "Access token refreshed"
          )
      )
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentUserPassword = asyncHandler( async(req, res) => {
   
  const{oldPassword, newPassword} = req.body;

  const user = await User.findById(req.user?._id)

  console.log( user, req.user?._id)
  const isPasswordCorrecss = await user.isPasswordCorrect(oldPassword);

    
   if(!isPasswordCorrecss)
   {
    throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword

   await user.save({ validateBeforeSave: false })
   return res
   .status(200)
   .json(new ApiResponse(200, {}, "password change successfully"))
})

const getCurrentUSer = asyncHandler( async (req, res) => {
    return res
    .json(new ApiResponse(200, req.user, "Current usee fetched successfully"))
  })

const updateAccountDetails =  asyncHandler( async(req, res) => {

   const {fullname, email} = req.body

   if(!fullname && !email){
      throw new ApiError( 400, "All Fields are required")
   }


   const userupdate = await User.findByIdAndUpdate(
    req.user?._id,
    {
       $set: {
        fullname,
        email
       }
    },
    {
       new: true
    }
   ).select("-password")

   return res
   .status(200)
   .json( new ApiResponse(200, userupdate, "Account details updated successfully"))  
})


const acceptedRide = asyncHandler(async (req, res) => {
    // Long polling: wait for 'ride-accepted' event
    rideEventEmitter.once('ride-accepted', (data) => {
        res.send(data);
    });

    // Set timeout for long polling (e.g., 30 seconds)
    setTimeout(() => {
        res.status(204).send();
    }, 60000);
})


subscribeToQueue('ride-accepted', async (msg) => {
    const data = JSON.parse(msg);
    rideEventEmitter.emit('ride-accepted', data);
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  updateAccountDetails,
  getCurrentUSer,
  acceptedRide
}
