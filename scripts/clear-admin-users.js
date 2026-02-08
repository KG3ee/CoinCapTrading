require('../lib/mongodb');
const AdminUser = require('../lib/models/AdminUser').default;

AdminUser.deleteMany({}).then(() => {
  console.log('All admin users deleted');
  process.exit(0);
});
