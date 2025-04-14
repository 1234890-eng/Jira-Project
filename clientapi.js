const Client = require('./client');
const express = require('express');
const router = express.Router();


// POST /clients - Create new client
router.post('/clients', async (req, res) => {
  try {
    const {
      organizationName,
      email,
      organizationType,
      gstNumber,
      registrationNumber
    } = req.body;

    // Input validations
    if (
      !organizationName || organizationName.length < 1 || organizationName.length > 40 ||
      !/^[a-zA-Z0-9 ]+$/.test(organizationName)
    ) {
      return res.status(400).send('Invalid organization name');
    }

    if (
      !email || email.length < 1 || email.length > 40 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).send('Invalid email format');
    }

    if (!organizationType) {
      return res.status(400).send('Organization type is required');
    }

    if (
      !gstNumber || gstNumber.length < 1 || gstNumber.length > 40 ||
      !/^[a-zA-Z0-9]+$/.test(gstNumber)
    ) {
      return res.status(400).send('Invalid GST number');
    }

    if (
      !registrationNumber || registrationNumber.length < 1 || registrationNumber.length > 40 ||
      !/^[a-zA-Z0-9]+$/.test(registrationNumber)
    ) {
      return res.status(400).send('Invalid registration number');
    }

    // Save to DB
    const newClient = new Client({
      organizationName,
      email,
      organizationType,
      gstNumber,
      registrationNumber
    });

    await newClient.save();

    res.status(201).send({ message: 'Client created successfully', client: newClient });
  } catch (error) {
    console.error('Create Client Error:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

