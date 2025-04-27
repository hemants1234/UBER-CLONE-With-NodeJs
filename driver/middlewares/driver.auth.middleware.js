import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Driver } from "../models/driver.model.js";
import jwt from "jsonwebtoken";

export const verifyJWTDriver = asyncHandler( async(req, _, next) => {
try {
    
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
     
     if(!token){
        throw new ApiError(401, "Unauthorized request")
     }
    
     const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
     const driver = await Driver.findById(decodeToken?._id).select("-password -refreshToken")
    
     if(!driver){
        throw new ApiError(401, "Invalid Access Token")
     }   
     req.driver = driver;
     next();

} catch (error) {
    throw new ApiError(401, "Invalid access Token")
}
   
})