import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const rideSchema = new Schema(
    {
        driver: {
            type: mongoose.Schema.Types.ObjectId,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        pickup: {
            type: String,
            required: true
        },
        destination: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: [ 'requested', 'accepted', 'started', 'completed' ],
            default: 'requested'
        },
    },
    {
        timestamps: true
    }
)

rideSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
rideSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const Ride = mongoose.model("Ride", rideSchema)