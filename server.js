const express=require('express'),{DatabaseSync}=require('node:sqlite');
const app=express(),KEY=process.env.ADMIN_KEY||'admin123',db=new DatabaseSync('data.db');
app.use(express.json(),express.static('public'));
db.exec(`CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,cat TEXT NOT NULL,city TEXT,about TEXT,rating REAL DEFAULT 4)`);

if(db.prepare('SELECT COUNT(*) c FROM items').get().c===0){
 const C=['Food','Tech','Health','Education'],T=['Karachi','Lahore','Islamabad','Multan'];
 const ins=db.prepare('INSERT INTO items(name,cat,city,about,rating) VALUES(?,?,?,?,?)');
 db.exec('BEGIN');
 for(let i=1;i<=300;i++)ins.run('Business '+i,C[i%4],T[Math.floor(i/4)%4],'Sample description for business '+i,3+(i%20)/10);
 db.exec('COMMIT');
}

app.get('/api/items',(q,r)=>{
 const{s='',cat='',sort='id'}=q.query,p=Math.max(1,+q.query.p||1),n=Math.min(50,+q.query.n||12);
 const w="(name LIKE ? OR about LIKE ? OR city LIKE ?) AND (?='' OR cat=?)";
 const a=[`%${s}%`,`%${s}%`,`%${s}%`,cat,cat];
 const o={rating:'rating DESC,id',name:'name'}[sort]||'id';
 const total=db.prepare(`SELECT COUNT(*) c FROM items WHERE ${w}`).get(...a).c;
 const items=db.prepare(`SELECT * FROM items WHERE ${w} ORDER BY ${o} LIMIT ? OFFSET ?`).all(...a,n,(p-1)*n);
 r.json({total,items});
});
app.get('/api/items/:id',(q,r)=>{
 const i=db.prepare('SELECT * FROM items WHERE id=?').get(q.params.id);
 i?r.json(i):r.status(404).json({err:'Not found'});
});
app.post('/api/items',(q,r)=>{
 const{name,cat,city,about,key}=q.body;
 if(key!==KEY)return r.status(401).json({err:'Wrong key'});
 if(!name||!cat)return r.status(400).json({err:'Name and category are required'});
 const x=db.prepare('INSERT INTO items(name,cat,city,about) VALUES(?,?,?,?)').run(name,cat,city||'',about||'');
 r.json({id:Number(x.lastInsertRowid)});
});
app.delete('/api/items/:id',(q,r)=>{
 if(q.query.key!==KEY)return r.status(401).json({err:'Wrong key'});
 db.prepare('DELETE FROM items WHERE id=?').run(q.params.id);
 r.json({ok:1});
});
app.listen(process.env.PORT||3000,()=>console.log('http://localhost:3000'));