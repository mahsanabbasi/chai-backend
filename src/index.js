// require('dotenv').config({path: './.env'}); 

import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import connectDB from './db/index.js';
import {DB_NAME} from './constants.js';
dotenv.config({path: './.env'});


const app = express();

app.get('/', (req, res, next) =>{
  res.send("<h1>Hello World Chai or Code</h1>")
})

const port = process.env.PORT || 8000;

connectDB();

// ;(async () => {
//   try{
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on('error', (err) => {
//       console.error("Error in app: ", err);
//       throw err;
//     }); // db connect but shayad express me error aa jaye to handle karne ke liye

//     app.listen(port, () => {
//       console.log(`Server is running on http://localhost:${port}`)
//     })
//   } catch (err){
//     console.log("Error in app: ",err);
//     throw err;
//   }
// })()