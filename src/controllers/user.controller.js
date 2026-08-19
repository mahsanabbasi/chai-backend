import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { availableMemory } from "node:process";
import jwt from 'jsonwebtoken' 
import { log } from "node:console";
import { lookup } from "node:dns";


const generateAccessAndRefreshTokens = async(userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken =  user.generateRefreshToken();

    
    

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false}); // validate nhi krne ki zarorat bs save hojao warna hame sari req fileds bhi deni prti hn .save() me

    return {accessToken, refreshToken}

  } catch(error)
  {
    throw new ApiError(500, "Something went wrong while generating tokens")
  }
}

const registerUser = asyncHandler(async (req, res) => {
//get user data from request body 
//validate user data not mpty
//check if user already exists in database
//check for images, uload on cloudinary, get urls
//create entry in database
//remove password and refresh token from response
//check for user creation
//return response


  const {username, email, fullName, password} = req.body;

  if(
    [username, email, fullName, password].some(field => !field || field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }]
  });
  console.log("Existed user:", existedUser);
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);

  if(existedUser) {
    throw new ApiError(400, "User already exists");
  }
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Ye tab hota hai jab upload.fields([{name: 'avatar'}, {name: 'coverImage'}]) ho — multiple named fields expect karta hai, isliye req.files ek object hai jisme har field naam ke against array hai (req.files.avatar = array of files uploaded under "avatar" key), isliye [0] se pehli file nikalni padti hai.

  

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

  if (!avatar) {
    throw new ApiError(500, "Failed to upload images to Cloudinary");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || null,
    password,
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));

});

const loginUser = asyncHandler(async (req, res) => {
  //email pass
  //check if user available
  //if not throw error
  //else generate access and refresh token
  //send cookies

  const {email, username, password} = req.body;
 

  if (!username && !email)
  {
    throw new ApiError(400, "Username or Email required")
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (!user)
  {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid)
  {
    throw new ApiError(404, "Invalid user credentials");
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); //1. ye hm doabara userkyn mangwa rhe hn or password or ref token ko minus kyn krte hn -  sab fields lao, SIRF password aur refreshToken chhod kar

  //only server can modify
 // httpOnly: true — matlab ye cookie JavaScript se access nahi ho sakti (browser ke document.cookie se bhi nahi)
  const options = {
    httpOnly: true,
    secure: true
  }

  //sending in cookies
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(200,
    "User Logged in Successfully",
     {
      user: loggedInUser, accessToken, refreshToken //2. yaha pr ye kyn bheja ha is ka kia kaam ha  - taake flexible clients (mobile, ya cookie-restricted environments) bhi kaam kar sakein.
    },  
  ))
});

const logoutUser = asyncHandler(async (req, res) => {
  const id = req.user._id;
  await User.findByIdAndUpdate( //3. 
    id,{
      $unset: {
        refreshToken: 1  //This removes the field from document
      }
    },
    {
      new: true  // ye new true kia ha -  update ke BAAD wala naya document return karo
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(201, "User Logged out successfully", {}))


})

const refreshAccessToken  = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken)
  {
    throw new ApiError(401, "unauthorised request");
  }
  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET) // ye kia kr rha ha - Ye decode + validate dono ek sath karta hai: Expiry check, signature check, object de deta ha jis me payload hote hn 

  
    
  
    const user = await User.findById(decodedToken?._id)
  
      if (!user)
      {
        throw new ApiError(401, "Invalid refresh token")
      }
      if (incomingRefreshToken !== user?.refreshToken)
      {
        throw new ApiError(401, "Refresh token is expired or used");
      }
  
      const options = {
        httpOnly: true,
        secure: true
      }
  
