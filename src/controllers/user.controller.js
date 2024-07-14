import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { UploadOnCloudinary } from "../utils/fileUploader.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()

        user.refreshToken = refreshToken ;
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong whhile generating Access and Refresh token.");
    }
}

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

    if(!username && !email){
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
        throw new  ApiError(500,"Invalid user Credentials")
    }

    // 5. generate access and refresh token for the user

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    //Updating the user into DB giving acesstoken and removing password and refreshtoken  
    const loggedInUser =  await User.findById(user._id).select(" -password -refreshToken")    

    // 6. send token into secured cookie and informed that logged in

    const options = {          //with this cookie cannot be modified by frontend secured for backend only  
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
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {          //with this cookie cannot be modified by frontend secured for backend only  
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request.")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refesh Token")
        }
        //match both incominng refresh token and token with user
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} =  await generateAccessAndRefreshTokens(user._id)
        const options ={
            httpOnly: true,
            secure: true,
        }
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Acsess token refeshed."
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")        
    }

})

const changeCurrentPassword = asyncHandler( async(req, res) =>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async(req, res) =>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
}) 

const updateAccountDetails = asyncHandler( async(req, res) =>{
    const {fullName, email} = req.body

    if(!fullName || !email ){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new : true}
    ).select(" -password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."))
})

const updateUserAvatar = asyncHandler( async(res, req) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await UploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select(" -password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async(res, req) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"cover Image file is missing")
    }

    const coverImage = await UploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select(" -password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler( async(req, res) =>{
    const {username} =  req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing.")
    }

    const channel = await User.aggregate([                 // Writing Aggregation pipelines (Tough Topic)
        {
            $match: {
                username: username
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubsribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubsribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])
    console.log(channel);

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists.")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully.")
    )
})

export {registerUser, 
        loginUser, 
        logoutUser, 
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
    };