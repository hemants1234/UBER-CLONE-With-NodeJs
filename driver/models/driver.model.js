import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    }
},
    {
        timestamps: true
    }
)

driverSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    //this.password = await bcrypt.hash(this.password, 10)
    try {
        const salt = await bcrypt.genSalt(10); // 10 is the salt rounds
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Proceed with the save operation
    } catch (err) {
        next(err); // Handle errors
    }
    //  next()
})

driverSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

driverSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name,
            //fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
driverSchema.methods.generateRefreshToken = function () {
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

export const Driver = mongoose.model("Driver", driverSchema)