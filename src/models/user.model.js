import mongoose ,  {Schema} from "mongoose";
import jwt  from "jsonwebtoken";
import bcrypt from 'bcrypt';



const userSchema = new Schema(
    {
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    avatar:{
        type: String,  //cloudinary Url
        required: true,

    },
    coverImage:{
        type: String,  //cloudinary Url
    },
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken:{
        type: String
    }
    },
    {
        timestamps: true
    }
)

//encrypt password before saving it to datbase. 

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// Check the encrypted password with user given password

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
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

export const User = mongoose.model("User", userSchema)