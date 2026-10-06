import type {VercelRequest,VercelResponse} from '@vercel/node';
import {db} from './_lib/db';

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});}
  const databaseConfigured=Boolean(process.env.DATABASE_URL);
  const adminConfigured=Boolean(process.env.ADMIN_PASSWORD);
  const sessionConfigured=Boolean(process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32);
  if(!databaseConfigured)return res.status(500).json({ok:false,databaseConfigured,adminConfigured,sessionConfigured,error:'DATABASE_URL is missing.'});
  try{
    const sql=db();
    const rows=await sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tournaments') AS tournaments_table`;
    return res.status(200).json({ok:true,databaseConfigured:true,databaseConnected:true,tournamentsTable:Boolean(rows[0]?.tournaments_table),adminConfigured,sessionConfigured});
  }catch(error){
    console.error('Health DB error:',error);
    return res.status(500).json({ok:false,databaseConfigured:true,databaseConnected:false,adminConfigured,sessionConfigured,error:'Database connection failed.'});
  }
}
