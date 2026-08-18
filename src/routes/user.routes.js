import {Router} from "express";
import { registerUser,
   loginUser,
    logoutUser,
     refreshAccessToken,
      changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js"; 


const router = Router();

 router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
   { name: "coverImage", maxCount: 1 }
  ]),
   registerUser);

  router.route("/login").post(loginUser);

  //secured routes - user login hona chahye
  router.route("/logout").post(verifyJWT, logoutUser) // pehle jwt chale ga phir logoutUser
  router.route("/refresh-token").post(refreshAccessToken)

  router.route("/change-password").post(verifyJWT, changeCurrentPassword);
  router.route("/current-user").get(verifyJWT, getCurrentUser);
  router.route("/update-account").patch(verifyJWT, updateAccountDetails);
 // patch kb use krte hn
  router.route("/avatar").patch(verifyJWT,upload.single("avatar"),  updateUserAvatar);
  //patch shayad is lye use krte jb hame kch cheezein update krani ho -- PUT — poora resource replace karta hai (saari fields dobara bhejni padti hain, jo missing hon wo delete ho jati hain)
//PATCH — sirf specific fields update karta hai (baaki sab as-is rehta hai)

  router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),  updateUserCoverImage);

 router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
  router.route("/history").get(verifyJWT, getWatchHistory);

  

  


export default router;