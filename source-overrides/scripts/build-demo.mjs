import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import tailwindcss from '@tailwindcss/postcss';
const postcss=createRequire(import.meta.resolve('@tailwindcss/postcss'))('postcss');
const esbuild=createRequire(import.meta.resolve('vinext'))('esbuild');
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'demo');
mkdirSync(out,{recursive:true});
const files=new Set(['index.html']);
function publishAsset(name,bytes){
writeFileSync(resolve(out,name),bytes);files.add(name);return './'+name;
}
function imageAsset(name){
const bytes=readFileSync(resolve(root,'public/images',name));
const dot=name.lastIndexOf('.');
const target='asset-'+name.slice(0,dot)+'-'+createHash('sha256').update(bytes).digest('hex').slice(0,10)+name.slice(dot);
return publishAsset(target,bytes);
}
const localAssets={name:'local-demo-assets',setup(build){
build.onLoad({filter:/(?:bar-landing|product-page)\.tsx$|services\.ts$/},({path})=>{
let source=readFileSync(path,'utf8').replace("import Image from 'next/image';",'').replaceAll('<Image unoptimized','<img');
source=source.replace(/'\/grigoryev-malygin-bar\/videos\/([^']+)'/g,(_,name)=>{
copyFileSync(resolve(root,'public/videos',name),resolve(out,name));files.add(name);return "'./"+name+"'";
});
source=source.replace(/(['"])\/grigoryev-malygin-bar\/images\/([^'"]+)\1/g,(_,quote,name)=>quote+imageAsset(name)+quote);
return {contents:source,loader:path.endsWith('.tsx')?'tsx':'ts',resolveDir:dirname(path)};
});}};
const options={absWorkingDir:root,bundle:true,jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[localAssets],logLevel:'warning'};
const client=await esbuild.build({...options,entryPoints:['demo-src/client.tsx'],platform:'browser',format:'iife',write:false});
await esbuild.build({...options,entryPoints:['demo-src/render.tsx'],platform:'node',format:'esm',outfile:resolve(out,'render.mjs'),packages:'external'});
const {render,pages,redirects}=await import(pathToFileURL(resolve(out,'render.mjs')).href);
const stylesheet=resolve(root,'app/globals.css');
const compiled=await postcss([tailwindcss()]).process(readFileSync(stylesheet,'utf8'),{from:stylesheet,map:false});
const css=compiled.css+'\n'+readFileSync(resolve(root,'demo-src/fonts.css'),'utf8')+'\n'+readFileSync(resolve(root,'demo-src/hero-font.css'),'utf8');
const stylesheetSrc=publishAsset('bar-style-'+createHash('sha256').update(css).digest('hex').slice(0,12)+'.css',css);
const icon=readFileSync(resolve(root,'public/favicon.svg')).toString('base64');
const js=client.outputFiles[0].text;
const scriptSrc=publishAsset('bar-app-'+createHash('sha256').update(js).digest('hex').slice(0,12)+'.js',js);
const escapeHtml=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const page of pages){
const directory=page.slug?resolve(out,page.slug):out;
mkdirSync(directory,{recursive:true});
const pageScript=page.slug?'../'+scriptSrc.slice(2):scriptSrc;
const pageStyle=page.slug?'../'+stylesheetSrc.slice(2):stylesheetSrc;
const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escapeHtml(page.title)+'</title><meta name="description" content="'+escapeHtml(page.description)+'"><link rel="icon" href="data:image/svg+xml;base64,'+icon+'"><link rel="stylesheet" href="'+pageStyle+'"></head><body style="--font-body:Onest;--font-logo:RAYDIS;--font-script:Cormorant Garamond"><div id="root" data-page="'+page.slug+'">'+render(page.slug)+'</div><script defer src="'+pageScript+'"></script></body></html>';
writeFileSync(resolve(directory,'index.html'),html);
files.add(page.slug?page.slug+'/index.html':'index.html');
}
for(const slug of redirects){
const directory=resolve(out,slug);
mkdirSync(directory,{recursive:true});
writeFileSync(resolve(directory,'index.html'),'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=../#formats"><title>Форматы — GM.EVENT</title></head><body><p><a href="../#formats">Перейти к форматам GM.EVENT</a></p></body></html>');
files.add(slug+'/index.html');
}
writeFileSync(resolve(out,'.nojekyll'),'');
writeFileSync(resolve(out,'asset-manifest.json'),JSON.stringify({files:[...files].sort()},null,2)+'\n');
console.log('Site built:',pages.length,'pages;',files.size,'deployment files');
