const nodemailer = require('nodemailer'); // at the top
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SuperAdmin = require('./model');
const jwt = require('jsonwebtoken');
const middleware = require('./middleware');
const cors = require('cors');
const app = express();
const bcrypt = require('bcryptjs');
const PasswordResetToken = require('./PasswordResetToken');
const Client = require('./Client');
const setupSwaggerDocs = require('./swagger');
const verifyToken = require('./verifyToken')
const Methodology = require('./Methodology')


app.use(express.json());
app.use(cors({origin:"*"}))

app.use(cors());


const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jira Tracker API',
      version: '1.0.0',
      description: 'API documentation for Jira Tracker Backend',
    },
    servers: [
      {
        url: 'http://192.168.0.16:3000', // Or 5000 if that's your port
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to your route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

mongoose.connect("mongodb+srv://shiva123:Tinku%40890@cluster0.aqepzbj.mongodb.net/", {
})
.then(() => console.log('DB Connection established'))
.catch(err => console.error('DB connection error:', err));


app.post('/superadmin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Username validation
    if (!username || username.length < 1 || username.length > 15) {
      return res.status(400).send('Username must be between 1 and 15 characters');
    }

    // 2. Password format check
    if (!password || password.length < 8 || password.length > 12) {
      return res.status(400).send('Password must be between 8 and 12 characters');
    }

    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).send('Password must include at least 1 uppercase letter, 1 number, and 1 special character');
    }

    // 3. Check if Super Admin exists
    const admin = await SuperAdmin.findOne({ username });
    if (!admin) {
      return res.status(400).send('Super Admin not found');
    }

    // 4. Compare plain text passwords
    if (admin.password !== password) {
      return res.status(400).send('Incorrect password. Please check and try again.');
    }

    // 5. JWT Token (optional)
    const payload = { admin: { id: admin.id } };
    const token = jwt.sign(payload, 'jwtSecret', { expiresIn: '1h' });

    res.json({ message: 'Login successful', token });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Server Error');
  }
});



const crypto = require('crypto');

const generateRandomUsername = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 15) + 1; // 1 to 15 characters
  let username = '';
  for (let i = 0; i < length; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return username;
};



app.post('/superadmin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Validate email format only
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).send('Invalid email format');
    }

    // ✅ Generate random username
    const randomUsername = generateRandomUsername();

    // ✅ Directly create new SuperAdmin
    const newAdmin = await SuperAdmin.create({ email, username: randomUsername, password: 'temporary123' });

    // ✅ Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({ email, token });

    // ✅ Send email with username and reset link
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'gounishivakishorreddy@gmail.com',
        pass: 'egtdjbplpblysvab',
      },
      tls: { rejectUnauthorized: false }
    });

    const resetLink = `http://yourfrontend.com/reset-password/${token}`;
    await transporter.sendMail({
      from: 'gounishivakishorreddy@gmail.com',
      to: 'naveenb.rfchh@gmail.com', // Hardcoded recipient email
      subject: 'Reset Your Password',
      html: `
        <p>Your username: <strong>${randomUsername}</strong></p>
        <p>Click this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>
      `
    });

    res.status(200).send('SuperAdmin created and reset link sent.');
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).send('Server Error');
  }
});


app.post('/superadmin/reset-password/:token', async (req, res) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;
    const token = req.params.token;

    if (!username || !newPassword || !confirmPassword) {
      return res.status(400).send('All fields are required');
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }

    const tokenDoc = await PasswordResetToken.findOne({ token });
    if (!tokenDoc) {
      return res.status(400).send('Invalid or expired token');
    }

    const email = tokenDoc.email;

    const superAdmin = await SuperAdmin.findOne({ email, username });
    if (!superAdmin) {
      return res.status(404).send('SuperAdmin not found');
    }

    superAdmin.password = newPassword; // hash here if needed
    await superAdmin.save();

    await PasswordResetToken.deleteOne({ token });

    res.status(200).send('Password has been reset successfully');
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).send('Server Error');
  }
});


