import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";
import {ApiResponse} from "../utils/ApiResponse.js";

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
  res.status(200).json({
    success: true,
    message: "Login controller is working fine",
  });
});

export { registerUser, loginUser };