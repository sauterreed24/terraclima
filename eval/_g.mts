import { chromium } from "playwright-core";
const B="http://127.0.0.1:4173";
const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const ctx = await b.newContext({viewport:{width:1280,height:900}});
await ctx.route('**/*', r => r.request().url().startsWith(B) ? r.continue() : r.abort());
for (const id of [process.argv[2]!, "sequim-wa"]) {
const page = await ctx.newPage(); await page.goto(B+'/?p='+id); await page.getByRole('dialog').getByText(/Climate normals/i).first().waitFor();
const t = (await page.getByRole('dialog').innerText()).replace(/\n+/g,' | ');
for (const re of [/confidence/ig, /validat/ig, /station/ig, /grid/ig, /Daymet/ig]) { const ms=[...t.matchAll(re)].slice(0,3); for (const m of ms) console.log(id, re.source, '→', t.slice(Math.max(0,m.index!-80), m.index!+120)); }
console.log('---');
}
await b.close();
