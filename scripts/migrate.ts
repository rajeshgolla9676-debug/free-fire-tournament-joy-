import {Client} from 'pg';import {readFile} from 'node:fs/promises';
const url=process.env.DATABASE_URL;if(!url)throw new Error('Set DATABASE_URL');
const client=new Client({connectionString:url});await client.connect();
try{const migration=await readFile(new URL('../db/migrations/001_initial_schema.sql',import.meta.url),'utf8');await client.query(migration);console.log('Database migration complete.');}finally{await client.end();}
