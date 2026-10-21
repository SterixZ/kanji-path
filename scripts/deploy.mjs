import {spawn} from 'node:child_process';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target={projectId:'prj_1VJJLLyFQpMlSLeFQOZOVWn0eZJM',orgId:'team_ogCodyuLKsPpD4Tit3Svn85Y',scope:'sterix-z',url:'https://kanji-path-study.vercel.app'};
const retiredHostname='kanji-path-sterix-z.vercel.app';
const npmCli=process.env.npm_execpath;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function run(args,{capture=false}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,VERCEL_TELEMETRY_DISABLED:'1'},stdio:['ignore',capture?'pipe':'inherit','inherit']});
    let output='';
    if(capture)child.stdout.setEncoding('utf8').on('data',chunk=>{output+=chunk});
    child.once('error',reject);
    child.once('close',(code,signal)=>{if(code===0)resolve(output);else reject(new Error(`Command failed (${signal||code}). Production update was not verified.`))});
  });
}

async function vercel(args,capture=false){
  return run([npmCli,'exec','--yes','--package=vercel@65.0.0','--','vercel',...args],{capture});
}

async function snapshot(directory,prefix=''){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const relative=prefix+entry.name;
    if(entry.isDirectory())files.push(...await snapshot(path.join(directory,entry.name),relative+'/'));
    else if(entry.isFile())files.push({path:relative,hash:sha(await readFile(path.join(directory,entry.name)))});
    else throw new Error(`Unsupported deployment entry: ${relative}`);
  }
  return files;
}

async function verifyFiles(files){
  for(let start=0;start<files.length;start+=4){
    await Promise.all(files.slice(start,start+4).map(async file=>{
      const url=new URL(file.path==='index.html'?'./':file.path,target.url+'/');
      for(let attempt=0;attempt<3;attempt++){
        try{
          const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          if(sha(new Uint8Array(await response.arrayBuffer()))!==file.hash)throw new Error('Published file does not match this update');
          return;
        }catch(error){
          if(attempt===2)throw new Error(`Live verification failed for ${file.path}: ${error.cause?.code||error.message}`);
          // Retry transient connection failures and brief alias propagation delays.
          await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
        }
      }
    }));
  }
}

async function retireOldAddress(){
  const status=async()=>{
    const response=await fetch(`https://${retiredHostname}/`,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(30000)});
    await response.body?.cancel();
    return response.status;
  };
  if([404,410].includes(await status()))return;
  // Vercel can automatically recreate the project/team alias on production
  // deployments. Remove it after publishing rather than only removing it once.
  await vercel(['alias','remove',retiredHostname,'--yes','--scope',target.scope,'--non-interactive']);
  if(![404,410].includes(await status()))throw new Error('The retired website address still responds. Its removal could not be verified.');
}

try{
  if(!npmCli)throw new Error('Run this command with npm run deploy.');
  let link;
  try{link=JSON.parse(await readFile(path.join(root,'.vercel/project.json'),'utf8'))}catch{throw new Error('The existing Vercel project link is missing. Restore the intended link before publishing.');}
  if(link.projectId!==target.projectId||link.orgId!==target.orgId)throw new Error('Vercel project/team mismatch. Nothing was deployed.');

  console.log('Checking the app before publishing…');
  await run([npmCli,'test']);
  await run(['--check','dist/app.js']);
  await run(['--check','dist/sw.js']);
  const files=await snapshot(path.join(root,'dist'));

  const account=JSON.parse(await vercel(['whoami','--format','json','--non-interactive'],true));
  if(account.loggedIn===false||account.linkedProject?.id!==target.projectId||account.linkedProject?.orgId!==target.orgId)throw new Error('Vercel account/project could not be verified. Sign in with vercel login and retry.');
  await vercel(['project','inspect','--scope',target.scope,'--non-interactive']);

  console.log(`Publishing to ${target.url}…`);
  const result=JSON.parse(await vercel(['deploy','--prod','--json','--yes','--scope',target.scope,'--project',target.projectId,'--non-interactive'],true));
  const deployment=result.deployment;
  if(result.status!=='ok'||deployment?.readyState!=='READY'||deployment.target!=='production'||!deployment.url)throw new Error('Vercel did not confirm a ready production deployment.');
  // Vercel may choose another default domain. Always move the existing public
  // address to this deployment so the URL learners already use stays current.
  await vercel(['alias','set',deployment.url,new URL(target.url).hostname,'--scope',target.scope,'--non-interactive']);
  await retireOldAddress();

  console.log('Checking that the public site serves this update…');
  await verifyFiles(files);
  const after=await snapshot(path.join(root,'dist'));
  if(JSON.stringify(files)!==JSON.stringify(after))throw new Error('App files changed during deployment. Run npm run deploy again to publish the latest edits.');
  console.log(`\nProduction update verified: ${target.url}\nDeployment: ${deployment.id}\nVerified ${files.length} published files.`);
}catch(error){
  console.error(`\nDeployment incomplete: ${error.message}`);
  process.exitCode=1;
}
