require('dotenv').config();
import { initDatabase } from '../src/database/init';

initDatabase();
console.log('UFDE database initialised (schema applied).');
