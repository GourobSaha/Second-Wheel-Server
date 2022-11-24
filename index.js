const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//MiddleWare
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.swsfudh.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('secondWheel').collection('categoriesCollection');
        const carsCollection = client.db('secondWheel').collection('cars');

        app.get('/categories', async (req, res) => {
            const query = {};
            const options = await categoriesCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/cars', async (req, res) => {
            const query = {};
            const options = await carsCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id };
            const options = await carsCollection.find(query).toArray();
            res.send(options);
        })
    }
    finally { }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('Second Wheel Server Running');
})

app.listen(port, () => console.log('Second Wheel Server Running on ', port))