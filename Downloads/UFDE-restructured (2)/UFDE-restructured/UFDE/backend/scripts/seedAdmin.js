require('dotenv').config();
import { hash } from 'bcryptjs';
import { initDatabase } from '../src/database/init';
import { findByEmail, create } from '../src/models/User';

async function seed() {
  initDatabase();

  const email = process.env.ADMIN_EMAIL || 'admin@ufde.demo';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  if (findByEmail(email)) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await hash(password, 10);
  create({ name: 'UFDE Admin', email, passwordHash, role: 'Admin' });
  console.log(`Seeded Admin user -> email: ${email} / password: ${password}`);

  // Also seed one Analyst and one Viewer for demo/RBAC testing
  const analystHash = await hash('Analyst@123', 10);
  if (!findByEmail('analyst@ufde.demo')) {
    create({ name: 'Demo Analyst', email: 'analyst@ufde.demo', passwordHash: analystHash, role: 'Analyst' });
    console.log('Seeded Analyst user -> email: analyst@ufde.demo / password: Analyst@123');
  }

  const viewerHash = await hash('Viewer@123', 10);
  if (!findByEmail('viewer@ufde.demo')) {
    create({ name: 'Demo Viewer', email: 'viewer@ufde.demo', passwordHash: viewerHash, role: 'Viewer' });
    console.log('Seeded Viewer user -> email: viewer@ufde.demo / password: Viewer@123');
  }
}

seed().catch((err) => {
  console.error('Failed to seed admin user:', err);
  process.exit(1);
});
