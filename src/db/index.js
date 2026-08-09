import mongoose from 'mongoose';
import express from 'express';
import {DB_NAME} from '../constants.js';
import { exit } from 'node:process';


const connectDB = async () => {
  try{
    const conectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

    console.log(`MongoDB connected !! DB HOST : ${conectionInstance.connection.host}`);

  } catch (err){
    console.log("Mongo db connection failed, Error in connecting to DB: ",err);
    process.exit(1);
  }
}

export default connectDB;