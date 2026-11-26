import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { Pool } from 'pg';
import { validateExpense, csv, isMonth, monthRange, validateFilter } from './validation.js';

const url = process.env.DATABASE_URL || '';
if (url && /(?:postgres(?:ql)?:\/\/)([^:]+):/.exec(url)?.[1] === 'expense_owner') throw new Error('DATABASE_URL must use expense_app');
export const pool = new Pool({ connectionString: url || undefined });
const app = express();
const fail = (res: express.Response, status: number, code: string, message: string, fields?: object) => res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')) {
    if (req.get('origin') !== frontendOrigin) return fail(res, 403, 'ORIGIN_FORBIDDEN', 'Asal permintaan tidak diizinkan');
  }
  next();
});
app.use(express.json()); app.use(cookieParser());
async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const id = req.cookies.session; if (!id) return fail(res, 401, 'AUTH_REQUIRED', 'Sesi diperlukan');
  const r = await pool.query('SELECT u.id,u.username,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()', [id]);
  if (!r.rowCount) return fail(res, 401, 'AUTH_REQUIRED', 'Sesi diperlukan');
  (req as any).user = r.rows[0]; (req as any).session = id; next();
}
const filter = (q: Record<string, unknown>) => {
  if (q.month != null && (q.from != null || q.to != null)) throw Object.assign(new Error(), { status: 400, code: 'FILTER_CONFLICT' });
  const invalid = validateFilter(q); if (invalid) throw Object.assign(new Error(), { status: 400, code: invalid.code });
  const p: any[] = []; let w='';
  if (q.month) { const [from, to] = monthRange(q.month as string); p.push(from, to); w='e.expense_date >= $1 AND e.expense_date < $2'; }
  else { if(q.from){p.push(q.from);w=`e.expense_date >= $${p.length}`;} if(q.to){p.push(q.to);w+=(w?' AND ':'')+`e.expense_date <= $${p.length}`;} }
  return {w, p};
};
app.post('/api/auth/login', async (req,res) => { const { identifier, password }=req.body||{}; const r=await pool.query('SELECT id,username,email,password_hash FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1)',[identifier||'']); if(!r.rowCount || !(await argon2.verify(r.rows[0].password_hash,password||''))) return fail(res,401,'AUTH_INVALID','Kredensial tidak valid'); const sid=crypto.randomUUID(); await pool.query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+make_interval(secs=>$3))",[sid,r.rows[0].id,Number(process.env.SESSION_TTL_SECONDS||604800)]); res.cookie('session',sid,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:Number(process.env.SESSION_TTL_SECONDS||604800)*1000}); res.json({user:{id:r.rows[0].id,username:r.rows[0].username,email:r.rows[0].email}}); });
app.post('/api/auth/logout', async (req,res)=>{if(req.cookies.session) await pool.query('DELETE FROM sessions WHERE id=$1',[req.cookies.session]); res.clearCookie('session'); res.status(204).end();});
app.get('/api/auth/me',auth,(req,res)=>res.json({user:(req as any).user}));
app.get('/api/categories',auth,async (_req,res)=>res.json({categories:(await pool.query('SELECT id,name FROM categories ORDER BY name')).rows}));
app.get('/api/expenses',auth,async(req,res)=>{try{const {w,p}=filter(req.query);const user=(req as any).user.id;const where=`e.user_id=$${p.length+1}${w?' AND '+w:''}`;p.push(user);const page=Math.max(1,Number(req.query.page)||1),size=Math.min(100,Math.max(1,Number(req.query.pageSize)||50));const count=await pool.query(`SELECT count(*)::int count,coalesce(sum(amount),0)::numeric total FROM expenses e WHERE ${where}`,p);const rows=await pool.query(`SELECT e.id,e.amount::text,"expense_date" "expenseDate",json_build_object('id',c.id,'name',c.name) category,e.description,e.created_at "createdAt",e.updated_at "updatedAt" FROM expenses e JOIN categories c ON c.id=e.category_id WHERE ${where} ORDER BY e.expense_date DESC,e.id DESC LIMIT ${size} OFFSET ${(page-1)*size}`,p);res.json({items:rows.rows,total:count.rows[0].count,page,pageSize:size,totalAmount:count.rows[0].total});}catch(e:any){fail(res,e.status||400,e.code||'FILTER_ERROR','Filter tidak valid')}});
const save=async(req:express.Request,res:express.Response,update=false)=>{const fields=validateExpense(req.body||{});if(Object.keys(fields).length)return fail(res,400,'VALIDATION_ERROR','Data tidak valid',fields);const u=(req as any).user.id,b=req.body;if(!(await pool.query('SELECT 1 FROM categories WHERE id=$1',[b.categoryId])).rowCount)return fail(res,400,'VALIDATION_ERROR','Data tidak valid',{categoryId:'Kategori wajib dipilih'});if(update){const r=await pool.query('UPDATE expenses SET amount=$1,expense_date=$2,category_id=$3,description=$4,updated_at=now() WHERE id=$5 AND user_id=$6 RETURNING id',[b.amount,b.expenseDate,b.categoryId,b.description||null,req.params.id,u]);if(!r.rowCount)return fail(res,404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan');}else await pool.query('INSERT INTO expenses(user_id,amount,expense_date,category_id,description) VALUES($1,$2,$3,$4,$5)',[u,b.amount,b.expenseDate,b.categoryId,b.description||null]);res.status(update?200:201).json({ok:true});};
app.post('/api/expenses',auth,(req,res)=>save(req,res)); app.patch('/api/expenses/:id',auth,(req,res)=>save(req,res,true));
app.delete('/api/expenses/:id',auth,async(req,res)=>{const r=await pool.query('DELETE FROM expenses WHERE id=$1 AND user_id=$2',[req.params.id,(req as any).user.id]);if(!r.rowCount)return fail(res,404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan');res.status(204).end();});
app.get('/api/expenses/summary',auth,async(req,res)=>{const m=req.query.month;if(!isMonth(m))return fail(res,400,'VALIDATION_ERROR','Data tidak valid',{month:'Bulan tidak valid'});const [from,to]=monthRange(m);const r=await pool.query("SELECT coalesce(sum(amount),0)::text \"totalAmount\",count(*)::int FROM expenses WHERE user_id=$1 AND expense_date >= $2 AND expense_date < $3",[(req as any).user.id,from,to]);res.json({month:m,totalAmount:r.rows[0].totalAmount,count:r.rows[0].count});});
app.get('/api/expenses/export.csv',auth,async(req,res)=>{const {w,p}=filter(req.query);p.push((req as any).user.id);const rows=await pool.query(`SELECT e.expense_date,c.name,e.description,e.amount::text FROM expenses e JOIN categories c ON c.id=e.category_id WHERE e.user_id=$${p.length}${w?' AND '+w:''} ORDER BY e.expense_date`,p);res.type('text/csv').attachment(`pengeluaran-${new Date().toISOString().slice(0,10)}.csv`).send(['tanggal,kategori,deskripsi,nominal',...rows.rows.map(x=>[x.expense_date,x.name,x.description,x.amount].map(csv).join(','))].join('\n'));});
app.use((_e:any,_req:any,res:any)=>fail(res,500,'INTERNAL_ERROR','Terjadi kesalahan internal')); export default app;
