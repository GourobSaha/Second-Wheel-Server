const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

//MiddleWare
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('Second Wheel Server Running');
})

app.listen(port, () => console.log('Second Wheel Server Running on ', port))