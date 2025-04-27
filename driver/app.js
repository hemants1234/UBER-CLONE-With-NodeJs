import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectRabbitMQ } from "./service/rabbit.js";

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

import driverRouter from './routes/driver.routes.js'
 
app.use("/", driverRouter)

// routes declaration

//app.use("/api/v1/healthcheck", healthcheckRouter)
 


export {app};