import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true   // For searching
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true   
  },
  avatar: {
    type: String, // cloudinary url
    trim: true,
    required: true
  },
  coverImage: {
    type: String, // cloudinary url
    trim: true,
  },
  watchHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Video'
  }],
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken: {
    type: String,
  },
}, {
  timestamps: true
});

//() => {} me this ka reference nahi hota, isliye function(){} use kiya hai taki this ka reference mile. pre matlab save se pehle
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return ;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

//schema.methods.xxx — ye ek custom function define karta hai jo har User document (object pr call hoga)(instance) pe available hoga.

userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

//jwt.sign(payload, secret, options)
userSchema.methods.generateAccessToken = function() {
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
  );
};

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  );
};

export const User = mongoose.model('User', userSchema);