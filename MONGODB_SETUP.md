# 📊 MongoDB Data Management Guide

## Where Your Data is Stored

Your app uses **MongoDB** running locally on your Mac:

```
Database Name: coincap-trading
Location: localhost (your computer)
Port: 27017
Full URI: mongodb://localhost:27017/coincap-trading
```

## Collections (Tables) in Your Database

Your app stores data in these collections:

1. **users** - User accounts, profiles, balances
2. **transactions** - Trading history, deposits, withdrawals
3. **sessions** - Login sessions (NextAuth)
4. **accounts** - OAuth provider data (Google login)
5. **verificationtokens** - Email verification tokens

## 🛠️ Tools to Manage Your Data

### 1. MongoDB Compass (GUI - RECOMMENDED) ✅

You already have this installed and running!

**How to use:**
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `coincap-trading`
4. Browse collections, view/edit documents visually

**Features:**
- Visual interface for viewing data
- Query builder (no code needed)
- Edit/delete documents with clicks
- Export data to JSON/CSV
- View database statistics

### 2. MongoDB Shell (mongosh - CLI)

**Quick Commands:**

```bash
# Connect to your database
mongosh coincap-trading

# Show all collections
show collections

# View all users
db.users.find().pretty()

# Count users
db.users.countDocuments()

# Find specific user by email
db.users.findOne({ email: "test@example.com" })

# View recent transactions
db.transactions.find().sort({ createdAt: -1 }).limit(10).pretty()

# Delete all test data (CAREFUL!)
db.users.deleteMany({ email: /test|example/i })

# Exit
exit
```

### 3. Studio 3T (Alternative GUI - Free Personal)

Download: https://studio3t.com/download/

**Features:**
- More advanced than Compass
- SQL queries for MongoDB
- Data comparison tools
- Visual query builder

## 📋 Common Management Tasks

### View All Users

**MongoDB Compass:**
1. Click `coincap-trading` database
2. Click `users` collection
3. Browse documents

**CLI:**
```bash
mongosh coincap-trading --eval "db.users.find().pretty()"
```

### Check User Balance

```bash
mongosh coincap-trading --eval 'db.users.findOne(
  { email: "your@email.com" },
  { fullName: 1, email: 1, balance: 1, _id: 0 }
)'
```

### View All Transactions

```bash
mongosh coincap-trading --eval "db.transactions.find().sort({ createdAt: -1 }).limit(20).pretty()"
```

### Clear Test Data

```bash
# Remove test users (emails containing "test" or "example")
mongosh coincap-trading --eval 'db.users.deleteMany({ email: /test|example/i })'

# Remove all test transactions
mongosh coincap-trading --eval 'db.transactions.deleteMany({ userId: { $exists: true } })'
```

### Export Data (Backup)

```bash
# Backup entire database
mongodump --db coincap-trading --out ~/Desktop/backup-$(date +%Y%m%d)

# Restore from backup
mongorestore --db coincap-trading ~/Desktop/backup-20260206/coincap-trading
```

### Reset Entire Database (CAREFUL!)

```bash
# Drop entire database (deletes everything!)
mongosh coincap-trading --eval "db.dropDatabase()"
```

## 🔍 Useful Queries for Your App

### 1. Find User by Email
```javascript
mongosh coincap-trading
db.users.findOne({ email: "user@example.com" })
```

### 2. List All Users with 2FA Enabled
```javascript
db.users.find({ isTwoFactorEnabled: true }, { email: 1, fullName: 1 })
```

### 3. Check User's Balance
```javascript
db.users.find(
  { email: "user@example.com" },
  { balance: 1, fullName: 1, email: 1 }
)
```

### 4. View Recent Transactions
```javascript
db.transactions.find()
  .sort({ createdAt: -1 })
  .limit(10)
  .pretty()
```

### 5. Count Total Users
```javascript
db.users.countDocuments()
```

### 6. Find Unverified Users
```javascript
db.users.find({ isVerified: false }, { email: 1, createdAt: 1 })
```

## 📊 Database Statistics

```bash
# Database size and stats
mongosh coincap-trading --eval "db.stats()"

# Collection counts
mongosh coincap-trading --eval "
  print('Users:', db.users.countDocuments());
  print('Transactions:', db.transactions.countDocuments());
  print('Sessions:', db.sessions.countDocuments());
"
```

## 🔧 MongoDB Service Management

### Check if MongoDB is Running
```bash
ps aux | grep mongod | grep -v grep
```

### Start MongoDB
```bash
brew services start mongodb-community
```

### Stop MongoDB
```bash
brew services stop mongodb-community
```

### Restart MongoDB
```bash
brew services restart mongodb-community
```

### MongoDB Status
```bash
brew services info mongodb-community
```

## 📁 Data Location on Disk

Your actual database files are stored at:
```bash
/opt/homebrew/var/mongodb
```

Config file:
```bash
/opt/homebrew/etc/mongod.conf
```

Logs:
```bash
/opt/homebrew/var/log/mongodb/mongo.log
```

## 🔒 Security Best Practices

### Current Setup (Development)
- ❌ No authentication required
- ❌ Only accessible from localhost
- ✅ Good for local development

### For Production (Future)
1. Enable authentication:
   ```bash
   # Create admin user
   mongosh admin
   db.createUser({
     user: "admin",
     pwd: "secure_password",
     roles: ["root"]
   })
   ```

2. Update connection string:
   ```
   MONGODB_URI=mongodb://admin:secure_password@localhost:27017/coincap-trading?authSource=admin
   ```

## 📱 Quick Access Scripts

I'll create helper scripts for you in the next response!

## 🆘 Troubleshooting

### MongoDB won't start
```bash
# Check logs
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Check port is not in use
lsof -i :27017

# Kill conflicting process
kill -9 <PID>

# Restart
brew services restart mongodb-community
```

### Database connection errors
1. Check MongoDB is running: `brew services list | grep mongodb`
2. Check connection string in `.env.local`
3. Try connecting with Compass: `mongodb://localhost:27017`

### Data not updating in Compass
- Click the **Refresh** button (circular arrow icon)
- Or press `Cmd+R`

---

## 🚀 Quick Start: View Your Data NOW

**Easiest way (MongoDB Compass is already open):**

1. In MongoDB Compass, click **"Connect"** or enter: `mongodb://localhost:27017`
2. Click the `coincap-trading` database
3. Click `users` collection
4. See all your registered users!

**Or use CLI:**
```bash
mongosh coincap-trading --eval "db.users.find({}, {email:1, fullName:1, balance:1, createdAt:1}).pretty()"
```