app.get('/myprofile', middleware, async (req, res) => {
  try {
    const user = await SuperAdmin.findById(req.user.id).select('-password -confirmpassword');
    if (!user) return res.status(404).send('User not found');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



app.post('/clients', async (req, res) => {
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

app.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find(); // You can sort or limit if needed
    res.status(200).json({ clients });
  } catch (error) {
    console.error('Fetch Clients Error:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Validate ObjectId format
    if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid client ID format' });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json(client);
  } catch (error) {
    console.error('Fetch Client By ID Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.patch('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const updates = req.body;

    // Validate ObjectId
    if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid client ID format' });
    }

    // Validate individual fields (if present)
    if (updates.organizationName !== undefined) {
      if (
        updates.organizationName.length < 1 || updates.organizationName.length > 40 ||
        !/^[a-zA-Z0-9 ]+$/.test(updates.organizationName)
      ) {
        return res.status(400).send('Invalid organization name');
      }
    }

    if (updates.email !== undefined) {
      if (
        updates.email.length < 1 || updates.email.length > 40 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)
      ) {
        return res.status(400).send('Invalid email format');
      }
    }

    if (updates.organizationType !== undefined && updates.organizationType.trim() === '') {
      return res.status(400).send('Organization type cannot be empty');
    }

    if (updates.gstNumber !== undefined) {
      if (
        updates.gstNumber.length < 1 || updates.gstNumber.length > 40 ||
        !/^[a-zA-Z0-9]+$/.test(updates.gstNumber)
      ) {
        return res.status(400).send('Invalid GST number');
      }
    }

    if (updates.registrationNumber !== undefined) {
      if (
        updates.registrationNumber.length < 1 || updates.registrationNumber.length > 40 ||
        !/^[a-zA-Z0-9]+$/.test(updates.registrationNumber)
      ) {
        return res.status(400).send('Invalid registration number');
      }
    }

    // Perform the update
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { $set: updates },
      { new: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({
      message: 'Client updated successfully',
      client: updatedClient
    });

  } catch (error) {
    console.error('PATCH Client Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


app.delete('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Validate ObjectId format
    if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid client ID format' });
    }

    // Delete the client
    const deletedClient = await Client.findByIdAndDelete(clientId);

    if (!deletedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete Client Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Deactivate client
app.patch('/clients/:id/deactivate', async (req, res) => {
  try {
    const clientId = req.params.id;

    if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid client ID format' });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      { isActive: false },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({ message: 'Client deactivated successfully', client });
  } catch (error) {
    console.error('Deactivate Client Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Activate client
app.patch('/clients/:id/activate', async (req, res) => {
  try {
    const clientId = req.params.id;

    if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid client ID format' });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      { isActive: true },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({ message: 'Client activated successfully', client });
  } catch (error) {
    console.error('Activate Client Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


app.post('/roles', async (req, res) => {
  try {
    const { roleName } = req.body;

    if (!roleName || roleName.length < 3 || roleName.length > 30 || !/^[a-zA-Z0-9 _-]+$/.test(roleName)) {
      return res.status(400).json({ error: 'Invalid or missing role name' });
    }

    const existingRole = await Role.findOne({ roleName });
    if (existingRole) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    const newRole = new Role({ roleName });
    await newRole.save();

    res.status(201).json({ message: 'Role created successfully', role: newRole });
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json({ roles });
  } catch (error) {
    console.error('Fetch Roles Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/roles/:id', async (req, res) => {
  try {
    const roleId = req.params.id;
    const { roleName } = req.body;

    if (!roleName || roleName.length < 3 || roleName.length > 30 || !/^[a-zA-Z0-9 _-]+$/.test(roleName)) {
      return res.status(400).json({ error: 'Invalid or missing role name' });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { roleName },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', role: updatedRole });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


app.delete('/roles/:id', async (req, res) => {
  try {
    const roleId = req.params.id;

    const deletedRole = await Role.findByIdAndDelete(roleId);

    if (!deletedRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete Role Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/methodologies', async (req, res) => {
  try {
    const methodology = new Methodology(req.body);
    await methodology.save();
    res.status(201).json({ message: 'Methodology created successfully', methodology });
  } catch (error) {
    console.error('Create Methodology Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/methodologies', async (req, res) => {
  try {
    const methodologies = await Methodology.find();
    res.status(200).json({ methodologies });
  } catch (error) {
    console.error('Fetch Methodologies Error:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/methodologies/:id', async (req, res) => {
  try {
    const methodology = await Methodology.findById(req.params.id);
    if (!methodology) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(methodology);
  } catch (error) {
    console.error('Fetch Methodology Error:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/methodologies/:id', async (req, res) => {
  try {
    const updated = await Methodology.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Updated successfully', methodology: updated });
  } catch (error) {
    console.error('Update Methodology Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/methodologies/:id', async (req, res) => {
  try {
    const deleted = await Methodology.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete Methodology Error:', error.message);
    res.status(500).json({ error: 'Server Error' });
  }
});


const PORT =  3000;


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log(`Server running on http://192.168.109.247:${PORT}`); // Still relevant for local access
  console.log(`Swagger Docs at http://localhost:${PORT}/api-docs`);
  console.log(`Swagger Docs at http://127.0.0.1:${PORT}/api-docs`);
  console.log(`Swagger Docs at http://192.168.109.247:${PORT}/api-docs`);
  console.log(`Swagger Docs (Localhost): http://localhost:${PORT}/api-docs`);
console.log(`Swagger Docs (LAN): http://192.168.109.247:${PORT}/api-docs`);
console.log(`Swagger Docs (Public IP - test): http://49.204.45.122:${PORT}/api-docs`);

});
