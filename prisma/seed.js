import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
try {
  for(const rolename of ['normal','admin','staff'])await db.role.upsert({where:{rolename},update:{},create:{rolename}});
  await db.memberShip.upsert({where:{mname:'normal'},update:{},create:{mname:'normal',score:10}});
  if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<10)throw new Error('ADMIN_PASSWORD at least 10 characters required');
  await db.user.upsert({where:{username:'admin'},update:{},create:{username:'admin',password:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),fullname:'Demo Admin',role:{connect:{rolename:'admin'}},membership:{connect:{mname:'normal'}}}});
  console.log('Roles, membership and admin seeded (existing password unchanged)');
} finally {await db.$disconnect();}
