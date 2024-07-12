import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { UploadOnCloudinary } from "../utils/fileUploader.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // STEPS
    
    // 1. Get user detail from Frontend

    const {username, fullName, email, password} = req.body
    

    // 2. Apply Validation (checks & not-empty)
   
    if(fullName === ""){
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
  
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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
        fullName,
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

const loginUser = asyncHandler( async (req, res) => {
    // STEPS

    // 1. get input from req body

    const {email, username, password} = req.body;

    // 2. check if there's username or email is there

    if(!username || !email){
        throw new ApiError(400, "Username or password is Required...")
    }

    // 3. find user from DB

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist.")
    }

    // 4. check password

    const checkPassword = await user.isPasswordCorrect(password)

    if(!checkPassword){
        throw new  ApiError(500,"Password is incorrect")
    }

    // 5. generate access and refresh token for the user
    
    // 6. send token into secured cookie and informed that logged in
})

export {registerUser, loginUser};