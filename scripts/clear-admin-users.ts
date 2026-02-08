// scripts/clear-admin-users.ts
import '../lib/mongodb';
import AdminUser from '../lib/models/AdminUser';

(async () => {
  await AdminUser.deleteMany({});
  console.log('All admin users deleted');
  process.exit(0);
})();
