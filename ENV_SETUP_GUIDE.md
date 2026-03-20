# Environment Setup for Multi-Role Authentication

## Prerequisites

Ensure your `.env` file contains the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hospital_ai_agent

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER=+1234567890
VAPI_AREA_CODE=415
```

## Important Environment Variables

### JWT_SECRET
- **Required**: Yes
- **Description**: Secret key used to sign and verify JWT tokens
- **Security**: Change this to a strong random string in production
- **Example**: Generate using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### MongoDB Connection
- **Required**: Yes
- **Description**: MongoDB connection URI
- **Development**: Can use local MongoDB
- **Production**: Use managed MongoDB service (Atlas, etc.)

## Running the Backend

```bash
# Install dependencies
npm install

# Start development server
npm start

# The server will start on the configured PORT (default: 5000)
```

## Database Collections

The new system uses the following MongoDB collections:

### Users Collection
Where all users (admin, doctor, patient) are stored with the new unified schema.

```javascript
db.users.insertOne({
  email: "admin@hospital.com",
  password: "$2a$...", // bcryptjs hashed
  role: "admin",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  isActive: true,
  createdAt: ISODate(),
  updatedAt: ISODate()
})
```

### No Longer Used
The old `admins` collection is no longer used. You can keep it for reference or delete it after migrating data.

## Integration with Existing Routes

All existing routes have been updated to use the new authentication middleware:

- `GET /api/calls` - Protected with authMiddleware
- `POST /api/calls/initiate` - Protected with authMiddleware
- `GET /api/patients` - Protected with authMiddleware
- `GET /api/appointments` - Protected with authMiddleware
- `GET /api/health` - Public (no authentication required)

## Testing the API

### 1. Test Admin Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.admin@hospital.com",
    "password": "TestPass123",
    "confirmPassword": "TestPass123",
    "role": "admin",
    "firstName": "Test",
    "lastName": "Admin"
  }'
```

### 2. Test Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.admin@hospital.com",
    "password": "TestPass123"
  }'
```

### 3. Use Token for Protected Endpoints
```bash
# Copy the token from login response
curl -X GET http://localhost:5000/api/health \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Issues & Solutions

### "No authorization header provided"
- **Cause**: Missing or incorrect Authorization header
- **Solution**: Include `Authorization: Bearer <token>` in request headers

### "Invalid or expired token"
- **Cause**: Token signature doesn't match or token expired
- **Solution**: 
  - Verify JWT_SECRET matches between server and client
  - Get a new token by logging in again

### "Email already exists"
- **Cause**: User with that email is already registered
- **Solution**: Use a different email address

### "Specialization and license number are required for doctors"
- **Cause**: Registering as doctor without required fields
- **Solution**: Include `specialization` and `licenseNumber` in registration

### "Access denied. Required role: admin"
- **Cause**: User doesn't have the required role
- **Solution**: Login with appropriate role account

## Notes for Deployment

1. **Change JWT_SECRET**: Use a strong random string in production
2. **Use Environment Variables**: Never hardcode secrets
3. **Enable HTTPS**: Always use HTTPS in production
4. **MongoDB Security**: Use authentication and IP whitelisting
5. **CORS Configuration**: Update CORS settings for your frontend domain
6. **MongoDB Indexes**: Consider adding indexes on frequently queried fields:
   ```javascript
   db.users.createIndex({ email: 1 })
   db.users.createIndex({ role: 1 })
   ```

## Development Commands

```bash
# Start server
npm start

# Check server health
curl http://localhost:5000/api/health

# View logs (with timestamps)
# Logs are handled by middleware/logger.js
```

## Next Steps

1. Test all authentication flows
2. Implement doctor approval endpoint
3. Add admin dashboard route
4. Set up proper logging and monitoring
5. Configure authentication on frontend

---

Need help? Check:
- [MULTI_ROLE_AUTH_GUIDE.md](MULTI_ROLE_AUTH_GUIDE.md) - Complete API documentation
- [ROLE_BASED_ROUTES_EXAMPLE.js](ROLE_BASED_ROUTES_EXAMPLE.js) - Implementation examples
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Summary of all changes
