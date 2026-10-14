const packageJson = JSON.stringify(
  {
    name: 'gotcha-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: { dev: 'vite --host 0.0.0.0', build: 'tsc --noEmit && vite build' },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      'lucide-react': '^0.460.0',
      '@radix-ui/react-slot': '^1.2.3',
      'class-variance-authority': '^0.7.1',
      clsx: '^2.1.1',
      'tailwind-merge': '^2.5.5',
    },
    devDependencies: {
      vite: '^8.0.0',
      typescript: '^5.9.3',
      '@vitejs/plugin-react': '^5.0.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      tailwindcss: '^4.0.0',
      '@tailwindcss/vite': '^4.0.0',
    },
  },
  null,
  2,
);
const styles = `@import 'tailwindcss';
:root{font-family:ui-sans-serif,system-ui;color:#243235;background:#f6f8f7;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button{cursor:pointer;border:0;border-radius:8px;padding:10px 16px;background:#174e43;color:white}input,select{padding:10px;border:1px solid #d5dfda;border-radius:8px;background:white;color:#243235}header{padding:24px 7%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dde5e1;background:white}main{padding:38px 7%;max-width:1400px;margin:auto}h1{font-size:36px;letter-spacing:-1.5px;font-weight:600}h2{font-weight:500}p{color:#697a74;line-height:1.6}.eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#407c6b}.card{background:white;border:1px solid #dde5e1;border-radius:14px;padding:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.stack{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.muted{color:#72847c;font-size:13px}.list{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5ece7;padding:16px 0}button.danger{background:#f5e4e4;color:#964242}section{margin-top:28px}label{display:flex;gap:8px;align-items:center}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:15px;border-bottom:1px solid #e5ece7}th{color:#7a8c81;font-size:11px;text-transform:uppercase;letter-spacing:1px}.pill{background:#e4eee8;color:#397b5d;padding:6px 10px;border-radius:20px;font-size:11px}@media(max-width:650px){.grid{grid-template-columns:1fr}h1{font-size:28px}.card{padding:16px}main{padding:22px 5%}table{display:block;overflow:auto}}`;
const crm = `import {useState} from 'react';
type Customer={id:string;name:string;email:string;stage:string};
export default function App(){const [customers,setCustomers]=useState<Customer[]>([]);const [search,setSearch]=useState('');const [name,setName]=useState('');const [email,setEmail]=useState('');return <><header><strong>orbit / CRM</strong><span className="pill">Frontend template · session data</span></header><main><div className="eyebrow">YOUR CUSTOMER WORKSPACE</div><h1>Good relationships start here.</h1><p>A little organization. A lot more possibility.</p><div className="grid">{[['Customers',customers.length],['Active leads',customers.filter(c=>c.stage==='Lead').length],['Customers won',customers.filter(c=>c.stage==='Won').length]].map(([label,value])=><div className="card" key={label}><span className="muted">{label}</span><h1>{value}</h1></div>)}</div><section className="card"><h2>Add a customer</h2><form className="stack" onSubmit={e=>{e.preventDefault();setCustomers([...customers,{id:crypto.randomUUID(),name,email,stage:'Lead'}]);setName('');setEmail('')}}><input aria-label="Customer name" required placeholder="Customer name" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Customer email" type="email" required placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><button>Add customer</button></form></section><section className="card"><div className="stack" style={{justifyContent:'space-between'}}><h2>Customer relationships</h2><input aria-label="Search customers" value={search} placeholder="Search customers…" onChange={e=>setSearch(e.target.value)}/></div><table><thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Actions</th></tr></thead><tbody>{customers.filter(c=>(c.name+c.email).toLowerCase().includes(search.toLowerCase())).map(c=><tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td><select aria-label={'Stage for '+c.name} value={c.stage} onChange={e=>setCustomers(customers.map(x=>x.id===c.id?{...x,stage:e.target.value}:x))}>{['Lead','Qualified','Won'].map(s=><option key={s}>{s}</option>)}</select></td><td><button className="danger" onClick={()=>setCustomers(customers.filter(x=>x.id!==c.id))}>Delete</button></td></tr>)}</tbody></table>{!customers.length&&<p>Your first customer is the start of something great. Add one above.</p>}</section><p className="muted">This starter keeps records in browser memory. Database persistence and application login require a backend integration.</p></main></>}`;
const tasks = `import {useState} from 'react';type Task={id:string;title:string;done:boolean};export default function App(){const [tasks,setTasks]=useState<Task[]>([]);const [title,setTitle]=useState('');return <><header><strong>focus / workspace</strong><span className="pill">Task manager</span></header><main><div className="eyebrow">A LITTLE SPACE TO THINK</div><h1>Make room for your best work.</h1><p>One task at a time. You have got this.</p><section className="card"><form className="stack" onSubmit={e=>{e.preventDefault();setTasks([...tasks,{id:crypto.randomUUID(),title,done:false}]);setTitle('')}}><input aria-label="New task" required value={title} placeholder="What would you like to do?" onChange={e=>setTitle(e.target.value)}/><button>Add task</button></form><h2>{tasks.filter(t=>!t.done).length} things to do</h2>{tasks.map(t=><div className="list" key={t.id}><label><input type="checkbox" checked={t.done} onChange={()=>setTasks(tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><span style={{textDecoration:t.done?'line-through':'none'}}>{t.title}</span></label><button className="danger" onClick={()=>setTasks(tasks.filter(x=>x.id!==t.id))}>Delete</button></div>)}{!tasks.length&&<p>A fresh start. Add your first task above.</p>}</section><p className="muted">Frontend starter. Tasks are held for this session.</p></main></>}`;
const portfolio = `export default function App(){return <><header><strong>your name / studio</strong><a href="#contact">Let's talk ↗</a></header><main><div className="eyebrow">INDEPENDENT DESIGNER & BUILDER</div><h1 style={{fontSize:'clamp(48px,7vw,86px)',maxWidth:800,marginBottom:20}}>Thoughtful design.<br/>Meaningful experiences.</h1><p>I turn complex ideas into simple, beautiful digital products. Add your story here.</p><section className="grid">{['Selected project 01','Selected project 02','Selected project 03'].map((x,i)=><article className="card" key={x}><div style={{height:180,borderRadius:8,background:['#d9e8d9','#e7d9ef','#f0e4d1'][i],display:'grid',placeItems:'center',fontSize:48}}>↗</div><h2>{x}</h2><p>Your project description, role, and results.</p></article>)}</section><section id="contact" className="card"><h2>Let's make something worthwhile.</h2><p>Replace this with your email.</p><a href="mailto:hello@example.com">hello@example.com ↗</a></section></main></>}`;
const landing = `import {useState} from 'react';export default function App(){const [email,setEmail]=useState('');const [saved,setSaved]=useState(false);return <><header><strong>your brand / the next chapter</strong><a href="#waitlist">Join the waitlist ↗</a></header><main style={{textAlign:'center'}}><div className="eyebrow">BIG IDEAS BEGIN SMALL</div><h1 style={{fontSize:'clamp(48px,7vw,88px)',lineHeight:1.05}}>A better way<br/>to do your thing.</h1><p>Explain your product in one clear sentence. Make it specific to the people you are building for.</p><section className="grid">{['Simple by design','Made for your workflow','Room to grow'].map(x=><article className="card" key={x}><h2>{x}</h2><p>Replace this with a real benefit and the detail that makes it credible.</p></article>)}</section><section id="waitlist" className="card"><h2>Be part of what comes next.</h2><form className="stack" style={{justifyContent:'center'}} onSubmit={e=>{e.preventDefault();setSaved(true)}}><input aria-label="Email" required type="email" value={email} placeholder="Your email address" onChange={e=>setEmail(e.target.value)}/><button>Try the form</button></form>{saved&&<p role="status">Form validated. Connect an email integration to collect signups.</p>}</section></main></>}`;
const templates = [
  {
    id: 'blank',
    name: 'Blank app',
    category: 'Getting started',
    description: 'A clean starting point for your own app.',
    color: 'mint',
    app: `export default function App(){return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',textAlign:'center',fontFamily:'Arial,sans-serif',background:'#fafafa',color:'#171717'}}><section><div style={{fontSize:36,marginBottom:20}}>◌</div><h1 style={{fontSize:30}}>Your canvas is ready.</h1><p style={{color:'#737373'}}>Describe your app in the conversation to start building.</p><small>Empty starter · no AI generation has run yet</small></section></main>}`,
  },
  {
    id: 'fullstack',
    name: 'App with login & database',
    category: 'Full stack',
    description: 'Express, PostgreSQL, secure sessions, and persistent user records.',
    color: 'mint',
    app: require('./fullstack').app,
  },
  {
    id: 'crm',
    name: 'Orbit CRM',
    category: 'Business',
    description: 'Customer tables, lead stages, search, and session CRUD.',
    color: 'mint',
    app: crm,
  },
  {
    id: 'tasks',
    name: 'Focus workspace',
    category: 'Productivity',
    description: 'A working task list with completion and delete.',
    color: 'lavender',
    app: tasks,
  },
  {
    id: 'portfolio',
    name: 'Personal portfolio',
    category: 'Creative',
    description: 'An editorial portfolio ready for your own work.',
    color: 'peach',
    app: portfolio,
  },
  {
    id: 'landing',
    name: 'Launch landing page',
    category: 'Marketing',
    description: 'A product page with a validated signup form.',
    color: 'blue',
    app: landing,
  },
];
function templateFiles(id = 'landing') {
  const template = templates.find((t) => t.id === id) || templates[3];
  const files = [
    { path: 'package.json', content: packageJson, protected: true },
    {
      path: 'index.html',
      content:
        '<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>My application</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      protected: true,
    },
    {
      path: 'vite.config.ts',
      content:
        "import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import tailwind from '@tailwindcss/vite';export default defineConfig({cacheDir:'/tmp/nebula-vite-cache',plugins:[react(),tailwind()],build:{rollupOptions:{output:{inlineDynamicImports:true}}}});",
      protected: true,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            allowImportingTsExtensions: true,
          },
          include: ['src'],
        },
        null,
        2,
      ),
      protected: true,
    },
    {
      path: 'src/main.tsx',
      content:
        "import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './index.css';createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);",
      protected: true,
    },
    { path: 'src/App.tsx', content: template.app, protected: false },
    { path: 'src/index.css', content: styles, protected: false },
    {
      path: 'src/components/ui/button.tsx',
      content:
        "import * as React from 'react';import {Slot} from '@radix-ui/react-slot';import {cva,type VariantProps} from 'class-variance-authority';import {clsx} from 'clsx';import {twMerge} from 'tailwind-merge';const variants=cva('inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',{variants:{variant:{default:'bg-emerald-900 text-white',outline:'border border-slate-300 bg-transparent'}},defaultVariants:{variant:'default'}});export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof variants>{asChild?:boolean}export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,asChild=false,...props},ref)=>{const Comp=asChild?Slot:'button';return <Comp ref={ref} className={twMerge(clsx(variants({variant}),className))} {...props}/>});Button.displayName='Button';",
      protected: false,
    },
  ];
  if (id === 'fullstack') {
    files.push(...require('./fullstack').extraFiles());
    const pkg = JSON.parse(files[0].content);
    Object.assign(pkg.dependencies, { express: '5.3.0', pg: '8.23.1' });
    pkg.scripts.server = 'node server/index.js';
    pkg.scripts.test = 'node tests/runtime.test.js';
    files[0].content = JSON.stringify(pkg, null, 2);
    files.find((f) => f.path === 'vite.config.ts').content =
      "import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import tailwind from '@tailwindcss/vite';export default defineConfig({cacheDir:'/tmp/nebula-vite-cache',plugins:[react(),tailwind()],server:{proxy:{'/api':'http://127.0.0.1:7014'}},build:{rollupOptions:{output:{inlineDynamicImports:true}}}});";
  }
  return files;
}
module.exports = { templates: templates.map(({ app, ...t }) => t), templateFiles };
