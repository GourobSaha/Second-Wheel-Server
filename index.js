const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

const app = express();


//MiddleWare
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.swsfudh.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log(authHeader);
    if (!authHeader) {
        res.status(401).send('Unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const categoriesCollection = client.db('secondWheel').collection('categoriesCollection');
        const carsCollection = client.db('secondWheel').collection('cars');
        const bookingsCollection = client.db('secondWheel').collection('bookings');
        const usersCollection = client.db('secondWheel').collection('users');
        const paymentsCollection = client.db('secondWheel').collection('payments');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Buyer') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/categories', async (req, res) => {
            const query = {};
            const options = await categoriesCollection.find(query).toArray();
            res.send(options);
        });


        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id };
            const options = await carsCollection.find(query).sort({ date: -1 }).toArray();
            res.send(options);
        });

        app.get('/cars', async (req, res) => {
            const query = {};
            const options = await carsCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/sellercars', verifyJWT, verifySeller, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const options = await carsCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/allcars', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {

                    isVerified: true

                }
            }
            const result = await carsCollection.updateMany(query, updatedDoc, options);
            res.send(result);
        });

        app.get('/carstatus/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertise: false,
                    soldOut: true

                }
            }
            const result = await carsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.get('/advertise/:id', async (req, res) => {
            const date = new Date();
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {

                    advertise: true,
                    advertiseDate: date


                }
            }
            const result = await carsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });
        app.get('/reportedcars/:id', async (req, res) => {
            const date = new Date();
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {

                    reported: true

                }
            }
            const result = await carsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.get('/reported', async (req, res) => {
            const query = { reported: true }
            const products = await carsCollection.find(query).toArray();
            res.send(products)
        });
        app.get('/advertisedcars', async (req, res) => {
            const query = {}
            const products = await carsCollection.find(query).sort({ advertiseDate: -1 }).limit(1).toArray();
            res.send(products)
        });

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = parseInt(booking.resaleValue);

            const amount = price * 1;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.post('/cars', verifyJWT, verifySeller, async (req, res) => {
            const query = req.body;
            const result = await carsCollection.insertOne(query);
            res.send(result);
        });

        app.get('/bookings', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = await bookingsCollection.findOne(query);
            res.send(options);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
                return res.send({ accessToken: token });
            }
            console.log(user);
            res.status(403).send({ accessToken: '' });
        });

        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const bookings = await usersCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/seller', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.find(query).toArray();
            res.send(user);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        });

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
        });


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyUser = await usersCollection.find(query).toArray();
            if (alreadyUser.length) {
                return res.send({ acknowledged: false })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.put('/users/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/product/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await carsCollection.deleteOne(filter);
            res.send(result);
        })

    }
    finally { }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('Second Wheel Server Running');
})

app.listen(port, () => console.log('Second Wheel Server Running on ', port))