import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import axios from 'axios';
//import { User } from "../models/ri.model.js";
import jwt from "jsonwebtoken";

const verifyJWTDriver = asyncHandler( async(req, _, next) => {
   try {
       
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        if(!token){
           throw new ApiError(401, "Unauthorized request")
        }
       
        //const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const response = await axios.get(`http://localhost:3002/current-user`, {
         headers: {
             Authorization: `Bearer ${token}`
          }
       })

       console.log("this is ", response.data.data);
        let driver = response.data.data;
       

       console.log(response)

        if(!driver){
           throw new ApiError(401, "Invalid Access Token")
        }   
        req.driver = driver;
        next();
   
   } catch (error) {
       throw new ApiError(401, "Invalid access Token")
   } 
   })

const verifyJWT = asyncHandler( async(req, _, next) => {
      try {
          
           const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
           console.log("this is token",token);
           if(!token){
              throw new ApiError(401, "Unauthorized request")
           }
          
           //const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
           //console.log()
          
           const response = await axios.get(`http://localhost:3001/current-user`, {
            headers: {
                Authorization: `Bearer ${token}`
             }
          })

          console.log("this is ", response.data.data);
           let user = response.data.data;
          
           if(!user){
              throw new ApiError(401, "Invalid Access Token")
           }   
           req.user = user;
           next();
      
      } catch (error) {
          throw new ApiError(401, "Invalid access Token")
      }
         
      })

export {
   verifyJWTDriver,
   verifyJWT
}