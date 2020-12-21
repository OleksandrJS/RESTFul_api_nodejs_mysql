/** @format */

const { Router } = require('express');
const router = Router();
const { User, Item } = require('../models');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, res, cb) => {
    cb(null, `image-${req.params.id}.jpg`);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024,
  },
  fileFilter: fileFilter,
}).single('file');

// Create item
router.post(
  '/',
  [
    check('title', 'Title is required').not().isEmpty().trim().isLength({
      min: 3,
    }),
    check('price', 'Price is required').isInt(),
  ],
  auth,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: errors.array()[0].msg,
        });
      }

      const { title, price } = req.body;

      const user = await User.findOne({ where: { id: req.user.userId } });

      const { id: userId, name, phone, email } = user;

      const timestamp = +new Date();

      const item = await Item.create({
        title,
        price,
        user_id: userId,
        image: '',
        created_at: timestamp,
      });

      await Item.update(
        {
          image: `http://localhost:5000/image-${item.id}.jpg`,
        },
        { where: { id: item.id } },
      );

      const updatedItem = await Item.findOne({ where: { id: item.id } });

      const {
        id,
        created_at,
        title: itemTitle,
        price: itemPrice,
        image,
        user_id,
      } = updatedItem;

      res.status(200).json({
        id,
        created_at,
        title: itemTitle,
        price: itemPrice,
        image,
        user_id,
        user: {
          id: userId,
          phone,
          name,
          email,
        },
      });
    } catch (e) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  },
);

// Get items list
router.get('/', async (req, res) => {
  try {
    const items = await Item.findAll();

    if (!items) {
      return res.status(404).send();
    }

    for (item of items) {
      const user = await User.findOne({ where: { id: item.user_id } });
      const { id, phone, name, email } = user;
      item.dataValues.user = { id, phone, name, email };
    }

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get item by Id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findOne({ where: { id: req.params.id } });

    if (!item) {
      return res.status(404).send();
    }

    const user = await User.findOne({ where: { id: item.user_id } });

    const { id, phone, name, email } = user;

    item.dataValues.user = { id, phone, name, email };

    res.status(200).json(item);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Update item
router.put(
  '/:id',
  [
    check('title', 'Title should contain at least 3 characters')
      .optional({ checkFalsy: true })
      .not()
      .isEmpty()
      .trim()
      .isLength({
        min: 3,
      }),
    check('price', 'Please enter price').optional({ checkFalsy: true }).isInt(),
  ],
  auth,
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(422).json({
          field: errors.array()[0].param,
          message: errors.array()[0].msg,
        });
      }

      const { title, price } = req.body;

      const mutableItem = await Item.findOne({ where: { id: req.params.id } });

      if (!mutableItem) {
        return res.status(404).send();
      }

      const user = await User.findOne({ where: { id: req.user.userId } });

      const { id: userId, name, phone, email } = user;

      if (mutableItem.user_id !== userId) {
        return res.status(403).send();
      }

      if (title && price) {
        await Item.update(
          {
            title,
            price,
          },
          { where: { id: mutableItem.id } },
        );
      } else if (title) {
        await Item.update(
          {
            title,
          },
          { where: { id: mutableItem.id } },
        );
      } else if (price) {
        await Item.update(
          {
            price,
          },
          { where: { id: mutableItem.id } },
        );
      }

      const item = await Item.findOne({ where: { id: req.params.id } });

      const {
        id,
        created_at,
        title: itemTitle,
        price: itemPrice,
        image,
        user_id,
      } = item;

      res.status(200).json({
        id,
        created_at,
        title: itemTitle,
        price: itemPrice,
        image,
        user_id,
        user: {
          id: userId,
          name,
          phone,
          email,
        },
      });
    } catch (e) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  },
);

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOne({ where: { id: req.params.id } });

    if (!item) {
      return res.status(404).send();
    }

    const user = await User.findOne({ where: { id: req.user.userId } });

    if (item.user_id !== user.id) {
      return res.status(403).send();
    }

    await Item.destroy({ where: { id: req.params.id } });

    res.status(200).send();
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Upload item image
router.post('/:id/images', auth, (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(422).json({
          field: 'image',
          message: `The file is too big`,
        });
      }

      console.log(req.file);

      const item = await Item.findOne({ where: { id: req.params.id } });

      if (!item) {
        return res.status(404).send();
      }

      const user = await User.findOne({ where: { id: req.user.userId } });

      if (item.user_id !== user.id) {
        return res.status(403).send();
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Please upload an image' });
      }

      const { id, phone, name, email } = user;

      item.dataValues.user = { id, phone, name, email };

      res.status(200).json(item);
    });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
