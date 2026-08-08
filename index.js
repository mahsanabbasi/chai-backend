import express from 'express';



const app = express();



app.use(express.static('dist'));

app.get('/', (req, res, next) =>{
  res.send("<h1>Hello World Chai or Code</h1>")
})



const port = process.env.PORT || 8000;


app.listen(port, () =>{
  console.log(`App is running on http://localhost:${port}`);
  
})