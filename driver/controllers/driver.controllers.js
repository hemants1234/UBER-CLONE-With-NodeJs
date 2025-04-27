import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {Driver} from "../models/driver.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { subscribeToQueue } from "../service/rabbit.js";



const generateAccessAndRefreshTokens = async(userId) => {

  try {

     const driver = await Driver.findById(userId)
     const accessToken = driver.generateAccessToken()
     const refreshToken = driver.generateRefreshToken()
    

      driver.refreshToken = refreshToken
      await driver.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

    } catch (error) {

      throw new ApiError(500, "Something Went Wrong while generating refresh and access tokes")
    }
}

const registerUser = asyncHandler( async (req, res) => {

  const {name, email, password } = req.body
  //console.log("email: ", email);

  if (
      [name, email, password].some((field) => field?.trim() === "")
  ) {
      throw new ApiError(400, "All fields are required")
  }

  const existedUser = await Driver.findOne({
      $or: [{ name }, { email }]
  })

  if (existedUser) {
      throw new ApiError(409, "Driver with email or username already exists")
  }
  //console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
 

  const driver = await Driver.create({
      name,
      email, 
      password
  })

  const createdUser = await Driver.findById(driver._id).select(
      "-password -refreshToken"
  )

  if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the driver")
  }

  return res.status(201).json(
      new ApiResponse(200, createdUser, "Driver registered Successfully")
  )

})

const loginUser = asyncHandler(async (req, res) =>{
  
  const {email, password} = req.body
  //console.log(email);

  if (!email) {
      throw new ApiError(400, "email is required")
  }


  const driver = await Driver.findOne( {email})
  console.log(driver)
  if (!driver) {
      throw new ApiError(404, "Driver does not exist")
  }

 const isPasswordValid = await driver.isPasswordCorrect(password)
   console.log(isPasswordValid)
 if (!isPasswordValid) {
  throw new ApiError(401, "Invalid driver credentials")
  }

 const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(driver._id)
  const loggedInUser = await Driver.findByIdAndUpdate(
    driver._id,
    {
        $set: {
            refreshToken: refreshToken
        }
    },
    {
        new: true
    }
  ).select("-password -refreshToken")



 // const loggedInUser = await Driver.findById(driver._id).
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
              driver: loggedInUser, accessToken, refreshToken
          },
          "Driver logged In Successfully"
      )
  )

})

const logoutUser = asyncHandler(async(req, res) => {
 // Driver.findById
  Driver.findByIdAndUpdate(
    req.driver?._id,
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
  .json(new ApiResponse(200, {}, "Driver logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //console.log(req.body.refreshToken)
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
  }

  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
  
      const driver = await Driver.findById(decodedToken?._id).select(
            "-password -refreshToken"
      )
     // console.log("this is inside of try", driver);
  
      if (!driver) {
          throw new ApiError(401, "Invalid refresh token")
      }
  
      if (incomingRefreshToken !== driver?.refreshToken) {
          throw new ApiError(401, "Refresh token is expired or used")
          
      }
  
      const options = {
          httpOnly: true,
          secure: true
      }
  
      const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(driver._id)
  
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

  const driver = await Driver.findById(req.driver?._id)

  console.log( driver, req.driver?._id)
  const isPasswordCorrecss = await driver.isPasswordCorrect(oldPassword);

    
   if(!isPasswordCorrecss)
   {
    throw new ApiError(400, "Invalid old password")
   }

   driver.password = newPassword

   await driver.save({ validateBeforeSave: false })
   return res
   .status(200)
   .json(new ApiResponse(200, {}, "password change successfully"))
})

const getCurrentUSer = asyncHandler( async (req, res) => {
    return res
    .json(new ApiResponse(200, req.driver, "Current usee fetched successfully"))
  })

const updateAccountDetails =  asyncHandler( async(req, res) => {
   const {name, email} = req.body
   if(!name && !email){
      throw new ApiError( 400, "All Fields are required")
   }


   const userupdate = await Driver.findByIdAndUpdate(
    req.driver?._id,
    {
       $set: {
        name,
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

const togaleAvailability = asyncHandler(async(req, res) => {
    console.log(req.driver?._id, req.body)

    try {
        const driver = await Driver.findById(req.driver?._id);
        driver.isAvailable = !driver.isAvailable;
        await driver.save();
        res.send(driver);
    } catch (error) {

        res.status(500).json({ message: error.message });
    }
})
let pendingRequests = [];

const waitForNewRide = asyncHandler(
    async (req, res) => {
        // Set timeout for long polling (e.g., 30 seconds)
        req.setTimeout(30000, () => {
            res.status(204).end(); // No Content
        });
    
        // Add the response object to the pendingRequests array
        pendingRequests.push(res);
    }
     
)

  // Subscribe to the "new-ride" queue to handle new ride messages
 
  subscribeToQueue("new-ride", async (message) => {
    console.log("New ride message received:", message);

    // Parse the message (if needed)
    const rideData = JSON.parse(message);

    // Respond to all pending requests with the new ride data
    while (pendingRequests.length > 0) {
        const res = pendingRequests.shift(); // Remove the first pending request
        res.status(200).json({
            success: true,
            ride: rideData,
            message: "New ride available",
        });
    }
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  updateAccountDetails,
  getCurrentUSer,
  togaleAvailability,
  waitForNewRide
}

