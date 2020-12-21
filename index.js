/** @format */

const express = require('express');
const config = require('config');
const cors = require('cors');
const { sequelize } = require('./models');

const PORT = config.port || 5000;

const app = express();
app.use(express.json({ extended: true }));
app.use(cors());

app.use(express.static(__dirname + '/uploads'));

app.use('/api', require('./routes/auth.routes'));
app.use('/api/items', require('./routes/items.routes'));

sequelize
  .sync()
  .then(() => {
    console.log('MySQL connected...');
    app.listen(process.env.PORT || PORT, () => {
      console.log(`Server started at port: ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