const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshTokens(user._id);



  
      return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access Token Refreshed",{accessToken, refreshToken : newRefreshToken})
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
    
  }

    
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body;


  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect)
  {
    throw new ApiError(400, "Invalid old Password");    
  };

  user.password = newPassword;

  await user.save({validateBeforeSave: false});

  res
  .status(200)
  .json(
    new ApiResponse(200, "Password changed Successfully", {})
  )


})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(
    new ApiResponse(200, "Current user fetched successfully", req.user)
  )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req.body;
  if (!fullName || !email)
  {
    throw new ApiError(400, "All fields are required");

  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      }
    },
    {new: true}  // is se updated information return hoti ha

  ).select("-password") // user ko data bhjte waqt password nhi bhjte hn

  return res
  .status(200)
  .json(
    new ApiResponse(200, "Account details updated successfully",user)
  )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path  // yaha file is lye use kiya kyn k hm ek file upload krwa rhe hn  - Ye tab use hota hai jab route mein upload.single('avatar') middleware ho — sirf ek file expect karta hai, wo seedha req.file (singular) mein milti hai

  if (!avatarLocalPath)
  {
    throw new ApiError(400, "Avatar file is missing");
  }

  const oldUser = await User.findById(req.user._id);
  const oldAvatarUrl = oldUser?.avatar;


  const avatar = await uploadOnCloudinary(avatarLocalPath);

  
  if (!avatar) {
    throw new ApiError(500, "Failed to upload image to Cloudinary");
  } 

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}

  ).select("-password")

    if (oldAvatarUrl) {
    await deleteFromCloudinary(oldAvatarUrl);
  }
  
    return res
  .status(200)
  .json(
    new ApiResponse(200, "Avatar updated successfully",user)
  )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path  // yaha file is lye use kiya kyn k hm ek file upload krwa rhe hn 

  if (!coverImageLocalPath)
  {
    throw new ApiError(400, "Cover Image file is missing");
  }

  //how can i delete old image

  const oldUser = await User.findById(req.user._id);
  const oldCoverImageUrl = oldUser?.coverImage;

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  
  if (!coverImage) {
    throw new ApiError(500, "Failed to upload image to Cloudinary");
  } 

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {new: true}

  ).select("-password");

   if (oldCoverImageUrl) {
    await deleteFromCloudinary(oldCoverImageUrl);
  }

    return res
  .status(200)
  .json(
    new ApiResponse(200, "Cover Image updated successfully",user)
  )

})
const getUserChannelProfile = asyncHandler(async(req, res) => {
  const {username} = req.params;
  if(!username.trim()){
    throw new ApiError(400, "username is missing")
  }

 const channel = await User.aggregate([
{
  $match: {
    username: username?.toLowerCase()
  }
},
{
  $lookup:{
    from:"subscriptions",
    localField: "_id",
    foreignField: "channel",
    as: "subscribers"

  }
},
{
  $lookup:{
    from:"subscriptions",
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
    channelSubscribedToCount: {
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
  $project : {
    fullName: 1,
    username: 1,
    subscribersCount: 1,
    channelSubscribedToCount: 1,
    isSubscribed: 1,
    avatar: 1,
    coverImage: 1,
    email: 1
  }
}
])

console.log(channel) // is ka jawab kia aaega, ye aggregate return kia krta ha -- aggregate() hamesha ek ARRAY return karta hai, chahe sirf ek document match kare (jo yahan hoga, kyunki username unique hai)

if(!channel?.length){
  throw new ApiError(404, "Chanel does not exist")
}

return res
.status(200)
.json(
  new ApiResponse(200,"User channel fetched successfully" , channel[0])
)

})

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
        // req.user._id direct use nhi kr skte yaha mongose kaam nhi kre ga is lye mongose ki object id banai pare gi , 
        // ye new kya hota ha or ye yaha kia kr rha ha --ye ek class hai jiska instance banate ho (new keyword se)
      }

    },
    {
      $lookup:{
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [  //sub aggregate
          {
            $lookup: //lookup hamesha ek array deta ha
            {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    email: 1,
                    avatar: 1,

                  }  // is ko me agr dosre lookup k bahar likhta to kia hota? - poore document ke andar sirf fullName/email/avatar select ho jate — video ki baaki details (title, thumbnail, etc.) sab chhoot jatin! Isliye $project andar (sub-pipeline mein) rakhna zaroori tha — taake sirf owner ka data limit ho, video ka data affected na ho.
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }

              //frontend wala ab video.owner.fullName, etc access krskta ha
            }
          }
        ]
      }
    },


  ])
  return res
  .status(200)
  .json(
    new ApiResponse(200, "Watch History fetched successfully",user[0].watchHistory)  
    //ye yaha user[0] bh to bhjskte the ye .watch history kyn lagaya -- Yahan sirf watch history chahiye — user[0] mein poora user object hoga (fullName, email, avatar, aur watchHistory sab kuch)
  )
})







export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory};



  

