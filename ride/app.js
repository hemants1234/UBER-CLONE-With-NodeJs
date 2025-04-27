import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {connectRabbitMQ } from "./service/rabbit.js";
//import { connectRabbitMQ } from "../driver/service/rabbit.js";


connectRabbitMQ();


const app = express()


app.use(cors(
    {
      origin: process.env.CORS_ORIGIN,
      credentials: true     
    }
))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
//app.use(express.static("public"))
app.use(cookieParser())

// routes import

import userRouter from './routes/ride.routes.js'
 
app.use("/", userRouter)

// routes declaration

//app.use("/api/v1/healthcheck", healthcheckRouter)
 


export {app};