import express from 'express';
import expressProxy from 'express-http-proxy';

const app = express()


app.use('/api/v1/users', expressProxy('http://localhost:3001'))
app.use('/api/v1/driver', expressProxy('http://localhost:3002'))
app.use('/api/v1/ride', expressProxy('http://localhost:3003'))


app.listen(3000, () => {
    console.log('Gateway server listening on port 3000')
})