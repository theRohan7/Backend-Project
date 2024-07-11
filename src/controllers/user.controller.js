import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { UploadOnCloudinary } from "../utils/fileUploader.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // STEPS
    
    // 1. Get user detail from Frontend

    const {username, fullname, email, password} = req.body
    console.log({
        email: email,
    });

    // 2. Apply Validation (checks & not-empty)
   
    if(fullname === ""){
        throw new ApiError (400, "Fullname is required")
    }
    if(username === ""){
        throw new ApiError (400, "Username is required")
    }
    if(password === ""){
        throw new ApiError (400, "Password is required")
    }
    if(email === "" || !email.includes("@")){
        throw new ApiError (400, "email is required")
    }

    // 3. Check if user already exists (username or email)
  
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // 5. upload them to cloudinary, especially for Avatar (and get reference URL)

    const avatar = await UploadOnCloudinary(avatarLocalPath)
    const coverImage = await UploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // 6. create user object - create entry in DB

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

     // 7. check for response(user creation)-> return response -> remove password and refresh token field from response.


    const createdUser = await User.findById(user._id).select(     //remove password and refreshToken 
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering.")  //check for user creation
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")  // return response
    )
   
})

export {registerUser};