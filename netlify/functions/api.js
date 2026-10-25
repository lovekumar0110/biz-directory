const serverless=require('serverless-http'),express=require('express'),{Pool}=require('pg');
const app=express(),KEY=process.env.ADMIN_KEY;
const db=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
app.use(express.json());
const h=f=>(q,r)=>f(q,r).catch(e=>{console.error(e);r.status(500).json({err:'Server error'})});

const init=db.query(`CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY,name TEXT NOT NULL,cat TEXT NOT NULL,city TEXT,about TEXT,rating REAL DEFAULT 4)`);
const R=express.Router();
R.use((q,r,n)=>init.then(()=>n()).catch(n));

R.get('/items',h(async(q,r)=>{
 const{s='',cat='',sort='id'}=q.query,p=Math.max(1,+q.query.p||1),n=Math.min(50,+q.query.n||12);
 const w="(name ILIKE $1 OR about ILIKE $1 OR city ILIKE $1) AND ($2::text='' OR cat=$2::text)";
 const a=[`%${s}%`,cat];
 const o={rating:'rating DESC,id',name:'name'}[sort]||'id';
 const total=(await db.query(`SELECT COUNT(*)::int c FROM items WHERE ${w}`,a)).rows[0].c;
 const items=(await db.query(`SELECT * FROM items WHERE ${w} ORDER BY ${o} LIMIT $3 OFFSET $4`,[...a,n,(p-1)*n])).rows;
 r.json({total,items});
}));
R.get('/items/:id',h(async(q,r)=>{
 if(!/^\d+$/.test(q.params.id))return r.status(404).json({err:'Not found'});
 const i=(await db.query('SELECT * FROM items WHERE id=$1',[q.params.id])).rows[0];
 i?r.json(i):r.status(404).json({err:'Not found'});
}));
R.post('/items',h(async(q,r)=>{
 const{name,cat,city,about,key}=q.body;
 if(!KEY||key!==KEY)return r.status(401).json({err:'Wrong key'});
 if(!name||!cat)return r.status(400).json({err:'Name and category are required'});
 const x=await db.query('INSERT INTO items(name,cat,city,about) VALUES($1,$2,$3,$4) RETURNING id',[name,cat,city||'',about||'']);
 r.json({id:x.rows[0].id});
}));
R.delete('/items/:id',h(async(q,r)=>{
 if(!KEY||q.query.key!==KEY)return r.status(401).json({err:'Wrong key'});
 if(/^\d+$/.test(q.params.id))await db.query('DELETE FROM items WHERE id=$1',[q.params.id]);
 r.json({ok:1});
}));
app.use('/api',R);
module.exports.handler=serverless(app);