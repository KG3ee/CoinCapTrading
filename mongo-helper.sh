#!/bin/bash

# MongoDB Quick Management Script
# Usage: ./mongo-helper.sh [command]

DB_NAME="coincap-trading"

case "$1" in
  "users")
    echo "📊 All Users in Database:"
    mongosh $DB_NAME --quiet --eval "db.users.find({}, {email:1, fullName:1, balance:1, isVerified:1, isTwoFactorEnabled:1, createdAt:1}).pretty()"
    ;;
  
  "count")
    echo "📈 Database Statistics:"
    mongosh $DB_NAME --quiet --eval "
      print('👥 Total Users:', db.users.countDocuments());
      print('💰 Total Transactions:', db.transactions.countDocuments());
      print('🔐 Sessions:', db.sessions.countDocuments());
      print('✅ Verified Users:', db.users.countDocuments({isVerified: true}));
      print('🔒 2FA Enabled:', db.users.countDocuments({isTwoFactorEnabled: true}));
    "
    ;;
  
  "transactions")
    echo "💸 Recent Transactions (Last 10):"
    mongosh $DB_NAME --quiet --eval "db.transactions.find().sort({createdAt:-1}).limit(10).pretty()"
    ;;
  
  "find-user")
    if [ -z "$2" ]; then
      echo "Usage: ./mongo-helper.sh find-user <email>"
      exit 1
    fi
    echo "🔍 Finding user: $2"
    mongosh $DB_NAME --quiet --eval "db.users.findOne({email: '$2'})"
    ;;
  
  "balance")
    if [ -z "$2" ]; then
      echo "Usage: ./mongo-helper.sh balance <email>"
      exit 1
    fi
    echo "💰 Balance for $2:"
    mongosh $DB_NAME --quiet --eval "db.users.findOne({email: '$2'}, {fullName:1, email:1, balance:1, _id:0})"
    ;;
  
  "backup")
    BACKUP_DIR=~/Desktop/mongodb-backup-$(date +%Y%m%d-%H%M%S)
    echo "💾 Backing up database to: $BACKUP_DIR"
    mongodump --db $DB_NAME --out $BACKUP_DIR
    echo "✅ Backup complete!"
    ;;
  
  "restore")
    if [ -z "$2" ]; then
      echo "Usage: ./mongo-helper.sh restore <backup_directory>"
      exit 1
    fi
    echo "⚠️  Restoring database from: $2"
    echo "This will overwrite current data. Continue? (y/n)"
    read -r confirm
    if [ "$confirm" = "y" ]; then
      mongorestore --db $DB_NAME --drop $2/$DB_NAME
      echo "✅ Restore complete!"
    else
      echo "❌ Restore cancelled"
    fi
    ;;
  
  "clear-test")
    echo "⚠️  This will delete all users with 'test' or 'example' in their email"
    echo "Continue? (y/n)"
    read -r confirm
    if [ "$confirm" = "y" ]; then
      mongosh $DB_NAME --quiet --eval "
        var result = db.users.deleteMany({email: /test|example/i});
        print('Deleted', result.deletedCount, 'test users');
      "
    else
      echo "❌ Cancelled"
    fi
    ;;
  
  "reset")
    echo "⚠️  WARNING: This will DELETE ALL DATA in the database!"
    echo "Type 'DELETE ALL' to confirm:"
    read -r confirm
    if [ "$confirm" = "DELETE ALL" ]; then
      mongosh $DB_NAME --quiet --eval "db.dropDatabase()"
      echo "✅ Database reset complete"
    else
      echo "❌ Reset cancelled"
    fi
    ;;
  
  "status")
    echo "🔍 MongoDB Status:"
    if ps aux | grep -v grep | grep mongod > /dev/null; then
      echo "✅ MongoDB is running"
      echo ""
      mongosh $DB_NAME --quiet --eval "db.serverStatus().version" | head -1 | xargs echo "📦 Version:"
      mongosh $DB_NAME --quiet --eval "db.stats().dataSize" | xargs echo "💾 Database Size (bytes):"
    else
      echo "❌ MongoDB is NOT running"
      echo "Start it with: brew services start mongodb-community"
    fi
    ;;
  
  "export-users")
    OUTPUT_FILE=~/Desktop/users-export-$(date +%Y%m%d-%H%M%S).json
    echo "📤 Exporting users to: $OUTPUT_FILE"
    mongoexport --db=$DB_NAME --collection=users --out=$OUTPUT_FILE --pretty
    echo "✅ Export complete!"
    ;;
  
  "shell")
    echo "🐚 Opening MongoDB shell for $DB_NAME..."
    mongosh $DB_NAME
    ;;
  
  *)
    echo "MongoDB Quick Helper for CoinCapTrading"
    echo ""
    echo "Usage: ./mongo-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "  users              - List all users"
    echo "  count              - Show database statistics"
    echo "  transactions       - Show recent transactions"
    echo "  find-user <email>  - Find user by email"
    echo "  balance <email>    - Check user balance"
    echo "  backup             - Backup entire database"
    echo "  restore <dir>      - Restore from backup"
    echo "  clear-test         - Delete test users"
    echo "  reset              - Delete ALL data (dangerous!)"
    echo "  status             - Check MongoDB status"
    echo "  export-users       - Export users to JSON file"
    echo "  shell              - Open MongoDB shell"
    echo ""
    echo "Examples:"
    echo "  ./mongo-helper.sh users"
    echo "  ./mongo-helper.sh find-user test@example.com"
    echo "  ./mongo-helper.sh balance user@gmail.com"
    echo "  ./mongo-helper.sh backup"
    ;;
esac
