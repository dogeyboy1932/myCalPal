# MongoDB Atlas Setup Guide

## Quick Setup for Your Calendar Application

MongoDB Atlas is a cloud database service that provides a free tier perfect for development. Follow these steps to set up your database:

## Step 1: Create MongoDB Atlas Account

1. **Visit MongoDB Atlas** <mcreference link="https://www.mongodb.com/docs/atlas/getting-started/" index="2">2</mcreference>
   - Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Click "Try Free" to create an account
   - Sign up with your email or Google/GitHub account

## Step 2: Create a Free Cluster

1. **Create New Project**
   - After logging in, create a new project (e.g., "Calendar App")
   - Choose "Build a Database"

2. **Select Free Tier** <mcreference link="https://www.mongodb.com/docs/atlas/getting-started/" index="2">2</mcreference>
   - Choose "M0 Sandbox" (Free tier)
   - Select a cloud provider (AWS, Google Cloud, or Azure)
   - Choose a region closest to you
   - Name your cluster (e.g., "calendar-cluster")
   - Click "Create Cluster"

## Step 3: Configure Database Access

1. **Create Database User** <mcreference link="https://www.mongodb.com/docs/atlas/tutorial/connect-to-your-cluster/" index="4">4</mcreference>
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set privileges to "Read and write to any database"
   - Click "Add User"

2. **Configure Network Access** <mcreference link="https://www.mongodb.com/docs/atlas/getting-started/" index="2">2</mcreference>
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add your specific IP address for better security
   - Click "Confirm"

## Step 4: Get Connection String

1. **Navigate to Clusters** <mcreference link="https://www.mongodb.com/docs/guides/atlas/connection-string/" index="5">5</mcreference>
   - Go back to "Clusters" in the sidebar
   - Click "Connect" button on your cluster

2. **Choose Connection Method** <mcreference link="https://www.mongodb.com/docs/guides/atlas/connection-string/" index="5">5</mcreference>
   - Select "Connect your application"
   - Choose "Node.js" as driver
   - Copy the connection string

3. **Connection String Format**
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 5: Update Your Application

1. **Update Environment Variables**
   - Open your `.env` file in the calendar app
   - Replace the existing MONGODB_URI:
   
   ```env
   # Replace this line:
   MONGODB_URI=mongodb://localhost:27017/ai-calendar-assistant
   
   # With your Atlas connection string:
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.xxxxx.mongodb.net/ai-calendar-assistant?retryWrites=true&w=majority
   ```

2. **Important Notes** <mcreference link="https://www.mongodb.com/docs/atlas/tutorial/connect-to-your-cluster/" index="4">4</mcreference>
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - If your password contains special characters, they need to be URL encoded
   - Add `/ai-calendar-assistant` before the `?` to specify the database name

## Step 6: Test the Connection

1. **Restart Your Development Server**
   ```powershell
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Test Calendar Creation**
   - Open your browser to `http://localhost:3000`
   - Try creating a calendar event
   - Check the server logs for successful database connection

## Troubleshooting

### Common Issues <mcreference link="https://www.mongodb.com/docs/atlas/troubleshoot-connection/" index="3">3</mcreference>

1. **Authentication Failed**
   - Double-check username and password
   - Ensure special characters in password are URL encoded
   - Verify the database user has proper permissions

2. **Connection Timeout**
   - Check your IP address is in the Network Access list
   - Verify your internet connection
   - Try adding 0.0.0.0/0 to allow all IPs (development only)

3. **Special Characters in Password** <mcreference link="https://www.mongodb.com/docs/atlas/troubleshoot-connection/" index="3">3</mcreference>
   - If your password contains `@`, `%`, `:`, or other special characters
   - URL encode them: `@` becomes `%40`, `:` becomes `%3A`, etc.

### Example Working Connection String
```env
MONGODB_URI=mongodb+srv://myuser:mypass123@calendar-cluster.abc12.mongodb.net/ai-calendar-assistant?retryWrites=true&w=majority
```

## Benefits of MongoDB Atlas

- ✅ **Free Tier**: 512MB storage, perfect for development
- ✅ **No Installation**: No need to install MongoDB locally
- ✅ **Automatic Backups**: Built-in backup and recovery
- ✅ **Global Access**: Access your database from anywhere
- ✅ **Security**: Built-in security features and monitoring
- ✅ **Scalability**: Easy to upgrade when your app grows

## Next Steps

Once your Atlas database is connected:
1. Your calendar app will be able to store events in the cloud
2. You can access the Atlas dashboard to view your data
3. Consider setting up proper IP restrictions for production
4. Monitor your usage in the Atlas dashboard

---

**Need Help?** Check the [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/) for more detailed guides.